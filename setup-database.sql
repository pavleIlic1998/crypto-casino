-- ============================================================
-- CRYPTO CASINO DATABASE SETUP
-- Run this script when Supabase region is available
-- ============================================================

-- ============================================================
-- 1. USER PROFILES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  email text UNIQUE NOT NULL,
  date_of_birth date NOT NULL,
  language text NOT NULL DEFAULT 'en',
  balance numeric(20,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- ============================================================
-- 2. GAME SYSTEM TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS game_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_type text UNIQUE NOT NULL,
  rtp_percentage numeric(5,2) NOT NULL DEFAULT 96.00,
  house_edge numeric(5,2) NOT NULL DEFAULT 4.00,
  rng_mode text NOT NULL DEFAULT 'provably_fair' CHECK (rng_mode IN ('provably_fair', 'controlled')),
  paytable jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_seeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  server_seed text NOT NULL,
  server_seed_plain text NOT NULL,
  client_seed text NOT NULL,
  nonce integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  revealed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_bets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_type text NOT NULL,
  seed_id uuid REFERENCES game_seeds(id),
  nonce integer NOT NULL,
  bet_amount numeric(20,2) NOT NULL CHECK (bet_amount > 0),
  payout_amount numeric(20,2) NOT NULL DEFAULT 0,
  multiplier numeric(10,2),
  game_data jsonb NOT NULL DEFAULT '{}',
  server_seed_hash text NOT NULL,
  client_seed text NOT NULL,
  is_win boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_bets ENABLE ROW LEVEL SECURITY;

-- Game Config Policies
CREATE POLICY "Anyone can read game config"
  ON game_config
  FOR SELECT
  TO authenticated
  USING (true);

-- Game Seeds Policies
CREATE POLICY "Users can read own seeds"
  ON game_seeds
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own seeds"
  ON game_seeds
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own seeds"
  ON game_seeds
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Game Bets Policies
CREATE POLICY "Users can read own bets"
  ON game_bets
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bets"
  ON game_bets
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_game_seeds_user_id ON game_seeds(user_id);
CREATE INDEX IF NOT EXISTS idx_game_seeds_active ON game_seeds(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_game_bets_user_id ON game_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_game_bets_game_type ON game_bets(game_type);
CREATE INDEX IF NOT EXISTS idx_game_bets_created_at ON game_bets(created_at DESC);

-- ============================================================
-- 3. INITIAL GAME CONFIGURATION DATA
-- ============================================================

INSERT INTO game_config (game_type, rtp_percentage, house_edge, rng_mode, paytable) VALUES
  ('slots', 96.00, 4.00, 'provably_fair', '{
    "reels": 5,
    "rows": 3,
    "symbols": ["cherry", "lemon", "orange", "plum", "grape", "watermelon", "seven", "diamond"],
    "paylines": [
      [1,1,1,1,1],
      [0,0,0,0,0],
      [2,2,2,2,2],
      [0,1,2,1,0],
      [2,1,0,1,2]
    ],
    "payouts": {
      "cherry": [0, 0, 5, 10, 20],
      "lemon": [0, 0, 5, 10, 20],
      "orange": [0, 0, 10, 20, 40],
      "plum": [0, 0, 10, 20, 40],
      "grape": [0, 0, 15, 30, 60],
      "watermelon": [0, 0, 15, 30, 60],
      "seven": [0, 0, 50, 100, 200],
      "diamond": [0, 0, 100, 500, 1000]
    }
  }'),
  ('crash', 98.00, 2.00, 'provably_fair', '{
    "min_multiplier": 1.00,
    "max_multiplier": 100.00,
    "crash_distribution": "exponential"
  }'),
  ('roulette', 97.30, 2.70, 'provably_fair', '{
    "numbers": 37,
    "payouts": {
      "straight": 35,
      "split": 17,
      "street": 11,
      "corner": 8,
      "line": 5,
      "dozen": 2,
      "column": 2,
      "red_black": 1,
      "even_odd": 1,
      "high_low": 1
    }
  }')
ON CONFLICT (game_type) DO NOTHING;
