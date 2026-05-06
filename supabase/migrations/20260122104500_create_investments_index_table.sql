CREATE TABLE public.investments_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet TEXT NOT NULL REFERENCES public.users(wallet_address) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
