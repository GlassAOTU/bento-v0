export async function fetchAnimeDetails(animeTitle: string) {
  const query = `
    query ($search: String) {
      Media(search: $search, type: ANIME) {
        title {
          romaji
        }
        coverImage {
          large
        }
        streamingEpisodes {
          url
          site
        }
      }
    }
  `;

  const variables = { search: animeTitle };

  const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  return {
      coverImage: data?.data?.Media?.coverImage?.large || "",
      streamingLink: data?.data?.Media?.streamingEpisodes?.[0] || null // Grab only the first link
  };
}
