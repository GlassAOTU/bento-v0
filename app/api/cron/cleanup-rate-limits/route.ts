import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server-client'

export const config = {
  runtime: 'edge',
}

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron with the secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const supabase = await createClient()

    // Delete rate limit records older than 24 hours
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { error, count } = await supabase
      .from('rate_limits')
      .delete()
      .lt('created_at', cutoffDate)

    if (error) {
      console.error('Cleanup error:', error)
      return NextResponse.json(
        { error: 'Failed to clean up rate limits', details: error },
        { status: 500 }
      )
    }

    console.log(`Cleaned up ${count || 0} rate limit records older than 24 hours`)

    return NextResponse.json({
      success: true,
      deletedCount: count || 0,
      cutoffDate
    })
  } catch (error) {
    console.error('Cleanup error:', error)
    return NextResponse.json(
      { error: 'Failed to clean up rate limits' },
      { status: 500 }
    )
  }
}
