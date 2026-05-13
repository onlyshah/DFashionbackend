-- Migration: Convert posts.user_id from INTEGER to UUID
-- Purpose: Make user_id consistent with users.id (UUID)

BEGIN;

-- Drop any existing foreign key constraint on posts.user_id
ALTER TABLE posts DROP CONSTRAINT IF EXISTS fk_posts_user_id CASCADE;

-- Convert user_id column from INTEGER to UUID
ALTER TABLE posts ALTER COLUMN user_id SET DATA TYPE UUID USING user_id::UUID;

-- Add foreign key constraint
ALTER TABLE posts 
ADD CONSTRAINT fk_posts_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Similar for reels
ALTER TABLE reels DROP CONSTRAINT IF EXISTS fk_reels_user_id CASCADE;
ALTER TABLE reels ALTER COLUMN user_id SET DATA TYPE UUID USING user_id::UUID;
ALTER TABLE reels 
ADD CONSTRAINT fk_reels_user_id 
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

COMMIT;
