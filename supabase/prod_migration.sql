-- =====================================================
-- PRODUCTION MIGRATION: Profiles & Watchlists Feature
-- Run in Supabase SQL Editor (Production)
-- =====================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT NOT NULL UNIQUE,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 20),
    CONSTRAINT username_format CHECK (username ~ '^[a-z0-9_-]+$'),
    CONSTRAINT bio_length CHECK (char_length(bio) <= 500)
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile" ON public.profiles FOR DELETE USING (auth.uid() = user_id);

-- 2. FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view follows" ON public.follows;
CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can follow others" ON public.follows;
CREATE POLICY "Authenticated users can follow others" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- 3. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    anime_id INTEGER NOT NULL REFERENCES public.anime_data(anime_id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    review_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT rating_range CHECK (rating >= 1 AND rating <= 5),
    CONSTRAINT review_text_length CHECK (char_length(review_text) >= 10 AND char_length(review_text) <= 2000),
    CONSTRAINT unique_user_anime_review UNIQUE (user_id, anime_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_anime_id ON public.reviews(anime_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews(created_at DESC);

DROP TRIGGER IF EXISTS update_reviews_updated_at ON public.reviews;
CREATE TRIGGER update_reviews_updated_at
    BEFORE UPDATE ON public.reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view reviews" ON public.reviews;
CREATE POLICY "Anyone can view reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create reviews" ON public.reviews;
CREATE POLICY "Authenticated users can create reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON public.reviews;
CREATE POLICY "Users can update their own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.reviews;
CREATE POLICY "Users can delete their own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- 4. WATCHLISTS: ADD is_public COLUMN
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_watchlists_is_public ON public.watchlists(is_public) WHERE is_public = true;

-- Update watchlists RLS
DROP POLICY IF EXISTS "Users can view their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Anyone can view public watchlists or own watchlists" ON public.watchlists;
CREATE POLICY "Anyone can view public watchlists or own watchlists" ON public.watchlists FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own watchlists" ON public.watchlists;
CREATE POLICY "Users can create their own watchlists" ON public.watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own watchlists" ON public.watchlists;
CREATE POLICY "Users can update their own watchlists" ON public.watchlists FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own watchlists" ON public.watchlists;
CREATE POLICY "Users can delete their own watchlists" ON public.watchlists FOR DELETE USING (auth.uid() = user_id);

-- Update watchlist_items RLS
DROP POLICY IF EXISTS "Users can view items from their watchlists" ON public.watchlist_items;
DROP POLICY IF EXISTS "Anyone can view items from public watchlists or own watchlists" ON public.watchlist_items;
CREATE POLICY "Anyone can view items from public watchlists or own watchlists" ON public.watchlist_items FOR SELECT
USING (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND (watchlists.is_public = true OR watchlists.user_id = auth.uid())));

DROP POLICY IF EXISTS "Users can add items to their watchlists" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can add items to their own watchlists" ON public.watchlist_items;
CREATE POLICY "Users can add items to their own watchlists" ON public.watchlist_items FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update items in their watchlists" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can update items in their own watchlists" ON public.watchlist_items;
CREATE POLICY "Users can update items in their own watchlists" ON public.watchlist_items FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete items from their watchlists" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can delete items from their own watchlists" ON public.watchlist_items;
CREATE POLICY "Users can delete items from their own watchlists" ON public.watchlist_items FOR DELETE
USING (EXISTS (SELECT 1 FROM public.watchlists WHERE watchlists.id = watchlist_items.watchlist_id AND watchlists.user_id = auth.uid()));

-- 5. WATCHLISTS: ADD slug COLUMN
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS slug TEXT;

UPDATE public.watchlists
SET slug = lower(trim(both '-' from regexp_replace(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g'), '-+', '-', 'g')))
WHERE slug IS NULL;

CREATE INDEX IF NOT EXISTS idx_watchlists_slug ON public.watchlists(slug);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_watchlist_slug') THEN
        ALTER TABLE public.watchlists ADD CONSTRAINT unique_user_watchlist_slug UNIQUE (user_id, slug);
    END IF;
END $$;

-- 6. WATCHLISTS: ADD cover_image_url COLUMN
ALTER TABLE public.watchlists ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
CREATE INDEX IF NOT EXISTS idx_watchlists_cover_image ON public.watchlists(cover_image_url) WHERE cover_image_url IS NOT NULL;

-- 7. CREATE ALL FUNCTIONS
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS TABLE (watchlist_count BIGINT, review_count BIGINT, following_count BIGINT, followers_count BIGINT) AS $$
BEGIN
    RETURN QUERY SELECT
        (SELECT COUNT(*) FROM public.watchlists WHERE user_id = target_user_id AND is_public = true),
        (SELECT COUNT(*) FROM public.reviews WHERE user_id = target_user_id),
        (SELECT COUNT(*) FROM public.follows WHERE follower_id = target_user_id),
        (SELECT COUNT(*) FROM public.follows WHERE following_id = target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP FUNCTION IF EXISTS get_public_watchlists(TEXT);
CREATE OR REPLACE FUNCTION get_public_watchlists(target_username TEXT)
RETURNS TABLE (id UUID, name TEXT, description TEXT, slug TEXT, cover_image_url TEXT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY SELECT w.id, w.name, w.description, w.slug, w.cover_image_url, w.created_at, w.updated_at
    FROM public.watchlists w
    INNER JOIN public.profiles p ON p.user_id = w.user_id
    WHERE p.username = target_username AND w.is_public = true
    ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_user_reviews(target_username TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (id UUID, anime_id INTEGER, anime_title TEXT, anime_image TEXT, rating INTEGER, review_text TEXT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY SELECT r.id, r.anime_id, (a.details->>'title')::TEXT, (a.details->>'coverImage')::TEXT, r.rating, r.review_text, r.created_at, r.updated_at
    FROM public.reviews r
    INNER JOIN public.profiles p ON p.user_id = r.user_id
    INNER JOIN public.anime_data a ON a.anime_id = r.anime_id
    WHERE p.username = target_username
    ORDER BY r.created_at DESC LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_anime_reviews(target_anime_id INTEGER, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (id UUID, username TEXT, display_name TEXT, avatar_url TEXT, rating INTEGER, review_text TEXT, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY SELECT r.id, p.username, p.display_name, p.avatar_url, r.rating, r.review_text, r.created_at, r.updated_at
    FROM public.reviews r
    INNER JOIN public.profiles p ON p.user_id = r.user_id
    WHERE r.anime_id = target_anime_id
    ORDER BY r.created_at DESC LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_following(follower_user_id UUID, following_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.follows WHERE follower_id = follower_user_id AND following_id = following_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_followers(target_username TEXT, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (username TEXT, display_name TEXT, avatar_url TEXT, bio TEXT, followed_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY SELECT p.username, p.display_name, p.avatar_url, p.bio, f.created_at
    FROM public.follows f
    INNER JOIN public.profiles target_profile ON target_profile.username = target_username
    INNER JOIN public.profiles p ON p.user_id = f.follower_id
    WHERE f.following_id = target_profile.user_id
    ORDER BY f.created_at DESC LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_following(target_username TEXT, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (username TEXT, display_name TEXT, avatar_url TEXT, bio TEXT, followed_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY SELECT p.username, p.display_name, p.avatar_url, p.bio, f.created_at
    FROM public.follows f
    INNER JOIN public.profiles target_profile ON target_profile.username = target_username
    INNER JOIN public.profiles p ON p.user_id = f.following_id
    WHERE f.follower_id = target_profile.user_id
    ORDER BY f.created_at DESC LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_watchlist_by_slug(target_username TEXT, target_slug TEXT)
RETURNS TABLE (id UUID, user_id UUID, name TEXT, description TEXT, slug TEXT, is_public BOOLEAN, created_at TIMESTAMP WITH TIME ZONE, updated_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY SELECT w.id, w.user_id, w.name, w.description, w.slug, w.is_public, w.created_at, w.updated_at
    FROM public.watchlists w
    INNER JOIN public.profiles p ON p.user_id = w.user_id
    WHERE p.username = target_username AND w.slug = target_slug AND (w.is_public = true OR w.user_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Done!
SELECT 'Migration complete!' as status;
