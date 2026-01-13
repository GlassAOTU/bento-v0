const { createClient } = require('@supabase/supabase-js')

const isProd = process.argv.includes('--prod')
require('dotenv').config({ path: isProd ? '.env.production' : '.env.local' })

console.log(`Using ${isProd ? 'PRODUCTION' : 'DEV'} environment\n`)

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

function slugify(text) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

async function backfillSlugs() {
    console.log('Fetching anime without slugs...')

    const { data: anime, error } = await supabase
        .from('anime_data')
        .select('anime_id, details')
        .is('slug', null)

    if (error) {
        console.error('Error fetching anime:', error)
        return
    }

    console.log(`Found ${anime.length} anime to backfill`)

    let updated = 0
    let errors = 0

    for (const item of anime) {
        const title = item.details?.title
        if (!title) {
            console.warn(`Anime ${item.anime_id} has no title, skipping`)
            errors++
            continue
        }

        const slug = slugify(title)

        const { error: updateError } = await supabase
            .from('anime_data')
            .update({ slug })
            .eq('anime_id', item.anime_id)

        if (updateError) {
            console.error(`Failed to update ${title}:`, updateError.message)
            errors++
        } else {
            console.log(`✓ ${title} -> ${slug}`)
            updated++
        }
    }

    console.log(`\nDone! Updated ${updated}, errors ${errors}`)
}

backfillSlugs()
