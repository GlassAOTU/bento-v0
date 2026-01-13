-- Add slug column to anime_data for direct URL lookups
ALTER TABLE public.anime_data ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create unique index on slug for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS idx_anime_data_slug ON public.anime_data(slug);
