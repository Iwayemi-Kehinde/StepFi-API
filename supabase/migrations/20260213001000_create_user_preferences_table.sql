CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    notifications_enabled BOOLEAN NOT NULL DEFAULT true,
    language TEXT NOT NULL DEFAULT 'en',
    theme TEXT NOT NULL DEFAULT 'dark',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
