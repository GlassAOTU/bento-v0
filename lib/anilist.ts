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
