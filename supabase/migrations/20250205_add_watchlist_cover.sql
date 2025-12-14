-- Add cover_image_url column for generated watchlist cover images
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_watchlists_cover_image ON public.watchlists(cover_image_url) WHERE cover_image_url IS NOT NULL;

-- Update get_public_watchlists to include slug and cover_image_url
DROP FUNCTION IF EXISTS get_public_watchlists(TEXT);
CREATE OR REPLACE FUNCTION get_public_watchlists(target_username TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    slug TEXT,
    cover_image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name,
        w.description,
        w.slug,
        w.cover_image_url,
        w.created_at,
        w.updated_at
    FROM public.watchlists w
    INNER JOIN public.profiles p ON p.user_id = w.user_id
    WHERE p.username = target_username
    AND w.is_public = true
    ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
