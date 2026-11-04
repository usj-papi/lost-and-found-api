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
  password text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  role text NOT NULL DEFAULT 'visitor'::text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);