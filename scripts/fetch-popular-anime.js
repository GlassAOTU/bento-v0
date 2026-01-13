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

const STAFF_PICKS = [
    'Steins;Gate',
    'Rurouni Kenshin',
    'Mobile Fighter G Gundam',
    'Fullmetal Alchemist',
    'Medabots',
    'Yu Yu Hakusho',
    'Run with the Wind',
    'Sousou no Frieren',
    'Great Teacher Onizuka',
    'Mob Psycho 100',
    'Odd Taxi',
    'Gintama'
];

/**
 * Extract the base name of an anime by removing season indicators
 */
function extractBaseName(title) {
    let baseName = title;

    // Remove common season patterns
    baseName = baseName.replace(/\s+R\d+$/i, ''); // Remove "R2", "R3" (Code Geass style)
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
 * Check if a title's trailing number is part of the actual name (not a season indicator)
 * e.g., "Kaiju No. 8", "No. 6", "Steins;Gate 0"
 */
function hasTrailingNumberInName(title) {
    if (/^\d+/.test(title)) return true;
    if (/No\.?\s*\d+$/i.test(title)) return true;
    return false;
}

/**
 * Check if an anime title is likely a season listing that should be filtered out
 */
function isSeasonListing(title) {
    // List of patterns that indicate a season-specific entry
    // Note: Simple trailing numbers are handled separately below
    // to allow titles like "Kaiju No. 8" where the number is part of the name
    const seasonPatterns = [
        // Code Geass style sequels
        /\s+R\d+$/i, // "Title R2", "Title R3"

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
    // But skip if the number is part of the actual title (like "Kaiju No. 8")
    if (/\s+\d+$/.test(title) && !hasTrailingNumberInName(title)) {
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
 * Check if content is Japanese animation (anime)
 * Requires BOTH Japanese origin AND animation genre
 */
function isJapaneseAnimation(content) {
    const isJapanese = content.origin_country?.includes('JP') ||
                       content.original_language === 'ja';
    const isAnimation = content.genre_ids?.includes(16); // 16 = Animation
    return isJapanese && isAnimation;
}

/**
 * Manual mappings for known problematic titles
 */
const TITLE_TO_TMDB = {
    'your name': { tmdbId: 372058, type: 'movie' },
    'your name.': { tmdbId: 372058, type: 'movie' },
    'kimi no na wa': { tmdbId: 372058, type: 'movie' },
    'a silent voice': { tmdbId: 378064, type: 'movie' },
    'koe no katachi': { tmdbId: 378064, type: 'movie' },
    'weathering with you': { tmdbId: 568160, type: 'movie' },
    'tenki no ko': { tmdbId: 568160, type: 'movie' },
    'suzume': { tmdbId: 916224, type: 'movie' },
};

/**
 * Try to find TMDB match for an anime and get better image
 * Uses strict filtering: requires Japanese + Animation
 * @param {string} romajiTitle - The Japanese romanized title
 * @param {string} englishTitle - The English title (optional)
 */
async function getTMDBImage(romajiTitle, englishTitle = null) {
    if (!TMDB_API_KEY) {
        return null;
    }

    const titlesToTry = [romajiTitle];
    if (englishTitle && englishTitle !== romajiTitle) {
        titlesToTry.push(englishTitle);
    }

    // Check manual mappings first
    for (const title of titlesToTry) {
        const normalizedTitle = title.toLowerCase().trim();
        const mapping = TITLE_TO_TMDB[normalizedTitle];
        if (mapping) {
            try {
                const endpoint = mapping.type === 'movie' ? 'movie' : 'tv';
                const url = `${TMDB_BASE_URL}/${endpoint}/${mapping.tmdbId}?api_key=${TMDB_API_KEY}`;
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.poster_path) {
                        return `${TMDB_IMAGE_BASE}/w500${data.poster_path}`;
                    }
                }
            } catch (e) {
                // Continue to search
            }
        }
    }

    // Search with stricter filtering
    for (const title of titlesToTry) {
        try {
            const searchTitle = extractBaseName(title);

            // Search TV shows
            const tvUrl = `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&include_adult=false`;
            const tvResponse = await fetch(tvUrl);
            if (tvResponse.ok) {
                const tvData = await tvResponse.json();
                const animeResults = (tvData.results || []).filter(isJapaneseAnimation);
                if (animeResults.length > 0 && animeResults[0].poster_path) {
                    return `${TMDB_IMAGE_BASE}/w500${animeResults[0].poster_path}`;
                }
            }

            // Search movies
            const movieUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchTitle)}&include_adult=false`;
            const movieResponse = await fetch(movieUrl);
            if (movieResponse.ok) {
                const movieData = await movieResponse.json();
                const animeResults = (movieData.results || []).filter(isJapaneseAnimation);
                if (animeResults.length > 0 && animeResults[0].poster_path) {
                    return `${TMDB_IMAGE_BASE}/w500${animeResults[0].poster_path}`;
                }
            }
        } catch (error) {
            // Silent fail - try next title
        }
    }

    return null;
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, options, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const response = await fetch(url, options);

        if (response.status === 429) {
            const waitTime = Math.pow(2, attempt + 1) * 10000; // 20s, 40s, 80s
            console.log(`    Rate limited. Waiting ${waitTime / 1000}s before retry...`);
            await sleep(waitTime);
            continue;
        }

        return response;
    }
    throw new Error('Max retries exceeded due to rate limiting');
}

async function fetchAnimeByCategory(category, count = 40, page = 1) {
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
            query ($page: Int, $perPage: Int, $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
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
            query ($page: Int, $perPage: Int, $tag_in: [String], $genre_not_in: [String], $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
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
            query ($page: Int, $perPage: Int, $genre_in: [String], $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
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
            query ($page: Int, $perPage: Int, $tag_in: [String], $genre_not_in: [String], $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
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
            query ($page: Int, $perPage: Int, $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
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

        case 'isekai':
            query = `
            query ($page: Int, $perPage: Int, $tag_in: [String], $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
                media(
                  type: ANIME,
                  tag_in: $tag_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Isekai'], scoreMin: 60 };
            break;

        case 'love-without-harem':
            query = `
            query ($page: Int, $perPage: Int, $genre_in: [String], $tag_not_in: [String], $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
                media(
                  type: ANIME,
                  genre_in: $genre_in,
                  tag_not_in: $tag_not_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, genre_in: ['Romance'], tag_not_in: ['Harem'], scoreMin: 60 };
            break;

        case 'psychological':
            query = `
            query ($page: Int, $perPage: Int, $genre_in: [String], $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
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
            variables = { perPage: count, genre_in: ['Psychological'], scoreMin: 60 };
            break;

        case '2000s-classics':
            query = `
            query ($page: Int, $perPage: Int, $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
                media(
                  type: ANIME,
                  startDate_greater: 19991231,
                  startDate_lesser: 20100101,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, scoreMin: 70 };
            break;

        case 'anti-hero':
            query = `
            query ($page: Int, $perPage: Int, $tag_in: [String], $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
                media(
                  type: ANIME,
                  tag_in: $tag_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Anti-Hero'], scoreMin: 60 };
            break;

        case 'wholesome-af':
            query = `
            query ($page: Int, $perPage: Int, $tag_in: [String], $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
                media(
                  type: ANIME,
                  tag_in: $tag_in,
                  sort: POPULARITY_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, tag_in: ['Iyashikei'], scoreMin: 60 };
            break;

        case 'hidden-gems':
            query = `
            query ($page: Int, $perPage: Int, $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
                media(
                  type: ANIME,
                  sort: SCORE_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  popularity_lesser: 50000,
                  format_in: [TV, MOVIE]
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, scoreMin: 80 };
            break;

        case 'movies':
            query = `
            query ($page: Int, $perPage: Int, $scoreMin: Int) {
              Page(page: $page, perPage: $perPage) {
                media(
                  type: ANIME,
                  sort: SCORE_DESC,
                  isAdult: false,
                  averageScore_greater: $scoreMin,
                  format: MOVIE,
                  episodes_lesser: 2
                ) {
                  ${baseQuery}
                }
              }
            }`;
            variables = { perPage: count, scoreMin: 75 };
            break;

        default:
            throw new Error(`Unknown category: ${category}`);
    }

    // Add page to variables
    variables.page = page;

    try {
        const response = await fetchWithRetry("https://graphql.anilist.co", {
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
            const title = englishTitle || romajiTitle || '';

            // Skip if empty title
            if (!title) continue;

            // Check if it's a season listing (skip this filter for movies category)
            if (category !== 'movies' && isSeasonListing(title)) {
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

async function fetchUniqueAnime(category, allSeenIds, allSeenBaseNames, targetCount = 20) {
    const maxPages = 5;
    const batchSize = 50;
    let allAnime = [];
    let page = 1;
    let localSeenBaseNames = new Set(allSeenBaseNames);

    while (allAnime.length < targetCount && page <= maxPages) {
        const anime = await fetchAnimeByCategory(category, batchSize, page);

        if (anime.length === 0) {
            // No more results from API
            break;
        }

        // Filter out duplicates from ALL previous categories (by ID and base name)
        for (const a of anime) {
            if (allSeenIds.has(a.id)) continue;

            const baseName = extractBaseName(a.title).toLowerCase();
            if (localSeenBaseNames.has(baseName)) continue;

            allAnime.push(a);
            localSeenBaseNames.add(baseName);

            if (allAnime.length >= targetCount) break;
        }

        page++;
    }

    return { anime: allAnime.slice(0, targetCount), seenBaseNames: localSeenBaseNames };
}

async function fetchStaffPicks(titles) {
    const results = [];

    for (const searchTitle of titles) {
        try {
            const query = `
            query ($search: String) {
              Media(type: ANIME, search: $search) {
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
              }
            }`;

            const response = await fetchWithRetry("https://graphql.anilist.co", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, variables: { search: searchTitle } }),
            });

            if (!response.ok) {
                console.log(`    ⚠ Could not find: ${searchTitle}`);
                continue;
            }

            const data = await response.json();
            const anime = data?.data?.Media;

            if (!anime) {
                console.log(`    ⚠ No results for: ${searchTitle}`);
                continue;
            }

            const romajiTitle = anime.title.romaji || '';
            const englishTitle = anime.title.english || '';
            const title = englishTitle || romajiTitle;

            const tmdbImage = await getTMDBImage(romajiTitle, englishTitle);

            results.push({
                id: anime.id,
                title: title,
                image: tmdbImage || anime.coverImage.extraLarge || anime.coverImage.large,
                rating: anime.averageScore,
                enhanced: tmdbImage ? true : false
            });
        } catch (error) {
            console.log(`    ⚠ Error fetching ${searchTitle}:`, error.message);
        }
    }

    return results;
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
        { key: 'staffPicks', name: 'Staff Picks', slug: 'staff-picks', curated: true },
        { key: 'shonen', name: 'Shonen', slug: 'shonen' },
        { key: 'sliceOfLife', name: 'Slice of Life', slug: 'slice-of-life' },
        { key: 'foundFamily', name: 'Found Family with No Incest Plotlines', slug: 'found-family' },
        { key: 'isekai', name: 'Isekai', slug: 'isekai' },
        { key: 'loveWithoutHarem', name: 'Love Without the Harem', slug: 'love-without-harem' },
        { key: 'psychological', name: 'Psychological', slug: 'psychological' },
        { key: 'classics2000s', name: "2000's Classics", slug: '2000s-classics' },
        { key: 'antiHero', name: 'Anti-Hero', slug: 'anti-hero' },
        { key: 'wholesomeAf', name: 'Wholesome AF', slug: 'wholesome-af' },
        { key: 'hiddenGems', name: 'Hidden Gems', slug: 'hidden-gems' },
        { key: 'movies', name: 'Movies', slug: 'movies' }
    ];

    const result = {};
    let allSeenIds = new Set();
    let allSeenBaseNames = new Set();
    let totalEnhanced = 0;

    for (const category of categories) {
        console.log(`Fetching ${category.name}...`);
        try {
            let anime;

            if (category.curated) {
                // Curated category - fetch specific titles (no deduplication)
                anime = await fetchStaffPicks(STAFF_PICKS);
            } else if (category.slug === 'most-popular') {
                // Fetch Most Popular first (no filtering needed)
                anime = await fetchAnimeByCategory(category.slug, 50, 1);
                anime = anime.slice(0, 20);
                // Track base names from most popular
                anime.forEach(a => allSeenBaseNames.add(extractBaseName(a.title).toLowerCase()));
            } else {
                // For other categories, fetch anime not seen in previous categories
                const fetchResult = await fetchUniqueAnime(category.slug, allSeenIds, allSeenBaseNames, 20);
                anime = fetchResult.anime;
                allSeenBaseNames = fetchResult.seenBaseNames;
            }

            // Track all IDs to avoid repeats in subsequent categories
            anime.forEach(a => allSeenIds.add(a.id));

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