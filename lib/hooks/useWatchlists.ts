import { useQuery, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/browser-client'
import { useAuth } from '@/lib/auth/AuthContext'

export type WatchlistSummary = {
    id: string
    name: string
    description: string | null
    cover_image_url: string | null
    item_count: number
    preview_images: string[]
}

async function fetchWatchlists(userId: string): Promise<WatchlistSummary[]> {
    const supabase = createClient()

    const { data, error } = await supabase
        .from('watchlists')
        .select('id, name, description, cover_image_url')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

    if (error) {
        throw new Error(`Failed to load watchlists: ${error.message}`)
    }

    const watchlistsWithCounts = await Promise.all(
        (data || []).map(async (w) => {
            const { count } = await supabase
                .from('watchlist_items')
                .select('*', { count: 'exact', head: true })
                .eq('watchlist_id', w.id)

            const { data: items } = await supabase
                .from('watchlist_items')
                .select('image')
                .eq('watchlist_id', w.id)
                .order('created_at', { ascending: false })
                .limit(3)

            const preview_images = (items || []).map(item => item.image).filter(Boolean)

            return {
                ...w,
                item_count: count || 0,
                preview_images
            }
        })
    )

    return watchlistsWithCounts
}

export function useWatchlists() {
    const { user, loading: authLoading } = useAuth()
    const queryClient = useQueryClient()

    const query = useQuery({
        queryKey: ['watchlists', user?.id],
        queryFn: () => fetchWatchlists(user!.id),
        enabled: !!user && !authLoading,
        staleTime: 1000 * 60 * 5,
    })

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['watchlists', user?.id] })
    }

    return {
        data: query.data,
        isLoading: authLoading || query.isLoading,
        error: query.error,
        refetch: query.refetch,
        invalidate,
        isAuthenticated: !!user,
        authLoading,
    }
}
