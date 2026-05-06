CREATE TABLE public.liquidity_positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_wallet TEXT NOT NULL,
    deposited_amount NUMERIC NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.liquidity_positions ENABLE ROW LEVEL SECURITY;
