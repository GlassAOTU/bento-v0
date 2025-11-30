import { createClient } from '@/lib/supabase/browser-client'

const BUCKET_NAME = 'anime-images'

/**
 * Cache a TMDB image to Supabase Storage
 * Returns the public URL of the cached image, or null if caching failed
 */
export async function cacheImageToStorage(
    tmdbId: number,
    imageUrl: string
): Promise<string | null> {
    const supabase = createClient()

    // Check if already cached in the image_cache table
    const { data: existing } = await supabase
        .from('image_cache')
        .select('cached_url')
        .eq('tmdb_id', tmdbId)
        .single()

    if (existing?.cached_url) {
        return existing.cached_url
    }

    try {
        // Fetch image from TMDB
        const response = await fetch(imageUrl)
        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status}`)
        }

        const blob = await response.blob()
        const arrayBuffer = await blob.arrayBuffer()

        const storagePath = `posters/${tmdbId}.jpg`

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(storagePath, arrayBuffer, {
                contentType: 'image/jpeg',
                upsert: true
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            throw uploadError
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(storagePath)

        // Save to cache table
        const { error: cacheError } = await supabase.from('image_cache').upsert({
            tmdb_id: tmdbId,
            poster_url: imageUrl,
            storage_path: storagePath,
            cached_url: publicUrl
        }, {
            onConflict: 'tmdb_id'
        })

        if (cacheError) {
            console.error('Cache table error:', cacheError)
            // Still return the URL even if cache table insert fails
        }

        return publicUrl
    } catch (error) {
        console.error('Failed to cache image:', error)
        return null
    }
}

/**
 * Get cached image URL if available, otherwise return fallback
 */
export async function getCachedImageUrl(
    tmdbId: number | null,
    fallbackUrl: string
): Promise<string> {
    if (!tmdbId) return fallbackUrl

    const supabase = createClient()
    const { data } = await supabase
        .from('image_cache')
        .select('cached_url')
        .eq('tmdb_id', tmdbId)
        .single()

    return data?.cached_url || fallbackUrl
}

/**
 * Check if an image is already cached
 */
export async function isImageCached(tmdbId: number): Promise<{ cached: boolean; url?: string }> {
    const supabase = createClient()
    const { data } = await supabase
        .from('image_cache')
        .select('cached_url')
        .eq('tmdb_id', tmdbId)
        .single()

    if (data?.cached_url) {
        return { cached: true, url: data.cached_url }
    }
    return { cached: false }
}
