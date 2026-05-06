CREATE TABLE public.indexer_cursor (
    contract_id TEXT PRIMARY KEY,
    last_ledger BIGINT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.reputation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    user_wallet TEXT NOT NULL,
    old_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    change_amount INTEGER NOT NULL,
    reason TEXT,
    transaction_hash TEXT,
    ledger_sequence BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.indexer_cursor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reputation_history ENABLE ROW LEVEL SECURITY;
