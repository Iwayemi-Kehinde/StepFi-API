-- Enable RLS for all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investments_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_index ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Typical policy: users can access their own data based on wallet_address or user_id
-- (Service role will bypass this by default)
