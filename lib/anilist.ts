const STREAMING_SITES = [
    'Crunchyroll', 'Funimation', 'Netflix', 'Hulu',
    'Amazon Prime Video', 'HIDIVE', 'VRV', 'Tubi',
    'Disney Plus', 'HBO Max', 'Peacock', 'YouTube', 'Bilibili'
]

export async function fetchAnimeDetails(animeTitle: string) {
    const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        title {
          romaji
        }
        bannerImage
        externalLinks {
            url
            site
        }
        description(asHtml: false)
        trailer {
            id
            site
        }
      }
    }`

    const variables = { search: animeTitle }
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

    if (!data?.data?.Media) {
        throw new Error("Anime not found in AniList response");
    }

    const media = data.data.Media

    return {
        bannerImage: media.bannerImage || "",
        externalLinks: media.externalLinks?.[0] || null,
        description: (media.description || "No description available")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/\(Source:.*?\)/gi, "")
            .replace(/\s*\n\s*/g, "\n")
            .trim(),
        trailer: media.trailer ? {
            id: media.trailer.id,
            site: media.trailer.site
        } : null
    }
}

export async function fetchPopularAnime(count: number = 4) {
    const query = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          averageScore
          isAdult
          genres
        }
      }
    }`

    const variables = { perPage: count }
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
        throw new Error("Failed to fetch popular anime");
    }

    return data.data.Page.media
        .filter((anime: any) => {
            // Filter out adult content (hentai, pornographic)
            if (anime.isAdult) return false

            // Filter out Hentai genre explicitly
            if (anime.genres?.includes('Hentai')) return false

            return true
        })
        .map((anime: any) => ({
            id: anime.id,
            title: anime.title.english || anime.title.romaji,
            image: anime.coverImage.large,
            rating: anime.averageScore
        }))
}

/**
 * Search for anime by query string
 * Filters out adult content and prioritizes relevant results
 */
export async function searchAnime(searchQuery: string, limit: number = 24) {
    const query = `
    query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
          id
          title {
            romaji
            english
          }
          coverImage {
            large
          }
          averageScore
          isAdult
          genres
          format
          popularity
          status
          episodes
          startDate {
            year
          }
        }
      }
    }`

    const variables = { search: searchQuery, perPage: Math.min(limit * 2, 48) } // Get more results to filter
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

    // Calculate relevance score for each anime
    const scoredResults = data.data.Page.media
        .filter((anime: any) => {
            // Filter out adult content (hentai, pornographic)
            if (anime.isAdult) return false
            if (anime.genres?.includes('Hentai')) return false

            // Filter out music videos
            if (anime.format === 'MUSIC') return false

            return true
        })
        .map((anime: any) => {
            let relevanceScore = 0

            // Format weights
            const formatWeights: Record<string, number> = {
                'TV': 100,
                'MOVIE': 80,
                'TV_SHORT': 70,
                'OVA': 60,
                'ONA': 60,
                'SPECIAL': 40,
                'MUSIC': 10
            }
            relevanceScore += formatWeights[anime.format] || 50

            // Popularity boost (normalize to 0-100 scale)
            if (anime.popularity) {
                relevanceScore += Math.min(anime.popularity / 1000, 100)
            }

            // Status preference (finished series are more relevant)
            if (anime.status === 'FINISHED') relevanceScore += 20
            if (anime.status === 'RELEASING') relevanceScore += 30

            // Episode count (prefer substantial series over one-shots)
            if (anime.episodes) {
                if (anime.episodes >= 12) relevanceScore += 30
                else if (anime.episodes >= 6) relevanceScore += 15
                else if (anime.episodes === 1) relevanceScore -= 10
            }

            // Rating boost
            if (anime.averageScore) {
                relevanceScore += anime.averageScore / 10
            }

            // Recency factor (slight boost for newer anime)
            if (anime.startDate?.year) {
                const yearsSinceRelease = new Date().getFullYear() - anime.startDate.year
                if (yearsSinceRelease <= 5) relevanceScore += 10
                if (yearsSinceRelease <= 2) relevanceScore += 10
            }

            return {
                ...anime,
                relevanceScore
            }
        })

    // Sort by relevance score
    scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore)

    // Deduplicate similar titles (keep highest scored version)
    const deduped = deduplicateTitles(scoredResults)

    // Return top results
    return deduped
        .slice(0, limit)
        .map((anime: any) => ({
            id: anime.id,
            title: anime.title.english || anime.title.romaji,
            image: anime.coverImage.large,
            rating: anime.averageScore
        }))
}

/**
 * Remove duplicate/similar anime titles
 * Keeps the highest scored version of similar titles
 */
function deduplicateTitles(results: any[]): any[] {
    const seen = new Set<string>()
    const deduped: any[] = []

    for (const anime of results) {
        const normalizedTitle = normalizeTitle(anime.title.english || anime.title.romaji)

        // Check if we've seen a very similar title
        let isDuplicate = false
        for (const seenTitle of seen) {
            if (areTitlesSimilar(normalizedTitle, seenTitle)) {
                isDuplicate = true
                break
            }
        }

        if (!isDuplicate) {
            seen.add(normalizedTitle)
            deduped.push(anime)
        }
    }

    return deduped
}

/**
 * Normalize title for comparison
 */
function normalizeTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[^\w\s]/g, '') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
}

/**
 * Check if two titles are similar enough to be considered duplicates
 */
