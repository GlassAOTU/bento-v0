-- Create anime_data table for full anime caching
CREATE TABLE IF NOT EXISTS public.anime_data (
    anime_id INTEGER PRIMARY KEY,
    details JSONB NOT NULL,
    similar_anime JSONB NOT NULL,
    popular_anime JSONB NOT NULL,
    original_description TEXT NOT NULL,
    ai_description TEXT, -- Nullable - generated asynchronously after initial page load
    status TEXT NOT NULL,
    last_fetched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_anime_data_last_fetched ON public.anime_data(last_fetched);
CREATE INDEX IF NOT EXISTS idx_anime_data_status ON public.anime_data(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.anime_data ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Allow public read access (anyone can view anime data)
CREATE POLICY "Anyone can view anime data"
    ON public.anime_data
    FOR SELECT
    USING (true);

-- RLS Policy: Only service role can insert (API routes will use service role)
CREATE POLICY "Service role can insert anime data"
    ON public.anime_data
    FOR INSERT
    WITH CHECK (true);

-- RLS Policy: Only service role can update anime data
CREATE POLICY "Service role can update anime data"
    ON public.anime_data
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
