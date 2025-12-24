-- Add is_public column to watchlists table
ALTER TABLE public.watchlists
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Create index for filtering public watchlists
CREATE INDEX IF NOT EXISTS idx_watchlists_is_public ON public.watchlists(is_public) WHERE is_public = true;

-- Drop existing RLS policies for watchlists
DROP POLICY IF EXISTS "Users can view their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can create their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can update their own watchlists" ON public.watchlists;
DROP POLICY IF EXISTS "Users can delete their own watchlists" ON public.watchlists;

-- Create new RLS policies that respect public/private visibility
-- Policy: Anyone can view public watchlists, users can view their own
CREATE POLICY "Anyone can view public watchlists or own watchlists"
    ON public.watchlists
    FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

-- Policy: Users can create their own watchlists
CREATE POLICY "Users can create their own watchlists"
    ON public.watchlists
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own watchlists
CREATE POLICY "Users can update their own watchlists"
    ON public.watchlists
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own watchlists
CREATE POLICY "Users can delete their own watchlists"
    ON public.watchlists
    FOR DELETE
    USING (auth.uid() = user_id);

-- Also update watchlist_items to respect watchlist visibility
-- Drop existing RLS policies for watchlist_items
DROP POLICY IF EXISTS "Users can view items from their watchlists" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can add items to their watchlists" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can update items in their watchlists" ON public.watchlist_items;
DROP POLICY IF EXISTS "Users can delete items from their watchlists" ON public.watchlist_items;

-- Create new RLS policies for watchlist_items
-- Policy: Anyone can view items from public watchlists, users can view their own
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'watchlist_items'
        AND policyname = 'Anyone can view items from public watchlists or own watchlists'
    ) THEN
        CREATE POLICY "Anyone can view items from public watchlists or own watchlists"
            ON public.watchlist_items
            FOR SELECT
            USING (
                EXISTS (
                    SELECT 1 FROM public.watchlists
                    WHERE watchlists.id = watchlist_items.watchlist_id
                    AND (watchlists.is_public = true OR watchlists.user_id = auth.uid())
                )
            );
    END IF;
END $$;

-- Policy: Users can add items to their own watchlists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'watchlist_items'
        AND policyname = 'Users can add items to their own watchlists'
    ) THEN
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
    END IF;
END $$;

-- Policy: Users can update items in their own watchlists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'watchlist_items'
        AND policyname = 'Users can update items in their own watchlists'
    ) THEN
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
    END IF;
END $$;

-- Policy: Users can delete items from their own watchlists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'watchlist_items'
        AND policyname = 'Users can delete items from their own watchlists'
    ) THEN
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
    END IF;
END $$;
