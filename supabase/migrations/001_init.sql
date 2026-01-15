-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create category enum type
CREATE TYPE wardrobe_category AS ENUM ('tops', 'bottoms', 'onepiece', 'accessories');

-- Create wardrobe_items table
CREATE TABLE IF NOT EXISTS wardrobe_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    category wardrobe_category NOT NULL,
    order_index INTEGER NOT NULL,
    image_path TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique order_index per user per category
    UNIQUE (user_id, category, order_index)
);

-- Create index for faster queries by user_id
CREATE INDEX idx_wardrobe_items_user_id ON wardrobe_items(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE wardrobe_items ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to read their own items
CREATE POLICY "Users can read own items"
    ON wardrobe_items
    FOR SELECT
    USING (true);  -- For anonymous users, we rely on user_id filter in queries

-- Policy: Allow anonymous users to insert their own items
CREATE POLICY "Users can insert own items"
    ON wardrobe_items
    FOR INSERT
    WITH CHECK (true);  -- For anonymous users, we rely on user_id in the insert

-- Policy: Allow anonymous users to delete their own items
CREATE POLICY "Users can delete own items"
    ON wardrobe_items
    FOR DELETE
    USING (true);  -- For anonymous users, we rely on user_id filter in queries

-- Storage bucket setup (run this in Supabase Dashboard > Storage or via CLI)
-- 1. Create a bucket named 'wardrobe' with public access
-- 2. Set the following policy for public read:
--    bucket_id = 'wardrobe' AND (storage.foldername(name))[1] = auth.uid()::text
