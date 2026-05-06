CREATE TABLE public.learner_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT UNIQUE NOT NULL,
    school TEXT,
    program TEXT,
    program_type TEXT,
    income_type TEXT,
    monthly_income NUMERIC,
    country TEXT,
    city TEXT,
    device_owned BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.learner_profiles ENABLE ROW LEVEL SECURITY;
