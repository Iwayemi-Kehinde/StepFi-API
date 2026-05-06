CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet TEXT NOT NULL,
    hash TEXT,
    transaction_hash TEXT,
    type TEXT,
    status TEXT NOT NULL,
    xdr TEXT NOT NULL,
    result JSONB,
    error TEXT,
    submitted_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
