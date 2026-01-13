import { findTMDBAnimeByTitle, getTMDBImageUrl, TMDB_POSTER_SIZES, searchTMDBAnime } from './tmdb'
import { getTMDBByAnilistId, getTMDBByTitle } from './anime-mappings'

/**
 * Check if a title's trailing number is part of the actual name (not a season indicator)
 * e.g., "Kaiju No. 8", "No. 6", "Steins;Gate 0"
 */
function hasTrailingNumberInName(title: string): boolean {
    // Patterns where trailing numbers are part of the actual title
    const nameNumberPatterns = [
        /No\.\s*\d+$/i,      // "Kaiju No. 8", "No. 6"
        /No\s+\d+$/i,        // "Kaiju No 8"
        /Number\s+\d+$/i,    // "Number 24"
        /#\d+$/,             // "Title #8"
        /\d+$/,              // Check if starts with number too (like "86")
    ]

    // If title starts with a number, the trailing number might be part of name
    if (/^\d+/.test(title)) return true

    // Check specific patterns
    for (const pattern of nameNumberPatterns) {
        if (pattern.test(title)) {
            // For "No." pattern specifically, this is almost always part of the title
            if (/No\.?\s*\d+$/i.test(title)) return true
        }
    }

    return false
}

/**
 * Extract the base name of an anime by removing season indicators
 */
