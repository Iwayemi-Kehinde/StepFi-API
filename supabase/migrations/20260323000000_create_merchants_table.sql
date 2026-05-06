CREATE TABLE public.merchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT false,
    website TEXT,
    country TEXT,
    city TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
