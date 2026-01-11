/**
 * TMDB (The Movie Database) API Helper Functions
 *
 * NOTE: TMDB API has AI/ML restrictions - data from this API should NOT be:
 * - Used for training ML models
 * - Sent to AI systems (like OpenAI)
 * - Used in chatbots or LLMs
 *
 * For our hybrid approach:
 * - Use TMDB for display (images, metadata)
 * - Use AniList for AI/ML (recommendations)
 */

const TMDB_API_KEY = process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

/**
 * Image size options for TMDB posters
 */
export const TMDB_POSTER_SIZES = {
    W92: 'w92',
    W154: 'w154',
    W185: 'w185',
    W342: 'w342',
    W500: 'w500',
    W780: 'w780',
    ORIGINAL: 'original'
} as const;

/**
 * Image size options for TMDB backdrops
 */
export const TMDB_BACKDROP_SIZES = {
    W300: 'w300',
    W780: 'w780',
    W1280: 'w1280',
    ORIGINAL: 'original'
} as const;

/**
 * Image size options for TMDB episode stills
 */
export const TMDB_STILL_SIZES = {
    W92: 'w92',
    W185: 'w185',
    W300: 'w300',
    ORIGINAL: 'original'
} as const;

/**
 * Build TMDB image URL
 */
export function getTMDBImageUrl(
    path: string | null,
    size: string = TMDB_POSTER_SIZES.W500
): string | null {
    if (!path) return null;
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/**
 * Search TMDB for anime by title
 * Filters for Japanese animation content only (requires BOTH Japanese AND animation)
 */
export async function searchTMDBAnime(query: string, limit: number = 5, type: 'tv' | 'movie' | 'both' = 'both') {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        query,
        language: 'en-US',
        include_adult: 'false',
        page: '1'
    });

    try {
        const results: any[] = [];

        // Search TV shows if type is 'tv' or 'both'
        if (type === 'tv' || type === 'both') {
            const tvResponse = await fetch(`${TMDB_BASE_URL}/search/tv?${params}`);
            if (tvResponse.ok) {
                const tvData = await tvResponse.json();
                const tvResults = tvData.results
                    .filter((show: any) => isJapaneseAnimation(show))
                    .map((show: any) => ({
                        tmdb_id: show.id,
                        title: show.name,
                        original_title: show.original_name,
                        overview: show.overview,
                        poster_path: show.poster_path,
                        backdrop_path: show.backdrop_path,
                        first_air_date: show.first_air_date,
                        release_date: show.first_air_date,
                        vote_average: show.vote_average,
                        vote_count: show.vote_count,
                        popularity: show.popularity,
                        origin_country: show.origin_country,
                        genre_ids: show.genre_ids,
                        media_type: 'tv'
                    }));
                results.push(...tvResults);
            }
        }

        // Search movies if type is 'movie' or 'both'
        if (type === 'movie' || type === 'both') {
            const movieResponse = await fetch(`${TMDB_BASE_URL}/search/movie?${params}`);
            if (movieResponse.ok) {
                const movieData = await movieResponse.json();
                const movieResults = movieData.results
                    .filter((movie: any) => isJapaneseAnimation(movie))
                    .map((movie: any) => ({
                        tmdb_id: movie.id,
                        title: movie.title,
                        original_title: movie.original_title,
                        overview: movie.overview,
                        poster_path: movie.poster_path,
                        backdrop_path: movie.backdrop_path,
                        first_air_date: movie.release_date,
                        release_date: movie.release_date,
                        vote_average: movie.vote_average,
                        vote_count: movie.vote_count,
                        popularity: movie.popularity,
                        origin_country: movie.origin_country || [],
                        genre_ids: movie.genre_ids,
                        media_type: 'movie'
                    }));
                results.push(...movieResults);
            }
        }

        // Sort by popularity and return top results
        return results
            .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
            .slice(0, limit);
    } catch (error) {
        console.error('Error searching TMDB:', error);
        throw error;
    }
}

/**
 * Check if content is Japanese animation (anime)
 * Accepts content that is Japanese OR animation (more permissive to handle incomplete TMDB metadata)
 */
