/*
  # Create Casino Game System Tables

  1. New Tables
    - `game_config`
      - `id` (uuid, primary key)
      - `game_type` (text, unique) - 'slots', 'crash', 'roulette'
      - `rtp_percentage` (numeric) - Return to Player percentage (e.g., 96.50)
      - `house_edge` (numeric) - House edge percentage (e.g., 3.50)
      - `rng_mode` (text) - 'provably_fair' or 'controlled'
      - `paytable` (jsonb) - Game-specific paytable configuration
      - `is_active` (boolean) - Whether game is currently active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `game_seeds`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `server_seed` (text, not null) - Hashed server seed shown to user
      - `server_seed_plain` (text, not null) - Actual server seed (hidden until revealed)
      - `client_seed` (text, not null) - User-provided or generated client seed
      - `nonce` (integer, default 0) - Counter for each bet
      - `is_active` (boolean, default true) - Whether this seed pair is currently active
      - `revealed_at` (timestamptz) - When server seed was revealed
      - `created_at` (timestamptz)

    - `game_bets`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - References auth.users
      - `game_type` (text, not null) - 'slots', 'crash', 'roulette'
      - `seed_id` (uuid) - References game_seeds
      - `nonce` (integer, not null) - Nonce used for this bet
      - `bet_amount` (numeric, not null)
      - `payout_amount` (numeric, not null)
      - `multiplier` (numeric)
      - `game_data` (jsonb) - Game-specific data (e.g., slot symbols, crash point, roulette number)
      - `server_seed_hash` (text) - Hash for verification
      - `client_seed` (text) - Client seed used
      - `is_win` (boolean)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Users can read their own seeds and bets
    - Users can insert their own client seeds
    - Only authenticated users can create bets
    - Game config is readable by all authenticated users
    - Only admins can modify game config (will be enforced via service role)

  3. Important Notes
    - Server seeds are hashed with SHA256 before showing to users
    - Nonce increments for each bet to ensure unique outcomes
    - Game config stores RTP and paytables for admin control
    - RNG mode can be switched between provably fair and controlled
*/

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

ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read game config"
  ON game_config
  FOR SELECT
  TO authenticated
  USING (true);

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

CREATE INDEX IF NOT EXISTS idx_game_seeds_user_id ON game_seeds(user_id);
CREATE INDEX IF NOT EXISTS idx_game_seeds_active ON game_seeds(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_game_bets_user_id ON game_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_game_bets_game_type ON game_bets(game_type);
CREATE INDEX IF NOT EXISTS idx_game_bets_created_at ON game_bets(created_at DESC);

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
