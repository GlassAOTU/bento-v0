-- Create episodes table for caching TMDB episode data
CREATE TABLE IF NOT EXISTS public.episodes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    anime_id INTEGER NOT NULL REFERENCES public.anime_data(anime_id) ON DELETE CASCADE,
    tmdb_id INTEGER NOT NULL,
    season_number INTEGER NOT NULL,
    episode_number INTEGER NOT NULL,
    name TEXT,
    overview TEXT,
    air_date DATE,
    runtime INTEGER,
    still_url TEXT,
    vote_average DECIMAL(3,1),
    last_fetched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_anime_season_episode UNIQUE (anime_id, season_number, episode_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_episodes_anime_id ON public.episodes(anime_id);
CREATE INDEX IF NOT EXISTS idx_episodes_anime_season_episode ON public.episodes(anime_id, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_episodes_last_fetched ON public.episodes(last_fetched);

-- Enable Row Level Security (RLS)
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view episodes (public read)
CREATE POLICY "Anyone can view episodes"
    ON public.episodes
    FOR SELECT
    USING (true);

-- RLS Policy: Service role can insert/update/delete (for caching)
CREATE POLICY "Service role can manage episodes"
    ON public.episodes
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
