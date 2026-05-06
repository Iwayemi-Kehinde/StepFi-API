CREATE TABLE public.reputation_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    wallet_address TEXT UNIQUE NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    tier TEXT NOT NULL DEFAULT 'poor',
    last_synced_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