function isJapaneseAnimation(content: any): boolean {
    // Check if it's Japanese content
    const isJapanese = content.origin_country?.includes('JP') ||
                       content.original_language === 'ja';

    // Check if it's animation (genre ID 16)
    const isAnimation = content.genre_ids?.includes(16);

    // Accept Japanese OR animation (TMDB search results often have incomplete metadata)
    return isJapanese || isAnimation;
}

/**
 * Get detailed information for a TMDB TV show
 */
export async function getTMDBShowDetails(tmdbId: number) {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: 'en-US',
        append_to_response: 'credits,external_ids,content_ratings,videos,images,recommendations,similar'
    });

    try {
        const response = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?${params}`);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            // Basic Info
            tmdb_id: data.id,
            title: data.name,
            original_title: data.original_name,
            tagline: data.tagline,
            overview: data.overview,

            // Dates & Status
            first_air_date: data.first_air_date,
            last_air_date: data.last_air_date,
            status: data.status,
            in_production: data.in_production,

            // Episodes & Seasons
            number_of_episodes: data.number_of_episodes,
            number_of_seasons: data.number_of_seasons,
            episode_run_time: data.episode_run_time,
            last_episode_to_air: data.last_episode_to_air,
            next_episode_to_air: data.next_episode_to_air,

            // Ratings
            vote_average: data.vote_average,
            vote_count: data.vote_count,
            popularity: data.popularity,

            // Images
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            poster_url: getTMDBImageUrl(data.poster_path, TMDB_POSTER_SIZES.W500),
            poster_url_original: getTMDBImageUrl(data.poster_path, TMDB_POSTER_SIZES.ORIGINAL),
            backdrop_url: getTMDBImageUrl(data.backdrop_path, TMDB_BACKDROP_SIZES.W1280),
            backdrop_url_original: getTMDBImageUrl(data.backdrop_path, TMDB_BACKDROP_SIZES.ORIGINAL),

            // Additional Data
            genres: data.genres,
            networks: data.networks,
            production_companies: data.production_companies,
            origin_country: data.origin_country,
            original_language: data.original_language,
            languages: data.languages,

            // External IDs
            external_ids: data.external_ids,

            // Content Ratings
            content_ratings: data.content_ratings?.results,

            // Cast & Crew
            credits: {
                cast: data.credits?.cast?.slice(0, 10),
                crew: data.credits?.crew?.slice(0, 10)
            },

            // Videos (all types - trailers, clips, behind the scenes, etc.)
            videos: data.videos?.results?.map((v: any) => ({
                id: v.id,
                key: v.key,
                name: v.name,
                type: v.type,
                site: v.site,
                official: v.official,
                published_at: v.published_at
            })),

            // All available images
            images: {
                backdrops: data.images?.backdrops?.slice(0, 5),
                posters: data.images?.posters?.slice(0, 5),
                logos: data.images?.logos?.slice(0, 5)
            },

            // Recommendations
            recommendations: data.recommendations?.results?.slice(0, 4).map((show: any) => ({
                tmdb_id: show.id,
                title: show.name,
                poster_path: show.poster_path,
                vote_average: show.vote_average
            })),

            // Similar shows
            similar: data.similar?.results?.slice(0, 4).map((show: any) => ({
                tmdb_id: show.id,
                title: show.name,
                poster_path: show.poster_path,
                vote_average: show.vote_average
            }))
        };
    } catch (error) {
        console.error('Error fetching TMDB show details:', error);
        throw error;
    }
}

/**
 * Get all available images for a show (for comparison)
 */
export async function getTMDBImages(tmdbId: number) {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        include_image_language: 'en,ja,null'
    });

    try {
        const response = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/images?${params}`);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            backdrops: data.backdrops?.map((img: any) => ({
                file_path: img.file_path,
                width: img.width,
                height: img.height,
                aspect_ratio: img.aspect_ratio,
                vote_average: img.vote_average,
                vote_count: img.vote_count,
                url_original: getTMDBImageUrl(img.file_path, TMDB_BACKDROP_SIZES.ORIGINAL),
                url_w1280: getTMDBImageUrl(img.file_path, TMDB_BACKDROP_SIZES.W1280),
                url_w780: getTMDBImageUrl(img.file_path, TMDB_BACKDROP_SIZES.W780)
            })),
            posters: data.posters?.map((img: any) => ({
                file_path: img.file_path,
                width: img.width,
                height: img.height,
                aspect_ratio: img.aspect_ratio,
                vote_average: img.vote_average,
                vote_count: img.vote_count,
                url_original: getTMDBImageUrl(img.file_path, TMDB_POSTER_SIZES.ORIGINAL),
                url_w500: getTMDBImageUrl(img.file_path, TMDB_POSTER_SIZES.W500),
                url_w342: getTMDBImageUrl(img.file_path, TMDB_POSTER_SIZES.W342)
            })),
            logos: data.logos?.map((img: any) => ({
                file_path: img.file_path,
                width: img.width,
                height: img.height,
                aspect_ratio: img.aspect_ratio,
                url_original: getTMDBImageUrl(img.file_path, TMDB_POSTER_SIZES.ORIGINAL)
            }))
        };
    } catch (error) {
        console.error('Error fetching TMDB images:', error);
        throw error;
    }
}

