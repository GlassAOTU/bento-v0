-- Create follows table
CREATE TABLE IF NOT EXISTS public.follows (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_follow UNIQUE (follower_id, following_id),
    CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view follows (public read)
CREATE POLICY "Anyone can view follows"
    ON public.follows
    FOR SELECT
    USING (true);

-- RLS Policy: Authenticated users can follow others
CREATE POLICY "Authenticated users can follow others"
    ON public.follows
    FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

-- RLS Policy: Users can unfollow (delete their own follows)
CREATE POLICY "Users can unfollow"
    ON public.follows
    FOR DELETE
    USING (auth.uid() = follower_id);
