import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service-client'

export async function GET(request: Request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json(
            { error: 'Unauthorized' },
            { status: 401 }
        )
    }

    try {
        const supabase = createServiceClient()
        const cutoffDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

        const { error, count } = await supabase
            .from('shared_recommendations')
            .delete()
            .or(`last_viewed_at.lt.${cutoffDate},and(last_viewed_at.is.null,created_at.lt.${cutoffDate})`)

        if (error) {
            console.error('Share cleanup error:', error)
            return NextResponse.json(
                { error: 'Failed to clean up shares', details: error },
                { status: 500 }
            )
        }

        console.log(`Cleaned up ${count || 0} expired share records`)

        return NextResponse.json({
            success: true,
            deletedCount: count || 0,
            cutoffDate
        })
    } catch (error) {
        console.error('Share cleanup error:', error)
        return NextResponse.json(
            { error: 'Failed to clean up shares' },
            { status: 500 }
        )
    }
}
