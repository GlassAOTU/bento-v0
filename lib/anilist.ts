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

    return {
        bannerImage: data?.data?.Media?.bannerImage || "",
        externalLinks: data?.data?.Media?.externalLinks?.[0] || null, // Grab only the first link
        description: (data?.data?.Media?.description || "No description available")
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<[^>]+>/g, "")
            .replace(/\(Source:.*?\)/gi, "")
            .replace(/\s*\n\s*/g, "\n")
            .trim(),
        trailer: data?.data?.Media?.trailer ? {
            id: data.data.Media.trailer.id,
            site: data.data.Media.trailer.site
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
            title: anime.title.romaji,
            image: anime.coverImage.large,
            rating: anime.averageScore
        }))
}

/**
 * Search for anime by query string
 * Filters out adult content (hentai, pornographic)
 */
export async function searchAnime(searchQuery: string, limit: number = 24) {
    const query = `
    query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: ANIME, sort: SEARCH_MATCH, isAdult: false) {
          id
          title {
            romaji
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

    const variables = { search: searchQuery, perPage: limit }
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
            title: anime.title.romaji,
            image: anime.coverImage.large,
            rating: anime.averageScore
        }))
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
        title: media.title.romaji,
        englishTitle: media.title.english,
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
        externalLinks: media.externalLinks?.[0] || null
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
            title: node.mediaRecommendation.title.romaji,
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
