#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Try to load dotenv if available, otherwise continue without it
try {
    require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
    // Continue without dotenv
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Extract the base name of an anime by removing season indicators
 */
function extractBaseName(title) {
    let baseName = title;

    // Remove common season patterns
    baseName = baseName.replace(/\s+\d+$/, ''); // Remove numbers at end: "Title 2"
    baseName = baseName.replace(/\s+[IVX]+$/i, ''); // Remove roman numerals at end
    baseName = baseName.replace(/\s+Season\s+\d+/i, ''); // Remove "Season 2"
    baseName = baseName.replace(/\s+S\d+$/i, ''); // Remove "S2"
    baseName = baseName.replace(/\s+\d+(st|nd|rd|th)\s+Season/i, ''); // Remove "2nd Season"
    baseName = baseName.replace(/\s+Part\s+\d+/i, ''); // Remove "Part 2"
    baseName = baseName.replace(/\s+Cour\s+\d+/i, ''); // Remove "Cour 2"
    baseName = baseName.replace(/:\s*The\s+(Final|Second|Third|Fourth|Fifth)\s+Season$/i, ''); // Remove ": The Final Season"
    baseName = baseName.replace(/:\s*Season\s+\d+$/i, ''); // Remove ": Season 2"
    baseName = baseName.replace(/:\s*\d+(st|nd|rd|th)\s+Season$/i, ''); // Remove ": 2nd Season"
    baseName = baseName.replace(/:\s*Part\s+\d+$/i, ''); // Remove ": Part 2"
    baseName = baseName.replace(/:\s*(Final|Second|Third|Fourth|Fifth)\s+Season$/i, ''); // Remove ": Final Season"
    baseName = baseName.replace(/\s*\(TV\)$/i, ''); // Remove (TV) suffix
    baseName = baseName.replace(/:\s*The\s+Final$/i, ''); // Remove ": The Final"
    baseName = baseName.replace(/:\s*Final$/i, ''); // Remove ": Final"

    return baseName.trim();
}

/**
 * Check if an anime title is likely a season listing that should be filtered out
 */
function isSeasonListing(title) {
    // List of patterns that indicate a season-specific entry
    const seasonPatterns = [
        // Numbers at the end (very common)
        /\s+\d+$/, // "Title 2", "Title 3"

        // Season with number
        /\s+Season\s*\d+/i, // "Season 2", "Season 3"
        /\s+S\d+$/i, // "Title S2", "Title S3"
        /\s+\d+(st|nd|rd|th)\s+Season/i, // "1st Season", "2nd Season"

        // Descriptive seasons
        /:\s*The\s+(Final|Second|Third|Fourth|Fifth|Last)\s+Season/i, // ": The Final Season"
        /:\s*(Final|Second|Third|Fourth|Fifth|Last)\s+Season/i, // ": Final Season"
        /:\s*The\s+Final$/i, // ": The Final"
        /:\s*Final$/i, // ": Final"

        // Parts
        /\s+Part\s+\d+/i, // "Part 2", "Part 3"
        /:\s*Part\s+\d+/i, // ": Part 2"

        // Cours (common in anime)
        /\s+Cour\s+\d+/i, // "Cour 2"

        // Roman numerals
        /\s+II+$/i, // "Title II", "Title III" (but not single "I")
        /\s+IV$/i, // "Title IV"
        /\s+V$/i, // "Title V" (be careful not to match legitimate titles)
        /\s+VI+$/i, // "Title VI", "Title VII"
        /\s+IX$/i, // "Title IX"
        /\s+X$/i, // "Title X"

        // Arc naming (often indicates continuation)
        /:\s*\w+\s+Arc$/i, // ": Rengoku Arc", ": Entertainment District Arc"
        /:\s*\w+\s+Arc\s+\d+$/i, // ": Arc 2"

        // Movie sequels
        /\s+Movie\s+\d+/i, // "Movie 2"
        /:\s*Movie\s+\d+/i, // ": Movie 2"

        // Japanese season markers
        /第\s*\d+\s*期/, // "第2期" (Season 2 in Japanese)
    ];

    // Check if title matches any season pattern
    for (const pattern of seasonPatterns) {
        if (pattern.test(title)) {
            return true;
        }
    }

    // Additional check for numbered titles that are likely sequels
    // But be careful not to filter legitimate titles with numbers
    if (/\s+\d+$/.test(title)) {
        // If it ends with a number, check if it's a known sequel pattern
        const baseName = extractBaseName(title);
        // If removing the number significantly changes the title, it's likely a sequel
        if (baseName !== title && baseName.length > 0) {
            return true;
        }
    }

    return false;
}

/**
 * Try to find TMDB match for an anime and get better image
 * @param {string} romajiTitle - The Japanese romanized title
 * @param {string} englishTitle - The English title (optional)
 */
async function getTMDBImage(romajiTitle, englishTitle = null) {
    if (!TMDB_API_KEY) {
        return null;
    }

    // Try both titles if available
    const titlesToTry = [romajiTitle];
    if (englishTitle && englishTitle !== romajiTitle) {
        titlesToTry.push(englishTitle);
    }

    for (const title of titlesToTry) {
        try {
            // Use base name for better TMDB matching
            const searchTitle = extractBaseName(title);
            const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&with_keywords=210024|287501`;
            const response = await fetch(searchUrl);

            if (!response.ok) {
                continue;
            }

            const data = await response.json();

            if (data.results && data.results.length > 0) {
                const tmdbMatch = data.results[0];

                // Prefer poster for card display
                if (tmdbMatch.poster_path) {
                    const posterUrl = `${TMDB_IMAGE_BASE}/w500${tmdbMatch.poster_path}`;
                    return posterUrl;
                }
            }
        } catch (error) {
            // Silent fail - try next title
        }
    }

    return null;
}

async function fetchAnimeByCategory(category, count = 40) { // Increased to account for filtering
    let query, variables;

    // Base query structure - only get anime, exclude adult content
    const baseQuery = `
        id
        title {
            romaji
            english
        }
        coverImage {
            large
            extraLarge
        }
        averageScore
        genres
        isAdult
        format
        status
        type
    `;

    switch (category) {
        case 'most-popular':
            query = `
            query ($perPage: Int, $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, scoreMin: 60 };
            break;

        case 'shonen':
            query = `
            query ($perPage: Int, $tag_in: [String], $genre_not_in: [String], $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  tag_in: $tag_in,
                  genre_not_in: $genre_not_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Shounen'], genre_not_in: ['Slice of Life'], scoreMin: 60 };
            break;

        case 'slice-of-life':
            query = `
            query ($perPage: Int, $genre_in: [String], $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  genre_in: $genre_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, genre_in: ['Slice of Life'], scoreMin: 60 };
            break;

        case 'found-family':
            query = `
            query ($perPage: Int, $tag_in: [String], $genre_not_in: [String], $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  tag_in: $tag_in,
                  genre_not_in: $genre_not_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Found Family'], genre_not_in: ['Action', 'Adventure'], scoreMin: 60 };
            break;

        case 'top-rated':
            query = `
            query ($perPage: Int, $scoreMin: Int) {
              Page(perPage: $perPage) {
                media(
                  type: ANIME,
                  sort: SCORE_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, scoreMin: 60 };
            break;

        default:
            throw new Error(`Unknown category: ${category}`);
    }

    try {
        const response = await fetch("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ query, variables }),
        });

        if (!response.ok) {
            throw new Error(`AniList API returned an error: ${response.status}`);
        }

        const data = await response.json();

        if (!data?.data?.Page?.media) {
            throw new Error(`Failed to fetch anime for category: ${category}`);
        }

        // Filter and enhance anime data
        const filteredAnime = [];
        const seenBaseNames = new Set(); // Track base names to avoid duplicates

        for (const anime of data.data.Page.media) {
            // Safety filters
            if (anime.isAdult) continue;
            if (anime.genres?.includes('Hentai')) continue;

            // Ensure it's actually anime
            if (anime.type !== 'ANIME') continue;

            const romajiTitle = anime.title.romaji || '';
            const englishTitle = anime.title.english || '';
            const title = romajiTitle || englishTitle || '';

            // Skip if empty title
            if (!title) continue;

            // Check if it's a season listing
            if (isSeasonListing(title)) {
                continue;
            }

            // Extract base name and check for duplicates
            const baseName = extractBaseName(title);
            if (seenBaseNames.has(baseName.toLowerCase())) {
                continue;
            }
            seenBaseNames.add(baseName.toLowerCase());

            // Additional filter for OVAs/Specials that might be season-specific
            if (anime.format === 'SPECIAL' || anime.format === 'OVA' || anime.format === 'ONA') {
                // Be more strict with these formats
                if (title.includes(':') || /\d/.test(title)) {
                    continue;
                }
            }

            // Try to get TMDB image - pass both romaji and english titles
            const tmdbImage = await getTMDBImage(romajiTitle, englishTitle);

            filteredAnime.push({
                id: anime.id,
                title: title,
                image: tmdbImage || anime.coverImage.extraLarge || anime.coverImage.large,
                rating: anime.averageScore,
                enhanced: tmdbImage ? true : false
            });
        }

        return filteredAnime;
    } catch (error) {
        console.error(`Error fetching ${category} anime:`, error);
        throw error;
    }
}

async function fetchUniqueAnime(category, mostPopularIds, targetCount = 20) {
    const maxAttempts = 3;
    const batchSize = 50; // Increased to account for more filtering
    let allAnime = [];
    let attempt = 0;

    while (allAnime.length < targetCount && attempt < maxAttempts) {
        const fetchCount = batchSize + (attempt * 20); // Fetch more on each attempt
        const anime = await fetchAnimeByCategory(category, fetchCount);

        // Filter out duplicates from Most Popular
        const uniqueAnime = anime.filter(a => !mostPopularIds.has(a.id));

        // Add to our collection (avoiding duplicates within this category too)
        const existingIds = new Set(allAnime.map(a => a.id));
        const newAnime = uniqueAnime.filter(a => !existingIds.has(a.id));
        allAnime = [...allAnime, ...newAnime];

        attempt++;
    }

    return allAnime.slice(0, targetCount);
}

async function main() {
    console.log('Fetching anime from AniList with TMDB image enhancement...\n');

    if (!TMDB_API_KEY) {
        console.log('⚠️  Warning: TMDB_API_KEY not found in .env file');
        console.log('   Images will use AniList sources only\n');
    }

    const categories = [
        { key: 'mostPopular', name: 'Most Popular', slug: 'most-popular' },
        { key: 'topRated', name: 'Top Rated', slug: 'top-rated' },
        { key: 'shonen', name: 'Shonen', slug: 'shonen' },
        { key: 'sliceOfLife', name: 'Slice of Life', slug: 'slice-of-life' },
        { key: 'foundFamily', name: 'Found Family with No Incest Plotlines', slug: 'found-family' }
    ];

    const result = {};
    let mostPopularIds = new Set();
    let totalEnhanced = 0;

    for (const category of categories) {
        console.log(`Fetching ${category.name}...`);
        try {
            let anime;

            if (category.slug === 'most-popular') {
                // Fetch Most Popular first
                anime = await fetchAnimeByCategory(category.slug, 50); // More to account for filtering
                // Ensure we have at least 20
                anime = anime.slice(0, 20);
                mostPopularIds = new Set(anime.map(a => a.id));
            } else {
                // For other categories, fetch unique anime
                anime = await fetchUniqueAnime(category.slug, mostPopularIds, 20);
            }

            // Count enhanced images
            const enhancedCount = anime.filter(a => a.enhanced).length;
            totalEnhanced += enhancedCount;

            // Remove the enhanced flag from final output
            const cleanAnime = anime.map(({ enhanced, ...rest }) => rest);

            result[category.key] = cleanAnime;
            console.log(`  ✓ Fetched ${cleanAnime.length} unique anime`);
            if (TMDB_API_KEY) {
                console.log(`  ✓ Enhanced ${enhancedCount} images with TMDB`);
            }

            cleanAnime.forEach((a, i) => {
                console.log(`    ${i + 1}. ${a.title} (${a.rating}/100)`);
            });
        } catch (error) {
            console.error(`  ✗ Failed to fetch ${category.name}:`, error.message);
            result[category.key] = [];
        }
        console.log('');
    }

    // Create data directory if it doesn't exist
    const dataDir = path.join(__dirname, '..', 'public', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
        console.log('Created public/data directory');
    }

    // Write to JSON file
    const outputPath = path.join(dataDir, 'popular-anime.json');
    fs.writeFileSync(
        outputPath,
        JSON.stringify(result, null, 2)
    );

    console.log(`✓ Successfully wrote data to ${outputPath}`);
    if (TMDB_API_KEY) {
        console.log(`✓ Enhanced ${totalEnhanced} total images with TMDB`);
    }
}

main().catch(error => {
    console.error('Failed to fetch anime:', error);
    process.exit(1);
});