function extractBaseName(title: string): string {
    let baseName = title;

    // Don't strip numbers that are part of the actual title name
    if (hasTrailingNumberInName(title)) {
        // Skip the generic number removal for these titles
    } else {
        // Remove numbers at end: "Title 2" (but not "Kaiju No. 8")
        baseName = baseName.replace(/\s+\d+$/, '');
    }
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
function isSeasonListing(title: string): boolean {
    // List of patterns that indicate a season-specific entry
    // Note: Simple trailing numbers (/\s+\d+$/) are handled separately below
    // to allow titles like "Kaiju No. 8" where the number is part of the name
    const seasonPatterns = [
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
 * Try to get TMDB image for an anime
 * Checks manual mappings first, then falls back to search with stricter filtering
 */
async function getTMDBImage(romajiTitle: string, englishTitle: string | null = null, anilistId?: number): Promise<string | null> {
    try {
        // Check manual mappings first (most reliable)
        if (anilistId) {
            const mappingById = getTMDBByAnilistId(anilistId);
            if (mappingById) {
                const results = await searchTMDBAnime(romajiTitle, 1, mappingById.type);
                if (results && results.length > 0 && results[0].poster_path) {
                    return getTMDBImageUrl(results[0].poster_path, TMDB_POSTER_SIZES.W500) || null;
                }
            }
        }

        // Check by title mapping
        const titlesToTry = [romajiTitle];
        if (englishTitle && englishTitle !== romajiTitle) {
            titlesToTry.push(englishTitle);
        }

        for (const title of titlesToTry) {
            const mappingByTitle = getTMDBByTitle(title);
            if (mappingByTitle) {
                const results = await searchTMDBAnime(title, 1, mappingByTitle.type);
                if (results && results.length > 0 && results[0].poster_path) {
                    return getTMDBImageUrl(results[0].poster_path, TMDB_POSTER_SIZES.W500) || null;
                }
            }
        }

        // Fall back to search (now uses stricter Japanese + Animation filter)
        for (const title of titlesToTry) {
            try {
                const searchTitle = extractBaseName(title);
                const results = await searchTMDBAnime(searchTitle, 1);

                if (results && results.length > 0) {
                    const tmdbMatch = results[0];
                    if (tmdbMatch.poster_path) {
                        return getTMDBImageUrl(tmdbMatch.poster_path, TMDB_POSTER_SIZES.W500) || null;
                    }
                }
            } catch (error) {
                // Silent fail - try next title
            }
        }
    } catch (error) {
        // Silent fail
    }

    return null;
}

export type AnimeFormat = 'TV' | 'TV_SHORT' | 'MOVIE' | 'OVA' | 'ONA' | 'SPECIAL'

/**
 * Enhanced search anime with season filtering and TMDB images
 */
export async function searchAnimeEnhanced(
    searchQuery: string,
    limit: number = 20,
    formats?: AnimeFormat[]
) {
    const query = `
    query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: ANIME, sort: [SEARCH_MATCH, POPULARITY_DESC], isAdult: false) {
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
          popularity
          format
          status
          episodes
          startDate {
            year
          }
          genres
          isAdult
        }
      }
    }`

    // Fetch more results to account for filtering
    const variables = { search: searchQuery, perPage: 50 }

    const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
        throw new Error("AniList API returned an error: " + response.status);
    }

    const data = await response.json()

    if (!data?.data?.Page?.media) {
        return []
    }

    // Process and filter results
    const processedResults: any[] = []
    const seenBaseNames = new Set<string>()

    for (const anime of data.data.Page.media) {
        // Skip adult content
        if (anime.isAdult) continue
        if (anime.genres?.includes('Hentai')) continue

        // Skip anime with no rating or 0 rating
        if (!anime.averageScore || anime.averageScore === 0) continue

        const romajiTitle = anime.title.romaji || ''
        const englishTitle = anime.title.english || ''
        const displayTitle = englishTitle || romajiTitle

        // Skip if no title
        if (!displayTitle) continue

        // Check if it's a season listing
        if (isSeasonListing(displayTitle)) {
            continue
        }

        // Extract base name and check for duplicates
        const baseName = extractBaseName(displayTitle)
        if (seenBaseNames.has(baseName.toLowerCase())) {
            continue
        }
        seenBaseNames.add(baseName.toLowerCase())

        // Always filter out MUSIC format
        if (anime.format === 'MUSIC') continue

        // If specific formats requested, filter to only those
        if (formats && formats.length > 0) {
            if (!formats.includes(anime.format)) continue
        } else {
            // Default behavior: be stricter with OVAs and Specials in search results
            if ((anime.format === 'SPECIAL' || anime.format === 'OVA' || anime.format === 'ONA')) {
                // Skip if it looks like a season-specific special
                if (displayTitle.includes(':') || /\d/.test(displayTitle)) {
                    continue
                }
                // Skip if popularity is too low (obscure titles)
                if (anime.popularity < 5000) {
                    continue
                }
            }
        }

        // Calculate relevance score
        let relevanceScore = 0

        // Format weights (prefer TV and Movies)
        const formatWeights: Record<string, number> = {
            'TV': 100,
            'MOVIE': 90,
            'TV_SHORT': 60,
            'OVA': 40,
            'ONA': 40,
            'SPECIAL': 30,
        }
        relevanceScore += formatWeights[anime.format] || 20

        // Popularity boost (logarithmic scale)
        if (anime.popularity) {
            relevanceScore += Math.min(Math.log10(anime.popularity) * 20, 100)
        }

        // Rating boost
        if (anime.averageScore) {
            relevanceScore += anime.averageScore / 2
        }

        // Status preference
        if (anime.status === 'RELEASING') relevanceScore += 20
        if (anime.status === 'FINISHED') relevanceScore += 10

        // Recency boost
        if (anime.startDate?.year) {
            const yearsSinceRelease = new Date().getFullYear() - anime.startDate.year
            if (yearsSinceRelease <= 2) relevanceScore += 30
            else if (yearsSinceRelease <= 5) relevanceScore += 15
        }

        // Try to get TMDB image (now with stricter filtering)
        const tmdbImage = await getTMDBImage(romajiTitle, englishTitle, anime.id)

        processedResults.push({
            id: anime.id,
            title: displayTitle,
            image: tmdbImage || anime.coverImage.extraLarge || anime.coverImage.large,
            rating: anime.averageScore,
            relevanceScore,
            enhanced: tmdbImage ? true : false
        })
    }

    // Sort by relevance score
    processedResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Return top results, removing internal scoring data
    return processedResults
        .slice(0, limit)
        .map(({ relevanceScore, enhanced, ...anime }) => anime)
}