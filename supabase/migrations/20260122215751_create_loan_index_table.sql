CREATE TABLE public.loan_index (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id TEXT UNIQUE NOT NULL,
    user_wallet TEXT NOT NULL,
    status TEXT NOT NULL,
    principal_amount NUMERIC NOT NULL,
    interest_amount NUMERIC NOT NULL,
    due_date TIMESTAMPTZ NOT NULL,
    event_id TEXT UNIQUE NOT NULL,
    last_synced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
