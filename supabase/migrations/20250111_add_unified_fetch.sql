-- Add unified_fetch column to track which records have been fetched with the new unified logic
-- Existing records default to false so they get refreshed on next access

ALTER TABLE public.anime_data
ADD COLUMN IF NOT EXISTS unified_fetch BOOLEAN DEFAULT false;

-- Update any null values to false
UPDATE public.anime_data SET unified_fetch = false WHERE unified_fetch IS NULL;
