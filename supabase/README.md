# WeFinance — Supabase

WeFinance uses the existing Supabase project as its PostgreSQL database.

## Project

- Project: `WeFinance`
- Region: `ap-southeast-2`
- Database: PostgreSQL 17

## Schema

The current database contains:

- `users`
- `wallets`
- `categories`
- `transactions`

Row Level Security (RLS) is enabled on all four tables. Policies use `auth.uid()` for authenticated Data API access.

## Backend connection

The Node.js backend continues to use the `pg` package and connects through `DATABASE_URL`.

Set `DATABASE_URL` to the PostgreSQL connection string supplied by Supabase. Do not commit credentials or `.env` files.

## Security note

The frontend currently has legacy localStorage state and the backend has a server-side database connection. Supabase Auth integration is the next application-layer step so the authenticated user identity can be propagated consistently to the API and database.

Until that integration is complete, do not expose the database connection string to the browser and do not treat the current RLS policies as a substitute for backend authorization.
