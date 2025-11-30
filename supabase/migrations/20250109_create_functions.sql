-- Function to get user stats by user_id
CREATE OR REPLACE FUNCTION get_user_stats(target_user_id UUID)
RETURNS TABLE (
    watchlist_count BIGINT,
    review_count BIGINT,
    following_count BIGINT,
    followers_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*) FROM public.watchlists WHERE user_id = target_user_id AND is_public = true) AS watchlist_count,
        (SELECT COUNT(*) FROM public.reviews WHERE user_id = target_user_id) AS review_count,
        (SELECT COUNT(*) FROM public.follows WHERE follower_id = target_user_id) AS following_count,
        (SELECT COUNT(*) FROM public.follows WHERE following_id = target_user_id) AS followers_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get public watchlists by username
CREATE OR REPLACE FUNCTION get_public_watchlists(target_username TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.name,
        w.description,
        w.created_at,
        w.updated_at
    FROM public.watchlists w
    INNER JOIN public.profiles p ON p.user_id = w.user_id
    WHERE p.username = target_username
    AND w.is_public = true
    ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user reviews by username with anime details
CREATE OR REPLACE FUNCTION get_user_reviews(target_username TEXT, limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
    id UUID,
    anime_id INTEGER,
    anime_title TEXT,
    anime_image TEXT,
    rating INTEGER,
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        r.anime_id,
        (a.details->>'title')::TEXT AS anime_title,
        (a.details->>'coverImage')::TEXT AS anime_image,
        r.rating,
        r.review_text,
        r.created_at,
        r.updated_at
    FROM public.reviews r
    INNER JOIN public.profiles p ON p.user_id = r.user_id
    INNER JOIN public.anime_data a ON a.anime_id = r.anime_id
    WHERE p.username = target_username
    ORDER BY r.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get reviews for a specific anime
CREATE OR REPLACE FUNCTION get_anime_reviews(target_anime_id INTEGER, limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    rating INTEGER,
    review_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        r.id,
        p.username,
        p.display_name,
        p.avatar_url,
        r.rating,
        r.review_text,
        r.created_at,
        r.updated_at
    FROM public.reviews r
    INNER JOIN public.profiles p ON p.user_id = r.user_id
    WHERE r.anime_id = target_anime_id
    ORDER BY r.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user A follows user B
CREATE OR REPLACE FUNCTION is_following(follower_user_id UUID, following_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.follows
        WHERE follower_id = follower_user_id
        AND following_id = following_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get followers list by username
CREATE OR REPLACE FUNCTION get_followers(target_username TEXT, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.username,
        p.display_name,
        p.avatar_url,
        p.bio,
        f.created_at AS followed_at
    FROM public.follows f
    INNER JOIN public.profiles target_profile ON target_profile.username = target_username
    INNER JOIN public.profiles p ON p.user_id = f.follower_id
    WHERE f.following_id = target_profile.user_id
    ORDER BY f.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get following list by username
CREATE OR REPLACE FUNCTION get_following(target_username TEXT, limit_count INTEGER DEFAULT 50)
RETURNS TABLE (
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    followed_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.username,
        p.display_name,
        p.avatar_url,
        p.bio,
        f.created_at AS followed_at
    FROM public.follows f
    INNER JOIN public.profiles target_profile ON target_profile.username = target_username
    INNER JOIN public.profiles p ON p.user_id = f.following_id
    WHERE f.follower_id = target_profile.user_id
    ORDER BY f.created_at DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
