CREATE TABLE public.payment_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id TEXT NOT NULL,
    tx_hash TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    paid_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tx_hash, loan_id)
);