/**
 * Helper to convert TMDB rating (0-10) to AniList format (0-100)
 */
export function tmdbToAnilistRating(tmdbRating: number): number {
    return Math.round(tmdbRating * 10);
}

/**
 * Helper to format TMDB data in AniList-compatible format
 * (for hybrid display approach)
 */
export function formatTMDBForDisplay(tmdbData: any) {
    return {
        id: tmdbData.tmdb_id,
        title: tmdbData.title,
        image: getTMDBImageUrl(tmdbData.poster_path, TMDB_POSTER_SIZES.W500),
        imageOriginal: getTMDBImageUrl(tmdbData.poster_path, TMDB_POSTER_SIZES.ORIGINAL),
        backdrop: getTMDBImageUrl(tmdbData.backdrop_path, TMDB_BACKDROP_SIZES.W1280),
        backdropOriginal: getTMDBImageUrl(tmdbData.backdrop_path, TMDB_BACKDROP_SIZES.ORIGINAL),
        rating: tmdbToAnilistRating(tmdbData.vote_average)
    };
}

/**
 * Get season details with all episodes
 * Returns episode list with thumbnails, titles, air dates, etc.
 */
export async function getTMDBSeasonDetails(tmdbId: number, seasonNumber: number) {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: 'en-US'
    });

    try {
        const response = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}/season/${seasonNumber}?${params}`);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            season_id: data.id,
            name: data.name,
            overview: data.overview,
            season_number: data.season_number,
            air_date: data.air_date,
            poster_path: data.poster_path,
            poster_url: getTMDBImageUrl(data.poster_path, TMDB_POSTER_SIZES.W500),
            episode_count: data.episodes?.length || 0,

            // Episodes with full details
            episodes: data.episodes?.map((episode: any) => ({
                id: episode.id,
                name: episode.name,
                overview: episode.overview,
                episode_number: episode.episode_number,
                season_number: episode.season_number,
                air_date: episode.air_date,
                runtime: episode.runtime,
                vote_average: episode.vote_average,
                vote_count: episode.vote_count,

                // Episode thumbnail (still image)
                still_path: episode.still_path,
                still_url_w300: getTMDBImageUrl(episode.still_path, TMDB_STILL_SIZES.W300),
                still_url_original: getTMDBImageUrl(episode.still_path, TMDB_STILL_SIZES.ORIGINAL)
            })) || []
        };
    } catch (error) {
        console.error(`Error fetching TMDB season ${seasonNumber} details:`, error);
        throw error;
    }
}

/**
 * Get all seasons for a show (lightweight, no episode details)
 * Use this to see how many seasons are available
 */
export async function getTMDBSeasons(tmdbId: number) {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: 'en-US'
    });

    try {
        const response = await fetch(`${TMDB_BASE_URL}/tv/${tmdbId}?${params}`);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            number_of_seasons: data.number_of_seasons,
            number_of_episodes: data.number_of_episodes,
            seasons: data.seasons?.map((season: any) => ({
                id: season.id,
                name: season.name,
                season_number: season.season_number,
                episode_count: season.episode_count,
                air_date: season.air_date,
                poster_path: season.poster_path,
                poster_url: getTMDBImageUrl(season.poster_path, TMDB_POSTER_SIZES.W500)
            })) || []
        };
    } catch (error) {
        console.error('Error fetching TMDB seasons:', error);
        throw error;
    }
}

/**
 * Find the best TMDB match for an anime by title
 * Checks manual mappings first, then falls back to search
 * Returns the TMDB ID of the best match, or null if no good match found
 */
export async function findTMDBAnimeByTitle(animeTitle: string, anilistId?: number): Promise<number | null> {
    // Import manual mappings
    const { getTMDBByAnilistId, getTMDBByTitle } = await import('./anime-mappings');

    // Check manual mappings first (most reliable)
    if (anilistId) {
        const mappingById = getTMDBByAnilistId(anilistId);
        if (mappingById) {
            console.log(`Using manual mapping for AniList ID ${anilistId}: TMDB ${mappingById.tmdbId}`);
            return mappingById.tmdbId;
        }
    }

    const mappingByTitle = getTMDBByTitle(animeTitle);
    if (mappingByTitle) {
        console.log(`Using manual mapping for "${animeTitle}": TMDB ${mappingByTitle.tmdbId}`);
        return mappingByTitle.tmdbId;
    }

    // Fall back to search
    try {
        const results = await searchTMDBAnime(animeTitle, 5);

        if (!results || results.length === 0) {
            console.warn(`No TMDB results found for: ${animeTitle}`);
            return null;
        }

        // Return the first result's ID (best match based on TMDB's search ranking)
        return results[0].tmdb_id;
    } catch (error) {
        console.error(`Error finding TMDB anime for "${animeTitle}":`, error);
        return null;
    }
}

/**
 * Get TMDB movie details
 */
export async function getTMDBMovieDetails(tmdbId: number) {
    if (!TMDB_API_KEY) {
        throw new Error('TMDB_API_KEY is not configured');
    }

    const params = new URLSearchParams({
        api_key: TMDB_API_KEY,
        language: 'en-US',
        append_to_response: 'credits,external_ids,videos,images,recommendations,similar'
    });

    try {
        const response = await fetch(`${TMDB_BASE_URL}/movie/${tmdbId}?${params}`);

        if (!response.ok) {
            throw new Error(`TMDB API error: ${response.status}`);
        }

        const data = await response.json();

        return {
            tmdb_id: data.id,
            title: data.title,
            original_title: data.original_title,
            tagline: data.tagline,
            overview: data.overview,
            release_date: data.release_date,
            runtime: data.runtime,
            status: data.status,
            vote_average: data.vote_average,
            vote_count: data.vote_count,
            popularity: data.popularity,
            poster_path: data.poster_path,
            backdrop_path: data.backdrop_path,
            poster_url: getTMDBImageUrl(data.poster_path, TMDB_POSTER_SIZES.W500),
            poster_url_original: getTMDBImageUrl(data.poster_path, TMDB_POSTER_SIZES.ORIGINAL),
            backdrop_url: getTMDBImageUrl(data.backdrop_path, TMDB_BACKDROP_SIZES.W1280),
            backdrop_url_original: getTMDBImageUrl(data.backdrop_path, TMDB_BACKDROP_SIZES.ORIGINAL),
            genres: data.genres,
            production_companies: data.production_companies,
            origin_country: data.origin_country,
            original_language: data.original_language,
            external_ids: data.external_ids,
            credits: {
                cast: data.credits?.cast?.slice(0, 10),
                crew: data.credits?.crew?.slice(0, 10)
            },
            videos: data.videos?.results?.map((v: any) => ({
                id: v.id,
                key: v.key,
                name: v.name,
                type: v.type,
                site: v.site,
                official: v.official,
                published_at: v.published_at
            })),
            images: {
                backdrops: data.images?.backdrops?.slice(0, 5),
                posters: data.images?.posters?.slice(0, 5),
                logos: data.images?.logos?.slice(0, 5)
            },
            recommendations: data.recommendations?.results?.slice(0, 4).map((movie: any) => ({
                tmdb_id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average
            })),
            similar: data.similar?.results?.slice(0, 4).map((movie: any) => ({
                tmdb_id: movie.id,
                title: movie.title,
                poster_path: movie.poster_path,
                vote_average: movie.vote_average
            })),
            media_type: 'movie'
        };
    } catch (error) {
        console.error('Error fetching TMDB movie details:', error);
        throw error;
    }
}

/**
 * Get comprehensive anime data from TMDB including episodes
 * This is the main function for anime detail pages
 * Supports both TV shows and movies
 */
export async function getTMDBAnimeDetails(titleOrId: string | number, anilistId?: number) {
    // Import manual mappings
    const { getTMDBByAnilistId, getTMDBByTitle } = await import('./anime-mappings');

    let tmdbId: number | undefined;
    let mediaType: 'tv' | 'movie' = 'tv';

    // Check manual mappings first
    if (anilistId) {
        const mappingById = getTMDBByAnilistId(anilistId);
        if (mappingById) {
            tmdbId = mappingById.tmdbId;
            mediaType = mappingById.type;
            console.log(`Using manual mapping for AniList ID ${anilistId}: TMDB ${tmdbId} (${mediaType})`);
        }
    }

    // If no mapping by ID, check by title
    if (tmdbId === undefined && typeof titleOrId === 'string') {
        const mappingByTitle = getTMDBByTitle(titleOrId);
        if (mappingByTitle) {
            tmdbId = mappingByTitle.tmdbId;
            mediaType = mappingByTitle.type;
            console.log(`Using manual mapping for "${titleOrId}": TMDB ${tmdbId} (${mediaType})`);
        }
    }

    // If still no ID, search for it
    if (tmdbId === undefined) {
        if (typeof titleOrId === 'string') {
            const foundId = await findTMDBAnimeByTitle(titleOrId, anilistId);
            if (!foundId) {
                throw new Error(`Anime not found on TMDB: ${titleOrId}`);
            }
            tmdbId = foundId;

            // Try to determine media type from search results
            const searchResults = await searchTMDBAnime(titleOrId, 1);
            if (searchResults && searchResults.length > 0) {
                mediaType = searchResults[0].media_type || 'tv';
            }
        } else {
            tmdbId = titleOrId;
        }
    }

    // Handle movies differently from TV shows
    if (mediaType === 'movie') {
        const details = await getTMDBMovieDetails(tmdbId);

        return {
            tmdb_id: tmdbId,
            details: {
                ...details,
                // Normalize fields for compatibility with TV show format
                first_air_date: details.release_date,
                last_air_date: details.release_date,
                number_of_episodes: 1,
                number_of_seasons: 1,
                episode_run_time: details.runtime ? [details.runtime] : [],
                networks: details.production_companies,
                in_production: false
            },
            images: details.images,
            seasons: { number_of_seasons: 0, number_of_episodes: 1, seasons: [] },
            latestSeasonEpisodes: null,
            media_type: 'movie'
        };
    }

    // Handle TV shows (original behavior)
    const [details, images, seasons] = await Promise.all([
        getTMDBShowDetails(tmdbId),
        getTMDBImages(tmdbId),
        getTMDBSeasons(tmdbId)
    ]);

    // Get the latest season's episodes (skip season 0 which is usually specials)
    let latestSeasonEpisodes = null;
    const regularSeasons = seasons.seasons.filter((s: any) => s.season_number > 0);

    if (regularSeasons.length > 0) {
        const latestSeason = regularSeasons[regularSeasons.length - 1];
        latestSeasonEpisodes = await getTMDBSeasonDetails(tmdbId, latestSeason.season_number);
    }

    return {
        tmdb_id: tmdbId,
        details: { ...details, media_type: 'tv' },
        images,
        seasons,
        latestSeasonEpisodes,
        media_type: 'tv'
    };
}
