-- ========================================
-- RESET PROFILE DATA FOR TESTING
-- Run this in Supabase SQL Editor to delete your profile and start fresh
-- ========================================

-- WARNING: This will delete ALL your profile-related data!
-- Make sure you want to do this before running.

-- Delete your follows (both following and followers)
DELETE FROM public.follows
WHERE follower_id = auth.uid() OR following_id = auth.uid();

-- Delete your reviews
DELETE FROM public.reviews
WHERE user_id = auth.uid();

-- Delete your profile
DELETE FROM public.profiles
WHERE user_id = auth.uid();

-- Note: Your watchlists and watchlist_items will NOT be deleted
-- If you want to reset those too, uncomment below:

-- DELETE FROM public.watchlist_items
-- WHERE watchlist_id IN (
--     SELECT id FROM public.watchlists WHERE user_id = auth.uid()
-- );

-- DELETE FROM public.watchlists
-- WHERE user_id = auth.uid();

-- Verify deletion
SELECT 'Profile deleted' as status, COUNT(*) as remaining_profiles
FROM public.profiles
WHERE user_id = auth.uid();
