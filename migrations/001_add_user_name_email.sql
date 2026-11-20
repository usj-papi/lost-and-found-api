-- Adds name and email to users. Run once in the Supabase SQL editor.
-- Safe to re-run: every step is idempotent.
BEGIN;

-- 1. New columns, nullable so existing rows are accepted.
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email text;

-- 2. Backfill: existing users get their username as name. There is no source
--    for their email, so it stays NULL until they provide one.
UPDATE public.users SET name = username WHERE name IS NULL;

-- 3. name is now mandatory for every user.
ALTER TABLE public.users ALTER COLUMN name SET NOT NULL;

-- 4. Normalise any email already present and enforce case-insensitive
--    uniqueness. NULLs do not collide, so legacy users without email are fine.
--    The API relies on the index name users_email_key to report a 409.
UPDATE public.users SET email = lower(trim(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON public.users (lower(email));

COMMIT;

-- Optional, later: once every user has an email, make it mandatory.
-- SELECT count(*) FROM public.users WHERE email IS NULL;  -- must return 0
-- ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
