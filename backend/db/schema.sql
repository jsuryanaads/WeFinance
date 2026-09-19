CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE transaction_type AS ENUM ('income', 'expense', 'transfer');
CREATE TYPE debt_type AS ENUM ('debt', 'receivable');
CREATE TYPE debt_status AS ENUM ('active', 'settled');
CREATE TYPE bill_frequency AS ENUM ('monthly', 'weekly', 'yearly');
CREATE TYPE goal_status AS ENUM ('active', 'paused', 'completed');

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  wallet_type TEXT NOT NULL DEFAULT 'cash',
  opening_balance NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (opening_balance >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'system')),
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_user_name_unique
  ON categories (COALESCE(user_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name), type);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  type transaction_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  note TEXT,
  debt_id UUID,
  bill_id UUID,
  goal_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS transactions_user_date_idx ON transactions(user_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS transactions_wallet_idx ON transactions(wallet_id);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions(category_id);
CREATE INDEX IF NOT EXISTS profiles_email_lower_idx ON profiles(lower(email));

CREATE TABLE IF NOT EXISTS transaction_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE CASCADE,
  from_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  to_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  CHECK (from_wallet_id <> to_wallet_id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  month_key CHAR(7) NOT NULL CHECK (month_key ~ '^[0-9]{4}-[0-9]{2}$'),
  amount NUMERIC(18,2) NOT NULL CHECK (amount >= 0),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category_id, month_key)
);

CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  party TEXT NOT NULL,
  type debt_type NOT NULL,
  principal NUMERIC(18,2) NOT NULL CHECK (principal > 0),
  paid NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (paid >= 0 AND paid <= principal),
  due_date DATE,
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  status debt_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  due_date DATE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE RESTRICT,
  wallet_id UUID REFERENCES wallets(id) ON DELETE RESTRICT,
  recurring BOOLEAN NOT NULL DEFAULT FALSE,
  frequency bill_frequency,
  note TEXT,
  last_paid_date DATE,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK ((recurring = FALSE AND frequency IS NULL) OR (recurring = TRUE AND frequency IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS bill_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(18,2) NOT NULL CHECK (target_amount > 0),
  target_date DATE,
  wallet_id UUID REFERENCES wallets(id) ON DELETE RESTRICT,
  status goal_status NOT NULL DEFAULT 'active',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goal_contributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL UNIQUE REFERENCES transactions(id) ON DELETE RESTRICT,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  contribution_date DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS debts_user_idx ON debts(user_id, due_date);
CREATE INDEX IF NOT EXISTS bills_user_idx ON bills(user_id, due_date);
CREATE INDEX IF NOT EXISTS goals_user_idx ON goals(user_id, target_date);
CREATE INDEX IF NOT EXISTS audit_logs_user_idx ON audit_logs(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['profiles','wallets','categories','transactions','budgets','debts','bills','goals']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I_updated_at ON %I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER %I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', table_name, table_name);
  END LOOP;
END $$;


-- Ownership constraints added for finance-data integrity.
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_debt_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_debt_id_fkey FOREIGN KEY (debt_id) REFERENCES debts(id) ON DELETE RESTRICT;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_bill_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE RESTRICT;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_goal_id_fkey;
ALTER TABLE transactions ADD CONSTRAINT transactions_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE RESTRICT;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
