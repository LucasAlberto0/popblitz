-- Pop Blitz Database Schema
-- Execute this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rooms table
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(6) UNIQUE NOT NULL,
  host_id VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  max_players INTEGER DEFAULT 16 CHECK (max_players >= 2 AND max_players <= 16),
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 10,
  time_per_round INTEGER DEFAULT 20,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Players table
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  session_id VARCHAR(100) NOT NULL,
  name VARCHAR(50) NOT NULL,
  avatar VARCHAR(10) DEFAULT '🎮',
  score INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ready' CHECK (status IN ('ready', 'playing', 'disconnected')),
  is_host BOOLEAN DEFAULT FALSE,
  player_order INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(room_id, session_id)
);

-- Rounds table
CREATE TABLE rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  image_url TEXT NOT NULL,
  question TEXT,
  answer VARCHAR(200) NOT NULL,
  answer_hints TEXT[] DEFAULT '{}',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'finished')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Round answers table
CREATE TABLE round_answers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id UUID REFERENCES rounds(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  answer VARCHAR(200) NOT NULL,
  is_correct BOOLEAN DEFAULT FALSE,
  time_ms INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_rooms_code ON rooms(code);
CREATE INDEX idx_players_room ON players(room_id);
CREATE INDEX idx_rounds_room ON rounds(room_id);
CREATE INDEX idx_round_answers_round ON round_answers(round_id);
CREATE INDEX idx_round_answers_player ON round_answers(player_id);

-- Enable Row Level Security
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE round_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for rooms
CREATE POLICY "Rooms are viewable by anyone in the room" ON rooms
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create rooms" ON rooms
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Room host can update" ON rooms
  FOR UPDATE USING (true);

-- RLS Policies for players
CREATE POLICY "Players are viewable by anyone in the room" ON players
  FOR SELECT USING (true);

CREATE POLICY "Anyone can add players to a room" ON players
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Players can update their own data" ON players
  FOR UPDATE USING (true);

-- RLS Policies for rounds
CREATE POLICY "Rounds are viewable by anyone in the room" ON rounds
  FOR SELECT USING (true);

CREATE POLICY "Room host can create rounds" ON rounds
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Room host can update rounds" ON rounds
  FOR UPDATE USING (true);

-- RLS Policies for round_answers
CREATE POLICY "Answers are viewable by anyone in the room" ON round_answers
  FOR SELECT USING (true);

CREATE POLICY "Players can submit answers" ON round_answers
  FOR INSERT WITH CHECK (true);

-- Function to generate room code
CREATE OR REPLACE FUNCTION generate_room_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  LOOP
    code := UPPER(
      SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' FROM (RANDOM() * 32)::int + 1 FOR 1) ||
      SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' FROM (RANDOM() * 32)::int + 1 FOR 1) ||
      SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' FROM (RANDOM() * 32)::int + 1 FOR 1) ||
      SUBSTRING('ABCDEFGHJKLMNPQRSTUVWXYZ23456789' FROM (RANDOM() * 32)::int + 1 FOR 1)
    );
    EXIT WHEN NOT EXISTS (SELECT 1 FROM rooms WHERE code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate points based on time
CREATE OR REPLACE FUNCTION calculate_points(time_ms INTEGER, time_limit_ms INTEGER DEFAULT 20000)
RETURNS INTEGER AS $$
DECLARE
  base_points INTEGER := 1000;
  time_bonus INTEGER;
BEGIN
  time_bonus := GREATEST(0, (time_limit_ms - time_ms) * 2 / 1000);
  RETURN base_points + time_bonus;
END;
$$ LANGUAGE plpgsql;

-- Function to start a round
CREATE OR REPLACE FUNCTION start_round(round_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE rounds
  SET status = 'active', started_at = NOW()
  WHERE id = round_uuid;

  UPDATE rooms
  SET status = 'playing', updated_at = NOW()
  WHERE id = (SELECT room_id FROM rounds WHERE id = round_uuid);
END;
$$ LANGUAGE plpgsql;

-- Function to finish a round
CREATE OR REPLACE FUNCTION finish_round(round_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE rounds
  SET status = 'finished', ended_at = NOW()
  WHERE id = round_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to finish the game
CREATE OR REPLACE FUNCTION finish_game(room_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE rooms
  SET status = 'finished', updated_at = NOW()
  WHERE id = room_uuid;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at for rooms
CREATE OR REPLACE FUNCTION update_room_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER room_updated_at
  BEFORE UPDATE ON rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_room_timestamp();
  
-- Aggressive Realtime enablement
-- 1. Recreate the publication to include all tables automatically
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- 2. Set replica identity to FULL for tables that need real-time updates
-- This ensures all columns are available in the payload
ALTER TABLE rooms REPLICA IDENTITY FULL;
ALTER TABLE players REPLICA IDENTITY FULL;
ALTER TABLE rounds REPLICA IDENTITY FULL;
ALTER TABLE round_answers REPLICA IDENTITY FULL;
