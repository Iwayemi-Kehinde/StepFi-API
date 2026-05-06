CREATE TABLE public.sponsor_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    org_name TEXT NOT NULL,
    sponsor_type TEXT NOT NULL,
    website TEXT,
    description TEXT,
    total_deposited NUMERIC NOT NULL DEFAULT 0,
    available NUMERIC NOT NULL DEFAULT 0,
    locked NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sponsor_pools ENABLE ROW LEVEL SECURITY;
