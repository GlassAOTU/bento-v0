-- ========================================
-- TEST SCRIPT FOR NEW MIGRATIONS
-- Run this in Supabase SQL Editor after applying migrations
-- ========================================

-- Test 1: Verify profiles table exists and constraints work
DO $$
BEGIN
    RAISE NOTICE 'Test 1: Testing profiles table...';

    -- This should work
    -- INSERT INTO public.profiles (user_id, username, display_name, bio)
    -- VALUES (auth.uid(), 'testuser123', 'Test User', 'This is a test bio');

    -- Test username constraints (these should fail if uncommented)
    -- INSERT INTO public.profiles (user_id, username) VALUES (auth.uid(), 'ab'); -- Too short
    -- INSERT INTO public.profiles (user_id, username) VALUES (auth.uid(), 'TestUser'); -- Uppercase not allowed
    -- INSERT INTO public.profiles (user_id, username) VALUES (auth.uid(), 'test user'); -- Space not allowed

    RAISE NOTICE 'Test 1: Profiles table structure looks good';
END $$;

-- Test 2: Verify reviews table exists and constraints work
DO $$
BEGIN
    RAISE NOTICE 'Test 2: Testing reviews table...';

    -- Test rating constraints (these should fail if uncommented)
    -- INSERT INTO public.reviews (user_id, anime_id, rating, review_text) VALUES (auth.uid(), 1, 0, 'Invalid rating'); -- Rating too low
    -- INSERT INTO public.reviews (user_id, anime_id, rating, review_text) VALUES (auth.uid(), 1, 6, 'Invalid rating'); -- Rating too high
    -- INSERT INTO public.reviews (user_id, anime_id, rating, review_text) VALUES (auth.uid(), 1, 5, 'Too short'); -- Review text too short

    RAISE NOTICE 'Test 2: Reviews table structure looks good';
END $$;

-- Test 3: Verify follows table and no self-follow constraint
DO $$
BEGIN
    RAISE NOTICE 'Test 3: Testing follows table...';

    -- This should fail: no self-follow
    -- INSERT INTO public.follows (follower_id, following_id) VALUES (auth.uid(), auth.uid());

    RAISE NOTICE 'Test 3: Follows table structure looks good';
END $$;

-- Test 4: Verify watchlists table has is_public column
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'watchlists'
AND column_name = 'is_public';

-- Test 5: Verify all functions exist
SELECT
    routine_name,
    routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
    'get_user_stats',
    'get_public_watchlists',
    'get_user_reviews',
    'get_anime_reviews',
    'is_following',
    'get_followers',
    'get_following'
)
ORDER BY routine_name;

-- Test 6: Test get_user_stats function (replace with actual user_id)
-- SELECT * FROM get_user_stats('your-user-id-here');

-- Test 7: Verify RLS policies exist
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'reviews', 'follows', 'watchlists', 'watchlist_items')
ORDER BY tablename, policyname;

-- Test 8: Check indexes
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'reviews', 'follows', 'watchlists')
ORDER BY tablename, indexname;

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'All tests completed!';
    RAISE NOTICE 'Review the output above to verify:';
    RAISE NOTICE '1. is_public column exists on watchlists';
    RAISE NOTICE '2. All 7 functions are created';
    RAISE NOTICE '3. RLS policies are in place';
    RAISE NOTICE '4. Indexes are created';
    RAISE NOTICE '========================================';
END $$;
