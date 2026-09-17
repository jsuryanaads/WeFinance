-- WeFinance: initial RLS policies
-- Applied to the existing WeFinance Supabase project.
--
-- Identity model: policies use Supabase Auth (auth.uid()).
-- The current backend uses a server-side PostgreSQL connection, so these
-- policies are primarily protection for authenticated Data API access.
-- Complete Auth integration is a separate application step.

CREATE POLICY users_select_own
  ON public.users FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

CREATE POLICY users_update_own
  ON public.users FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

CREATE POLICY wallets_select_own
  ON public.wallets FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY wallets_insert_own
  ON public.wallets FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY wallets_update_own
  ON public.wallets FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY wallets_delete_own
  ON public.wallets FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY categories_select_own
  ON public.categories FOR SELECT TO authenticated
  USING (user_id IS NULL OR user_id = (SELECT auth.uid()));

CREATE POLICY categories_insert_own
  ON public.categories FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY categories_update_own
  ON public.categories FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY categories_delete_own
  ON public.categories FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY transactions_select_own
  ON public.transactions FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY transactions_insert_own
  ON public.transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY transactions_update_own
  ON public.transactions FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY transactions_delete_own
  ON public.transactions FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));
