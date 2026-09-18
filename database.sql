CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT DEFAULT '',
    password_hash TEXT NOT NULL,
    balance NUMERIC(12,2) DEFAULT 0,
    is_admin BOOLEAN DEFAULT FALSE,
    deleted BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL,
    last_login_at TIMESTAMPTZ,
    last_seen TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    type TEXT NOT NULL,
    source TEXT NOT NULL,
    reward NUMERIC(12,2) DEFAULT 0,
    duration INTEGER DEFAULT 30,
    command TEXT DEFAULT '',
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS video_claims (
    id TEXT PRIMARY KEY,
    video_id TEXT NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ NOT NULL,
    UNIQUE(video_id, user_id)
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    method TEXT DEFAULT 'Manual Bank Transfer',
    account TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    chat_id TEXT NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_video_claims_user
ON video_claims(user_id);

CREATE INDEX IF NOT EXISTS idx_video_claims_video
ON video_claims(video_id);

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_withdrawals_user
ON withdrawals(user_id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat
ON chat_messages(chat_id);