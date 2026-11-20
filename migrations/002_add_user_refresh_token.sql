-- Adds refresh token storage to users. Run once in the Supabase SQL editor,
-- after 001_add_user_name_email.sql.
-- Safe to re-run: every step is idempotent.
BEGIN;

-- 1. Only the SHA-256 hash of the refresh token is stored, never the token.
--    One active refresh token per user: a new login replaces it.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS refresh_token_hash text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamp with time zone;

-- 2. Refresh looks users up by hash. NULLs do not collide, so users without a
--    session are fine.
CREATE UNIQUE INDEX IF NOT EXISTS users_refresh_token_hash_key ON public.users (refresh_token_hash);

COMMIT;
