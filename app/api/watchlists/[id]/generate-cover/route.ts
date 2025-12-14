import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'
import { createServiceClient } from '@/lib/supabase/service-client'
import { generateWatchlistCover } from '@/lib/utils/generateWatchlistCover'

const STORAGE_BUCKET = 'watchlist-covers'

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: watchlistId } = await params
        const supabase = await createClient()
        const serviceClient = createServiceClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { data: watchlist, error: watchlistError } = await supabase
            .from('watchlists')
            .select('id, user_id, name')
            .eq('id', watchlistId)
            .single()

        if (watchlistError || !watchlist) {
            return NextResponse.json({ error: 'Watchlist not found' }, { status: 404 })
        }

        if (watchlist.user_id !== user.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { data: items, error: itemsError } = await supabase
            .from('watchlist_items')
            .select('image')
            .eq('watchlist_id', watchlistId)
            .order('added_at', { ascending: true })
            .limit(3)

        if (itemsError) {
            return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
        }

        const imageUrls = items?.map(item => item.image).filter(Boolean) || []

        if (imageUrls.length < 3) {
            if (watchlist.cover_image_url) {
                await supabase
                    .from('watchlists')
                    .update({ cover_image_url: null })
                    .eq('id', watchlistId)
            }
            return NextResponse.json({ cover_image_url: null, message: 'Not enough items for cover' })
        }

        const coverBuffer = await generateWatchlistCover(imageUrls)

        const fileName = `${watchlistId}-${Date.now()}.png`
        const { error: uploadError } = await serviceClient.storage
            .from(STORAGE_BUCKET)
            .upload(fileName, coverBuffer, {
                contentType: 'image/png',
                upsert: true
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: 'Failed to upload cover image' }, { status: 500 })
        }

        const { data: urlData } = serviceClient.storage
            .from(STORAGE_BUCKET)
            .getPublicUrl(fileName)

        const coverImageUrl = urlData.publicUrl

        const { error: updateError } = await supabase
            .from('watchlists')
            .update({ cover_image_url: coverImageUrl })
            .eq('id', watchlistId)

        if (updateError) {
            console.error('Update error:', updateError)
            return NextResponse.json({ error: 'Failed to update watchlist' }, { status: 500 })
        }

        return NextResponse.json({ cover_image_url: coverImageUrl })
    } catch (error) {
        console.error('Error generating cover:', error)
        return NextResponse.json({ error: 'Failed to generate cover' }, { status: 500 })
    }
}
