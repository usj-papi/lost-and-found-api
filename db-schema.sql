CREATE TABLE public.lost_objects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  location text,
  status text,
  name text,
  CONSTRAINT lost_objects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL UNIQUE,
  name text NOT NULL,
  email text,
  password text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  role text NOT NULL DEFAULT 'visitor'::text,
  refresh_token_hash text,
  refresh_token_expires_at timestamp with time zone,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE UNIQUE INDEX users_email_key ON public.users (lower(email));
CREATE UNIQUE INDEX users_refresh_token_hash_key ON public.users (refresh_token_hash);
