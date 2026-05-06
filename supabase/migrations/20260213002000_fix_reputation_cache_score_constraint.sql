ALTER TABLE public.reputation_cache ADD CONSTRAINT score_check CHECK (score >= 0);
