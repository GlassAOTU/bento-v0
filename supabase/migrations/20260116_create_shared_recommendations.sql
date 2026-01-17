-- Create shared_recommendations table for sharing AI-generated anime recommendations
CREATE TABLE public.shared_recommendations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    shortcode CHAR(8) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    recommendations JSONB NOT NULL,
    prompt TEXT,
    prompt_truncated BOOLEAN DEFAULT false,
    tags JSONB NOT NULL DEFAULT '[]',
    cover_image_url TEXT,
    view_count INTEGER DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT shortcode_format CHECK (shortcode ~ '^[a-z0-9]{8}$'),
    CONSTRAINT prompt_length CHECK (char_length(prompt) <= 200),
    CONSTRAINT recommendations_limit CHECK (jsonb_array_length(recommendations) <= 50)
);

-- Indexes
CREATE INDEX idx_shared_recs_shortcode ON public.shared_recommendations(shortcode);
CREATE INDEX idx_shared_recs_user_id ON public.shared_recommendations(user_id);
CREATE INDEX idx_shared_recs_last_viewed ON public.shared_recommendations(last_viewed_at);

-- RLS (owner CRUD, public read)
ALTER TABLE public.shared_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view" ON public.shared_recommendations
    FOR SELECT USING (true);
CREATE POLICY "Owner can insert" ON public.shared_recommendations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update" ON public.shared_recommendations
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner can delete" ON public.shared_recommendations
    FOR DELETE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_shared_recommendations_updated_at
    BEFORE UPDATE ON public.shared_recommendations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
