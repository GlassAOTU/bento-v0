-- Create watchlists table
CREATE TABLE IF NOT EXISTS public.watchlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create watchlist_items table
CREATE TABLE IF NOT EXISTS public.watchlist_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    watchlist_id UUID NOT NULL REFERENCES public.watchlists(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    reason TEXT,
    description TEXT,
    image TEXT,
    external_links JSONB,
    trailer JSONB,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_watchlists_user_id ON public.watchlists(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_items_watchlist_id ON public.watchlist_items(watchlist_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for watchlists table
-- Users can view their own watchlists
CREATE POLICY "Users can view their own watchlists"
    ON public.watchlists
    FOR SELECT
    USING (auth.uid() = user_id);

-- Users can create their own watchlists
CREATE POLICY "Users can create their own watchlists"
    ON public.watchlists
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own watchlists
CREATE POLICY "Users can update their own watchlists"
    ON public.watchlists
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own watchlists
CREATE POLICY "Users can delete their own watchlists"
    ON public.watchlists
    FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for watchlist_items table
-- Users can view items in their own watchlists
CREATE POLICY "Users can view items in their own watchlists"
    ON public.watchlist_items
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.watchlists
            WHERE watchlists.id = watchlist_items.watchlist_id
            AND watchlists.user_id = auth.uid()
        )
    );

-- Users can add items to their own watchlists
CREATE POLICY "Users can add items to their own watchlists"
    ON public.watchlist_items
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.watchlists
            WHERE watchlists.id = watchlist_items.watchlist_id
            AND watchlists.user_id = auth.uid()
        )
    );

-- Users can update items in their own watchlists
CREATE POLICY "Users can update items in their own watchlists"
    ON public.watchlist_items
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.watchlists
            WHERE watchlists.id = watchlist_items.watchlist_id
            AND watchlists.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.watchlists
            WHERE watchlists.id = watchlist_items.watchlist_id
            AND watchlists.user_id = auth.uid()
        )
    );

-- Users can delete items from their own watchlists
CREATE POLICY "Users can delete items from their own watchlists"
    ON public.watchlist_items
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.watchlists
            WHERE watchlists.id = watchlist_items.watchlist_id
            AND watchlists.user_id = auth.uid()
        )
    );

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER update_watchlists_updated_at
    BEFORE UPDATE ON public.watchlists
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
