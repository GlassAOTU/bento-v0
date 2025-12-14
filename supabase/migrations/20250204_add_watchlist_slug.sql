-- Add slug column to watchlists table
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS slug TEXT;

-- Generate slugs for existing watchlists
-- Convert name to lowercase, replace non-alphanumeric with hyphens, trim hyphens
UPDATE public.watchlists
SET slug = lower(
    trim(both '-' from
        regexp_replace(
            regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'),
            '-+', '-', 'g'
        )
    )
)
WHERE slug IS NULL;

-- Create index for slug lookups
CREATE INDEX IF NOT EXISTS idx_watchlists_slug ON public.watchlists(slug);

-- Add unique constraint per user (user can't have duplicate slugs)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_watchlist_slug'
    ) THEN
        ALTER TABLE public.watchlists
        ADD CONSTRAINT unique_user_watchlist_slug UNIQUE (user_id, slug);
    END IF;
END $$;

-- Function to get watchlist by username and slug
CREATE OR REPLACE FUNCTION get_watchlist_by_slug(target_username TEXT, target_slug TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    name TEXT,
    description TEXT,
    slug TEXT,
    is_public BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.user_id,
        w.name,
        w.description,
        w.slug,
        w.is_public,
        w.created_at,
        w.updated_at
    FROM public.watchlists w
    INNER JOIN public.profiles p ON p.user_id = w.user_id
    WHERE p.username = target_username
    AND w.slug = target_slug
    AND (w.is_public = true OR w.user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
