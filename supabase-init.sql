-- Portals Database Schema for Supabase
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zo_user_id TEXT UNIQUE NOT NULL,
  phone_number TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  membership TEXT,
  roles TEXT[] DEFAULT '{}',
  access_groups TEXT[] DEFAULT '{}',
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User player permissions
CREATE TABLE IF NOT EXISTS user_player_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  player_id TEXT NOT NULL,
  player_name TEXT NOT NULL,
  access_level TEXT NOT NULL, -- 'view' | 'manage' | 'admin'
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_user_player_permissions_user_id ON user_player_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_player_permissions_player_id ON user_player_permissions(player_id);

-- User role overrides
CREATE TABLE IF NOT EXISTS user_role_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  override_role TEXT NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_role_overrides_user_id ON user_role_overrides(user_id);

-- Uploaded content
CREATE TABLE IF NOT EXISTS uploaded_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  duration INTEGER, -- For videos, in seconds
  resolution JSONB, -- {width: 1920, height: 1080}
  storage_url TEXT NOT NULL, -- S3 URL
  thumbnail_url TEXT,
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id),
  uploaded_by_phone TEXT NOT NULL,
  metadata JSONB, -- {title, description, tags[]}
  pisignage_filename TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_content_user_id ON uploaded_content(uploaded_by_user_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_content_pisignage_filename ON uploaded_content(pisignage_filename);

-- Schedule history
CREATE TABLE IF NOT EXISTS schedule_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID REFERENCES uploaded_content(id),
  player_ids TEXT[] NOT NULL,
  playlist_name TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  deployed_by_user_id UUID NOT NULL REFERENCES users(id),
  deployed_by_phone TEXT NOT NULL,
  status TEXT NOT NULL, -- 'scheduled' | 'active' | 'completed' | 'cancelled'
  deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedule_history_user_id ON schedule_history(deployed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_history_status ON schedule_history(status);
CREATE INDEX IF NOT EXISTS idx_schedule_history_times ON schedule_history(start_time, end_time);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  phone_number TEXT NOT NULL,
  action TEXT NOT NULL, -- 'upload' | 'schedule' | 'delete' | 'deploy' | 'control'
  resource_type TEXT NOT NULL, -- 'content' | 'player' | 'playlist' | 'schedule'
  resource_id TEXT,
  metadata JSONB, -- Additional context
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Player cache
CREATE TABLE IF NOT EXISTS player_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pisignage_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  orientation TEXT,
  current_playlist TEXT,
  status TEXT NOT NULL, -- 'online' | 'offline' | 'idle'
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL,
  metadata JSONB, -- Full player object from PiSignage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_player_cache_pisignage_id ON player_cache(pisignage_id);
CREATE INDEX IF NOT EXISTS idx_player_cache_status ON player_cache(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_player_permissions_updated_at BEFORE UPDATE ON user_player_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_role_overrides_updated_at BEFORE UPDATE ON user_role_overrides FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uploaded_content_updated_at BEFORE UPDATE ON uploaded_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schedule_history_updated_at BEFORE UPDATE ON schedule_history FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_player_cache_updated_at BEFORE UPDATE ON player_cache FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

