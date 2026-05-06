CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id TEXT UNIQUE NOT NULL,
    user_wallet TEXT NOT NULL,
    merchant_id UUID REFERENCES public.merchants(id),
    amount NUMERIC NOT NULL,
    loan_amount NUMERIC NOT NULL,
    guarantee NUMERIC NOT NULL,
    interest_rate NUMERIC NOT NULL,
    total_repayment NUMERIC NOT NULL,
    remaining_balance NUMERIC NOT NULL,
    term INTEGER NOT NULL,
    status TEXT NOT NULL,
    next_payment_due TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    defaulted_at TIMESTAMPTZ
);
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
