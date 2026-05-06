CREATE TABLE public.vouches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_wallet TEXT NOT NULL,
    learner_wallet TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vouches ENABLE ROW LEVEL SECURITY;
