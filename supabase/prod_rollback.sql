-- =====================================================
-- ROLLBACK SCRIPT: Profiles & Watchlists Feature
-- Run ONLY if you need to undo the migration
-- WARNING: This will DELETE all profiles, follows, and reviews data!
-- =====================================================

-- Drop new tables (cascades to related data)
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Remove new columns from watchlists
ALTER TABLE public.watchlists DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.watchlists DROP COLUMN IF EXISTS slug;
ALTER TABLE public.watchlists DROP COLUMN IF EXISTS cover_image_url;
ALTER TABLE public.watchlists DROP CONSTRAINT IF EXISTS unique_user_watchlist_slug;

-- Drop indexes
DROP INDEX IF EXISTS idx_watchlists_is_public;
DROP INDEX IF EXISTS idx_watchlists_slug;
DROP INDEX IF EXISTS idx_watchlists_cover_image;

-- Drop functions
DROP FUNCTION IF EXISTS get_user_stats(UUID);
DROP FUNCTION IF EXISTS get_public_watchlists(TEXT);
DROP FUNCTION IF EXISTS get_user_reviews(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_anime_reviews(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS is_following(UUID, UUID);
DROP FUNCTION IF EXISTS get_followers(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_following(TEXT, INTEGER);
DROP FUNCTION IF EXISTS get_watchlist_by_slug(TEXT, TEXT);

-- Restore original watchlists RLS policies
DROP POLICY IF EXISTS "Anyone can view public watchlists or own watchlists" ON public.watchlists;
CREATE POLICY "Users can view their own watchlists" ON public.watchlists FOR SELECT USING (auth.uid() = user_id);

-- Restore original watchlist_items RLS policies
DROP POLICY IF EXISTS "Anyone can view items from public watchlists or own watchlists" ON public.watchlist_items;
CREATE POLICY "Users can view items from their watchlists" ON public.watchlist_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()));

-- Done!
SELECT 'Rollback complete!' as status;
