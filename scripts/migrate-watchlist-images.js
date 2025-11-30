#!/usr/bin/env node

/**
 * Migration script to update existing watchlist items with TMDB images
 *
 * Run with: set -a && source .env.local && set +a && node scripts/migrate-watchlist-images.js
 */

const { createClient } = require('@supabase/supabase-js')

const TMDB_API_KEY = process.env.TMDB_API_KEY
const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const BATCH_SIZE = 50
const DELAY_MS = 300 // Rate limit protection

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function searchTMDB(title) {
    if (!TMDB_API_KEY) return null

    try {
        const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}`
        const response = await fetch(searchUrl)

        if (!response.ok) return null

        const data = await response.json()

        if (data.results && data.results.length > 0) {
            const match = data.results[0]
            return {
                tmdb_id: match.id,
                poster_path: match.poster_path,
                title: match.name || match.title
            }
        }
    } catch (error) {
        console.error(`  TMDB search error for "${title}":`, error.message)
    }

    return null
}

async function migrate() {
    console.log('Starting watchlist image migration...\n')

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('❌ Missing SUPABASE_URL or SUPABASE_ANON_KEY')
        process.exit(1)
    }

    if (!TMDB_API_KEY) {
        console.error('❌ Missing TMDB_API_KEY')
        process.exit(1)
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

    // Get items needing migration
    const { data: items, error: fetchError } = await supabase
        .from('watchlist_items')
        .select('*')
        .or('image_source.is.null,image_source.eq.external')
        .limit(BATCH_SIZE)

    if (fetchError) {
        console.error('❌ Failed to fetch items:', fetchError.message)
        process.exit(1)
    }

    console.log(`Found ${items?.length || 0} items to migrate\n`)

    if (!items || items.length === 0) {
        console.log('✓ No items need migration')
        return
    }

    let migrated = 0
    let failed = 0
    let noMatch = 0

    for (const item of items) {
        process.stdout.write(`Processing: ${item.title}... `)

        try {
            // Search TMDB
            const tmdbData = await searchTMDB(item.title)

            if (tmdbData && tmdbData.tmdb_id && tmdbData.poster_path) {
                const tmdbImageUrl = `${TMDB_IMAGE_BASE}/w500${tmdbData.poster_path}`

                // Update watchlist item with TMDB image URL
                const { error: updateError } = await supabase
                    .from('watchlist_items')
                    .update({
                        tmdb_id: tmdbData.tmdb_id,
                        original_image_url: item.image,
                        image: tmdbImageUrl,
                        image_source: 'tmdb'
                    })
                    .eq('id', item.id)

                if (updateError) {
                    console.log(`❌ Update failed: ${updateError.message}`)
                    failed++
                } else {
                    console.log(`✓ Updated to TMDB`)
                    migrated++
                }
            } else {
                // No TMDB match - mark as anilist fallback
                await supabase
                    .from('watchlist_items')
                    .update({
                        image_source: 'anilist_fallback',
                        original_image_url: item.image
                    })
                    .eq('id', item.id)

                console.log('○ No TMDB match')
                noMatch++
            }

            await sleep(DELAY_MS)
        } catch (error) {
            console.log(`❌ Error: ${error.message}`)
            failed++
        }
    }

    console.log('\n--- Migration Summary ---')
    console.log(`✓ Migrated: ${migrated}`)
    console.log(`○ No TMDB match: ${noMatch}`)
    console.log(`❌ Failed: ${failed}`)

    if (items.length === BATCH_SIZE) {
        console.log(`\n⚠️  There may be more items. Run again to continue.`)
    }
}

migrate().catch(error => {
    console.error('Migration failed:', error)
    process.exit(1)
})
