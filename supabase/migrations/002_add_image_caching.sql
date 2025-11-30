-- Migration: Add image caching support to watchlist_items
-- This enables storing TMDB images in Supabase Storage

-- Add columns to watchlist_items for image caching
ALTER TABLE public.watchlist_items
ADD COLUMN IF NOT EXISTS anilist_id INTEGER,
ADD COLUMN IF NOT EXISTS tmdb_id INTEGER,
ADD COLUMN IF NOT EXISTS image_source TEXT DEFAULT 'external',
ADD COLUMN IF NOT EXISTS original_image_url TEXT,
ADD COLUMN IF NOT EXISTS cached_image_url TEXT,
ADD COLUMN IF NOT EXISTS image_cached_at TIMESTAMP WITH TIME ZONE;

-- Index for efficient TMDB lookups
CREATE INDEX IF NOT EXISTS idx_watchlist_items_tmdb_id
ON public.watchlist_items(tmdb_id);

-- Index for finding items needing migration
CREATE INDEX IF NOT EXISTS idx_watchlist_items_image_source
ON public.watchlist_items(image_source);

-- Create central image cache table (for shared caching across users)
CREATE TABLE IF NOT EXISTS public.image_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    anilist_id INTEGER,
    poster_url TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    cached_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_image_cache_tmdb_id ON public.image_cache(tmdb_id);

-- RLS for image_cache
ALTER TABLE public.image_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view cached images (they're public)
CREATE POLICY "Anyone can view cached images"
ON public.image_cache FOR SELECT USING (true);

-- Only authenticated users can insert (when adding to watchlist)
CREATE POLICY "Authenticated users can cache images"
ON public.image_cache FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Comment explaining the image_source values
COMMENT ON COLUMN public.watchlist_items.image_source IS
'Values: external (original URL), tmdb (TMDB URL), cached (Supabase Storage), anilist_fallback';