function areTitlesSimilar(title1: string, title2: string): boolean {
    // Exact match after normalization
    if (title1 === title2) return true

    // Check if one title is a substring of the other (handles "One Piece" vs "One Piece Film")
    const shorter = title1.length < title2.length ? title1 : title2
    const longer = title1.length < title2.length ? title2 : title1

    // If shorter title is at the start of longer title and difference is small
    if (longer.startsWith(shorter)) {
        const remainder = longer.substring(shorter.length).trim()
        // If remainder is just a number, year, or short word, consider it duplicate
        if (remainder.match(/^(film|movie|season|part|s\d+|\d+)$/i)) {
            return false // Keep these as they might be legitimate sequels
        }
    }

    return false
}

/**
 * Fetch comprehensive anime details for the detail page
 * Filters out adult content (hentai, pornographic)
 */
export async function fetchFullAnimeDetails(searchTerm: string) {
    const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME, isAdult: false) {
        id
        title {
          romaji
          english
        }
        bannerImage
        coverImage {
          large
          extraLarge
        }
        description(asHtml: false)
        episodes
        status
        startDate {
          year
          month
          day
        }
        endDate {
          year
          month
          day
        }
        season
        seasonYear
        studios {
          nodes {
            name
          }
        }
        genres
        duration
        averageScore
        trailer {
          id
          site
        }
        externalLinks {
          url
          site
        }
        streamingEpisodes {
          title
          thumbnail
          url
          site
        }
        airingSchedule {
          nodes {
            airingAt
            timeUntilAiring
            episode
          }
        }
        isAdult
      }
    }`

    const variables = { search: searchTerm }
    const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
        throw new Error("AniList API returned an error: " + response.status);
    }

    const data = await response.json()

    if (!data?.data?.Media) {
        throw new Error("Anime not found in AniList response");
    }

    const media = data.data.Media

    // Additional safety check - block adult content
    if (media.isAdult || media.genres?.includes('Hentai')) {
        throw new Error("This content is not available");
    }

    return {
        id: media.id,
        title: media.title.english || media.title.romaji,
        romajiTitle: media.title.romaji,
        bannerImage: media.bannerImage || media.coverImage.extraLarge,
        coverImage: media.coverImage.large,
        description: (media.description || "No description available")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/\(Source:.*?\)/gi, "")
            .replace(/\s*\n\s*/g, "\n")
            .trim(),
        episodes: media.episodes,
        status: media.status,
        aired: formatAirDate(media.startDate, media.endDate),
        premiered: media.season && media.seasonYear ? `${media.season} ${media.seasonYear}` : null,
        studios: media.studios.nodes.map((s: any) => s.name).join(", "),
        genres: media.genres,
        duration: media.duration ? `${media.duration} min per ep` : null,
        rating: media.averageScore,
        trailer: media.trailer ? {
            id: media.trailer.id,
            site: media.trailer.site
        } : null,
        externalLinks: media.externalLinks?.[0] || null,
        streamingLinks: (media.externalLinks || [])
            .filter((link: any) => STREAMING_SITES.some(site =>
                link.site.toLowerCase().includes(site.toLowerCase())
            ))
            .slice(0, 3)
            .map((link: any) => ({ url: link.url, site: link.site })),
        streamingEpisodes: media.streamingEpisodes || [],
        airingSchedule: media.airingSchedule?.nodes || []
    }
}

/**
 * Fetch similar/recommended anime from AniList
 * Filters out adult content (hentai, pornographic)
 */
export async function fetchSimilarAnime(animeId: number, limit: number = 4) {
    const query = `
    query ($id: Int, $perPage: Int) {
      Media(id: $id, type: ANIME) {
        recommendations(perPage: $perPage, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              id
              title {
                romaji
                english
              }
              coverImage {
                large
              }
              averageScore
              isAdult
              genres
            }
          }
        }
      }
    }`

    const variables = { id: animeId, perPage: limit }
    const response = await fetch("https://graphql.anilist.co", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
        next: { revalidate: 86400 } // Cache for 24 hours
    })

    if (!response.ok) {
        throw new Error("AniList API returned an error: " + response.status);
    }

    const data = await response.json()

    if (!data?.data?.Media?.recommendations?.nodes) {
        return []
    }

    return data.data.Media.recommendations.nodes
        .filter((node: any) => {
            if (!node.mediaRecommendation) return false

            const rec = node.mediaRecommendation

            // Filter out adult content (hentai, pornographic)
            if (rec.isAdult) return false

            // Filter out Hentai genre explicitly
            if (rec.genres?.includes('Hentai')) return false

            return true
        })
        .map((node: any) => ({
            id: node.mediaRecommendation.id,
            title: node.mediaRecommendation.title.english || node.mediaRecommendation.title.romaji,
            image: node.mediaRecommendation.coverImage.large,
            rating: node.mediaRecommendation.averageScore
        }))
}

/**
 * Helper function to format air dates
 */
function formatAirDate(startDate: any, endDate: any): string {
    if (!startDate?.year) return "Unknown"

    const start = startDate.month && startDate.day
        ? `${getMonthName(startDate.month)} ${startDate.day}, ${startDate.year}`
        : `${startDate.year}`

    if (!endDate?.year) return `${start} to ?`

    const end = endDate.month && endDate.day
        ? `${getMonthName(endDate.month)} ${endDate.day}, ${endDate.year}`
        : `${endDate.year}`

    return `${start} to ${end}`
}

function getMonthName(month: number): string {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return months[month - 1] || ""
}
