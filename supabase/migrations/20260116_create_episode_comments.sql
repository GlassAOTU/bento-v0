-- Create episode_comments table
CREATE TABLE IF NOT EXISTS public.episode_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    episode_id UUID NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
    comment_text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT comment_text_length CHECK (char_length(comment_text) >= 1 AND char_length(comment_text) <= 2000)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_episode_comments_episode_id ON public.episode_comments(episode_id);
CREATE INDEX IF NOT EXISTS idx_episode_comments_user_id ON public.episode_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_episode_comments_created_at ON public.episode_comments(created_at DESC);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_episode_comments_updated_at
    BEFORE UPDATE ON public.episode_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE public.episode_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view comments (public read)
CREATE POLICY "Anyone can view episode comments"
    ON public.episode_comments
    FOR SELECT
    USING (true);

-- RLS Policy: Authenticated users can create comments
CREATE POLICY "Authenticated users can create episode comments"
    ON public.episode_comments
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own comments
CREATE POLICY "Users can update their own episode comments"
    ON public.episode_comments
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own episode comments"
    ON public.episode_comments
    FOR DELETE
    USING (auth.uid() = user_id);

-- Function to get comments for a specific episode with user info
CREATE OR REPLACE FUNCTION get_episode_comments(target_episode_id UUID, limit_count INTEGER DEFAULT 20, sort_order TEXT DEFAULT 'newest')
RETURNS TABLE (
    id UUID,
    username TEXT,
    display_name TEXT,
    avatar_url TEXT,
    comment_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF sort_order = 'oldest' THEN
        RETURN QUERY
        SELECT
            c.id,
            p.username,
            p.display_name,
            p.avatar_url,
            c.comment_text,
            c.created_at,
            c.updated_at
        FROM public.episode_comments c
        INNER JOIN public.profiles p ON p.user_id = c.user_id
        WHERE c.episode_id = target_episode_id
        ORDER BY c.created_at ASC
        LIMIT limit_count;
    ELSE
        RETURN QUERY
        SELECT
            c.id,
            p.username,
            p.display_name,
            p.avatar_url,
            c.comment_text,
            c.created_at,
            c.updated_at
        FROM public.episode_comments c
        INNER JOIN public.profiles p ON p.user_id = c.user_id
        WHERE c.episode_id = target_episode_id
        ORDER BY c.created_at DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
