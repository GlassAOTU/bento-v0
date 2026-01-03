/**
 * Script to clear potentially bad cached anime data from Supabase
 *
 * This script:
 * 1. Fetches all cached anime data
 * 2. Identifies entries that likely have wrong TMDB matches
 * 3. Deletes those entries so fresh data will be fetched
 *
 * Run with: node scripts/clear-bad-cache.js
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Known problematic titles that commonly get wrong TMDB matches
const PROBLEMATIC_TITLES = [
    'your name',
    'a silent voice',
    'weathering with you',
    'suzume',
]

// Non-anime keywords that indicate a wrong match
const NON_ANIME_KEYWORDS = [
    'allah',
    'prophet',
    'muhammad',
    'islamic',
    'bible',
    'christ',
    'religious',
    'documentary',
    'live action',
    'live-action',
    'bollywood',
    'korean drama',
    'k-drama',
    'telenovela',
]

async function clearBadCache() {
    console.log('Starting cache cleanup...\n')

    try {
        // Fetch all cached anime data
        const { data: allCache, error: fetchError } = await supabase
            .from('anime_data')
            .select('anime_id, details')

        if (fetchError) {
            console.error('Error fetching cache:', fetchError)
            return
        }

        console.log(`Found ${allCache.length} cached entries\n`)

        const toDelete = []

        for (const entry of allCache) {
            const details = entry.details || {}
            const title = (details.title || '').toLowerCase()
            const description = (details.description || '').toLowerCase()

            let shouldDelete = false
            let reason = ''

            // Check for non-anime keywords in title or description
            for (const keyword of NON_ANIME_KEYWORDS) {
                if (title.includes(keyword) || description.includes(keyword)) {
                    shouldDelete = true
                    reason = `Contains non-anime keyword: "${keyword}"`
                    break
                }
            }

            // Check for known problematic titles with wrong IDs
            // These should use AniList IDs which are consistent
            if (!shouldDelete) {
                const normalizedTitle = title.replace(/[^a-z0-9\s]/g, '').trim()

                for (const problematic of PROBLEMATIC_TITLES) {
                    if (normalizedTitle.includes(problematic.replace(/[^a-z0-9\s]/g, ''))) {
                        // This is a known problematic title - check if it might be wrong
                        // If the ID is a TMDB ID (typically 6-7 digits), it might be wrong
                        // AniList IDs for these popular anime are typically 5 digits
                        if (entry.anime_id > 100000 && entry.anime_id < 1000000) {
                            shouldDelete = true
                            reason = `Problematic title "${title}" may have wrong TMDB ID`
                        }
                        break
                    }
                }
            }

            if (shouldDelete) {
                toDelete.push({
                    anime_id: entry.anime_id,
                    title: details.title,
                    reason
                })
            }
        }

        console.log(`Found ${toDelete.length} entries to delete:\n`)

        if (toDelete.length === 0) {
            console.log('No bad cache entries found. Cache is clean!')
            return
        }

        for (const item of toDelete) {
            console.log(`- ID ${item.anime_id}: "${item.title}"`)
            console.log(`  Reason: ${item.reason}\n`)
        }

        // Ask for confirmation
        const readline = require('readline')
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        })

        rl.question('\nDelete these entries? (yes/no): ', async (answer) => {
            if (answer.toLowerCase() === 'yes') {
                console.log('\nDeleting entries...')

                for (const item of toDelete) {
                    const { error: deleteError } = await supabase
                        .from('anime_data')
                        .delete()
                        .eq('anime_id', item.anime_id)

                    if (deleteError) {
                        console.error(`Failed to delete ID ${item.anime_id}:`, deleteError)
                    } else {
                        console.log(`Deleted ID ${item.anime_id}`)
                    }
                }

                console.log('\nCache cleanup complete!')
            } else {
                console.log('\nAborted. No entries deleted.')
            }

            rl.close()
            process.exit(0)
        })

    } catch (error) {
        console.error('Error during cache cleanup:', error)
        process.exit(1)
    }
}

clearBadCache()
