import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BUCKET_NAME = 'anime-images'

/**
 * Cache a TMDB image to Supabase Storage
 * POST body: { tmdb_id: number, image_url: string }
 * Returns: { cached_url: string | null, from_cache: boolean }
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { tmdb_id, image_url } = body

        if (!tmdb_id || !image_url) {
            return NextResponse.json(
                { error: 'tmdb_id and image_url are required' },
                { status: 400 }
            )
        }

        // Create Supabase client with service role for storage access
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !supabaseServiceKey) {
            console.error('Missing Supabase credentials:', {
                hasUrl: !!supabaseUrl,
                hasServiceKey: !!supabaseServiceKey
            })
            return NextResponse.json({
                cached_url: null,
                from_cache: false,
                error: 'Storage not configured'
            })
        }

        console.log('Attempting to cache image:', { tmdb_id, bucket: BUCKET_NAME })

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // Check if already cached
        const { data: existing } = await supabase
            .from('image_cache')
            .select('cached_url')
            .eq('tmdb_id', tmdb_id)
            .single()

        if (existing?.cached_url) {
            return NextResponse.json({
                cached_url: existing.cached_url,
                from_cache: true
            })
        }

        // Fetch image from TMDB
        const imageResponse = await fetch(image_url)
        if (!imageResponse.ok) {
            throw new Error(`Failed to fetch image: ${imageResponse.status}`)
        }

        const blob = await imageResponse.blob()
        const arrayBuffer = await blob.arrayBuffer()

        const storagePath = `posters/${tmdb_id}.jpg`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            })

        if (uploadError) {
            console.error('Upload error:', JSON.stringify(uploadError, null, 2))
            // Return the original TMDB URL as fallback
            return NextResponse.json({
                cached_url: null,
                from_cache: false,
                fallback_url: image_url,
                debug_error: uploadError.message
            })
        }

        console.log('Upload successful, getting public URL')

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath)

        // Save to cache table
        await supabase.from('image_cache').upsert({
            tmdb_id: tmdb_id,
            poster_url: image_url,
            storage_path: storagePath,
            cached_url: publicUrl
        }, {
            onConflict: 'tmdb_id'
        })

        return NextResponse.json({
            cached_url: publicUrl,
            from_cache: false
        })
    } catch (error) {
        console.error('Image cache error:', error)
        return NextResponse.json(
            { error: 'Failed to cache image', cached_url: null },
            { status: 500 }
        )
    }
}
