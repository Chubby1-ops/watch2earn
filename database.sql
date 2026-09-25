/* =========================================================
   WATCHSAVE DATABASE
   PostgreSQL schema + safe upgrades
========================================================= */


/* =========================
   USERS
========================= */

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


/* =========================================================
   SAFE USER UPGRADES
   These do NOT delete existing users.
========================================================= */

ALTER TABLE users
ADD COLUMN IF NOT EXISTS username TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_code TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS referred_by TEXT;

ALTER TABLE users
ADD COLUMN IF NOT EXISTS referral_qualified BOOLEAN DEFAULT FALSE;


/* Make sure old NULL qualification values become FALSE */

UPDATE users
SET referral_qualified = FALSE
WHERE referral_qualified IS NULL;


/* =========================
   USERNAME UNIQUENESS
========================= */

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower
ON users (LOWER(username))
WHERE username IS NOT NULL
AND username <> '';


/* =========================
   REFERRAL CODE UNIQUENESS
========================= */

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_referral_code
ON users (referral_code)
WHERE referral_code IS NOT NULL
AND referral_code <> '';


/* =========================
   REFERRAL FOREIGN KEY
========================= */

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_users_referred_by'
    ) THEN

        ALTER TABLE users
        ADD CONSTRAINT fk_users_referred_by
        FOREIGN KEY (referred_by)
        REFERENCES users(id)
        ON DELETE SET NULL;

    END IF;

END $$;


/* =========================================================
   GENERATE REFERRAL CODES FOR EXISTING USERS
   Existing users keep their accounts.
========================================================= */

UPDATE users
SET referral_code =
    UPPER(
        SUBSTRING(
            MD5(
                id ||
                clock_timestamp()::text ||
                random()::text
            ),
            1,
            10
        )
    )
WHERE referral_code IS NULL
AND is_admin = FALSE;


/* =========================
   VIDEOS
========================= */

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


/* =========================
   VIDEO CLAIMS
========================= */

CREATE TABLE IF NOT EXISTS video_claims (

    id TEXT PRIMARY KEY,

    video_id TEXT NOT NULL
        REFERENCES videos(id)
        ON DELETE CASCADE,

    user_id TEXT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    claimed_at TIMESTAMPTZ NOT NULL,

    UNIQUE(video_id, user_id)

);


/* =========================
   SESSIONS
========================= */

CREATE TABLE IF NOT EXISTS sessions (

    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL,

    last_seen TIMESTAMPTZ NOT NULL

);


/* =========================
   WITHDRAWALS
========================= */

CREATE TABLE IF NOT EXISTS withdrawals (

    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    amount NUMERIC(12,2) NOT NULL,

    method TEXT DEFAULT 'Manual Bank Transfer',

    account TEXT NOT NULL,

    bank_name TEXT NOT NULL,

    account_name TEXT NOT NULL,

    status TEXT DEFAULT 'pending',

    created_at TIMESTAMPTZ NOT NULL,

    processed_at TIMESTAMPTZ

);


/* =========================
   CHATS
========================= */

CREATE TABLE IF NOT EXISTS chats (

    id TEXT PRIMARY KEY,

    user_id TEXT UNIQUE NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    created_at TIMESTAMPTZ NOT NULL,

    updated_at TIMESTAMPTZ NOT NULL

);


/* =========================
   CHAT MESSAGES
========================= */

CREATE TABLE IF NOT EXISTS chat_messages (

    id TEXT PRIMARY KEY,

    chat_id TEXT NOT NULL
        REFERENCES chats(id)
        ON DELETE CASCADE,

    sender TEXT NOT NULL,

    text TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL

);


/* =========================================================
   BALANCE ADJUSTMENT HISTORY
========================================================= */

CREATE TABLE IF NOT EXISTS balance_adjustments (

    id TEXT PRIMARY KEY,

    user_id TEXT NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,

    admin_id TEXT NOT NULL
        REFERENCES users(id),

    direction TEXT NOT NULL
        CHECK (direction IN ('add', 'remove')),

    amount NUMERIC(12,2) NOT NULL
        CHECK (amount > 0),

    reason TEXT DEFAULT 'Admin adjustment',

    created_at TIMESTAMPTZ NOT NULL

);


/* =========================
   BALANCE HISTORY INDEXES
========================= */

CREATE INDEX IF NOT EXISTS idx_balance_adjustments_user
ON balance_adjustments(user_id);

CREATE INDEX IF NOT EXISTS idx_balance_adjustments_created
ON balance_adjustments(created_at DESC);


/* =========================================================
   SITE SETTINGS
   Used for maintenance / hold mode.
========================================================= */

CREATE TABLE IF NOT EXISTS site_settings (

    key TEXT PRIMARY KEY,

    value TEXT NOT NULL,

    updated_at TIMESTAMPTZ NOT NULL

);


/* =========================
   DEFAULT MAINTENANCE STATE
========================= */

INSERT INTO site_settings (
    key,
    value,
    updated_at
)

VALUES (
    'maintenance_mode',
    'false',
    NOW()
)

ON CONFLICT (key)
DO NOTHING;


/* =========================================================
   INDEXES
========================================================= */

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


/* =========================================================
   DONE
========================================================= */