ALTER TABLE public.payment_index ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
