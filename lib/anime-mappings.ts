/**
 * Manual mappings for anime titles that commonly get mismatched with TMDB
 *
 * These mappings are used as overrides when the automatic TMDB search
 * returns incorrect results (e.g., non-anime content with similar titles)
 */

export interface TMDBMapping {
  tmdbId: number
  type: 'tv' | 'movie'
}

/**
 * Map AniList IDs to correct TMDB IDs
 * Use this when you have the AniList ID available
 */
export const ANILIST_TO_TMDB: Record<number, TMDBMapping> = {
  // Your Name (Kimi no Na wa)
  21519: { tmdbId: 372058, type: 'movie' },

  // A Silent Voice (Koe no Katachi)
  20954: { tmdbId: 378064, type: 'movie' },

  // Weathering With You (Tenki no Ko)
  106286: { tmdbId: 568160, type: 'movie' },

  // Spirited Away
  199: { tmdbId: 129, type: 'movie' },

  // My Neighbor Totoro
  523: { tmdbId: 8392, type: 'movie' },

  // Princess Mononoke
  164: { tmdbId: 128, type: 'movie' },

  // Howl's Moving Castle
  431: { tmdbId: 4935, type: 'movie' },

  // Grave of the Fireflies
  578: { tmdbId: 12477, type: 'movie' },

  // Akira
  47: { tmdbId: 149, type: 'movie' },

  // Ghost in the Shell (1995)
  43: { tmdbId: 9323, type: 'movie' },

  // Perfect Blue
  437: { tmdbId: 10494, type: 'movie' },

  // Paprika
  1943: { tmdbId: 4977, type: 'movie' },

  // Summer Wars
  5681: { tmdbId: 28874, type: 'movie' },

  // Wolf Children
  12355: { tmdbId: 110420, type: 'movie' },

  // The Girl Who Leapt Through Time
  2236: { tmdbId: 14069, type: 'movie' },

  // 5 Centimeters Per Second
  1689: { tmdbId: 38142, type: 'movie' },

  // Garden of Words
  16782: { tmdbId: 166350, type: 'movie' },

  // Suzume
  142770: { tmdbId: 916224, type: 'movie' },

  // The Boy and the Heron
  145006: { tmdbId: 508883, type: 'movie' },

  // Demon Slayer: Mugen Train
  112151: { tmdbId: 635302, type: 'movie' },

  // Jujutsu Kaisen 0
  131573: { tmdbId: 810693, type: 'movie' },

  // One Piece Film: Red
  139518: { tmdbId: 854646, type: 'movie' },

  // Dragon Ball Super: Broly
  101349: { tmdbId: 517814, type: 'movie' },

  // Dragon Ball Super: Super Hero
  142329: { tmdbId: 610150, type: 'movie' },
}

/**
 * Map normalized titles to correct TMDB IDs
 * Titles are lowercase and trimmed for consistent matching
 * Use this when searching by title string
 */
export const TITLE_TO_TMDB: Record<string, TMDBMapping> = {
  // Your Name variants
  'your name': { tmdbId: 372058, type: 'movie' },
  'your name.': { tmdbId: 372058, type: 'movie' },
  'kimi no na wa': { tmdbId: 372058, type: 'movie' },
  'kimi no na wa.': { tmdbId: 372058, type: 'movie' },

  // A Silent Voice variants
  'a silent voice': { tmdbId: 378064, type: 'movie' },
  'koe no katachi': { tmdbId: 378064, type: 'movie' },
  'the shape of voice': { tmdbId: 378064, type: 'movie' },

  // Weathering With You
  'weathering with you': { tmdbId: 568160, type: 'movie' },
  'tenki no ko': { tmdbId: 568160, type: 'movie' },

  // Studio Ghibli films
  'spirited away': { tmdbId: 129, type: 'movie' },
  'sen to chihiro no kamikakushi': { tmdbId: 129, type: 'movie' },
  'my neighbor totoro': { tmdbId: 8392, type: 'movie' },
  'tonari no totoro': { tmdbId: 8392, type: 'movie' },
  'princess mononoke': { tmdbId: 128, type: 'movie' },
  'mononoke hime': { tmdbId: 128, type: 'movie' },
  'howls moving castle': { tmdbId: 4935, type: 'movie' },
  "howl's moving castle": { tmdbId: 4935, type: 'movie' },
  'hauru no ugoku shiro': { tmdbId: 4935, type: 'movie' },
  'grave of the fireflies': { tmdbId: 12477, type: 'movie' },
  'hotaru no haka': { tmdbId: 12477, type: 'movie' },

  // Classic anime films
  'akira': { tmdbId: 149, type: 'movie' },
  'ghost in the shell': { tmdbId: 9323, type: 'movie' },
  'koukaku kidoutai': { tmdbId: 9323, type: 'movie' },
  'perfect blue': { tmdbId: 10494, type: 'movie' },
  'paprika': { tmdbId: 4977, type: 'movie' },

  // Mamoru Hosoda films
  'summer wars': { tmdbId: 28874, type: 'movie' },
  'sama wozu': { tmdbId: 28874, type: 'movie' },
  'wolf children': { tmdbId: 110420, type: 'movie' },
  'ookami kodomo no ame to yuki': { tmdbId: 110420, type: 'movie' },
  'the girl who leapt through time': { tmdbId: 14069, type: 'movie' },
  'toki wo kakeru shoujo': { tmdbId: 14069, type: 'movie' },

  // Makoto Shinkai films
  '5 centimeters per second': { tmdbId: 38142, type: 'movie' },
  'byousoku 5 centimeter': { tmdbId: 38142, type: 'movie' },
  'the garden of words': { tmdbId: 166350, type: 'movie' },
  'garden of words': { tmdbId: 166350, type: 'movie' },
  'kotonoha no niwa': { tmdbId: 166350, type: 'movie' },
  'suzume': { tmdbId: 916224, type: 'movie' },
  'suzume no tojimari': { tmdbId: 916224, type: 'movie' },

  // The Boy and the Heron
  'the boy and the heron': { tmdbId: 508883, type: 'movie' },
  'kimitachi wa dou ikiru ka': { tmdbId: 508883, type: 'movie' },

  // Popular anime movies
  'demon slayer mugen train': { tmdbId: 635302, type: 'movie' },
  'demon slayer: kimetsu no yaiba - mugen train': { tmdbId: 635302, type: 'movie' },
  'kimetsu no yaiba movie: mugen ressha-hen': { tmdbId: 635302, type: 'movie' },
  'jujutsu kaisen 0': { tmdbId: 810693, type: 'movie' },
  'gekijouban jujutsu kaisen 0': { tmdbId: 810693, type: 'movie' },
  'one piece film: red': { tmdbId: 854646, type: 'movie' },
  'one piece film red': { tmdbId: 854646, type: 'movie' },
  'dragon ball super: broly': { tmdbId: 517814, type: 'movie' },
  'dragon ball super broly': { tmdbId: 517814, type: 'movie' },
  'dragon ball super: super hero': { tmdbId: 610150, type: 'movie' },
}

/**
 * Map search terms directly to AniList IDs
 * This bypasses AniList search for known problematic queries
 * that tend to return wrong results (e.g., commercials instead of main movies)
 */
export const SEARCH_TO_ANILIST: Record<string, number> = {
  // Your Name - commonly returns commercials/CMs instead of the movie
  'your name': 21519,
  'your name.': 21519,
  'kimi no na wa': 21519,
  'kimi no na wa.': 21519,

  // A Silent Voice
  'a silent voice': 20954,
  'koe no katachi': 20954,
  'the shape of voice': 20954,

  // Weathering With You
  'weathering with you': 106286,
  'tenki no ko': 106286,

  // Studio Ghibli films
  'spirited away': 199,
  'my neighbor totoro': 523,
  'princess mononoke': 164,
  'howls moving castle': 431,
  "howl's moving castle": 431,
  'grave of the fireflies': 578,

  // Classic anime films
  'akira': 47,
  'ghost in the shell': 43,
  'perfect blue': 437,
  'paprika': 1943,

  // Makoto Shinkai films
  'suzume': 142770,
  '5 centimeters per second': 1689,
  'garden of words': 16782,
  'the garden of words': 16782,

  // The Boy and the Heron
  'the boy and the heron': 145006,
}

/**
 * Get AniList ID by search term (for known problematic searches)
 */
export function getAnilistBySearchTerm(searchTerm: string): number | null {
  const normalized = searchTerm.toLowerCase().trim()
  return SEARCH_TO_ANILIST[normalized] || null
}

/**
 * Get TMDB mapping by AniList ID
 */
export function getTMDBByAnilistId(anilistId: number): TMDBMapping | null {
  return ANILIST_TO_TMDB[anilistId] || null
}

/**
 * Get TMDB mapping by title (case-insensitive)
 */
export function getTMDBByTitle(title: string): TMDBMapping | null {
  const normalizedTitle = title.toLowerCase().trim()
  return TITLE_TO_TMDB[normalizedTitle] || null
}

/**
 * Check if we have a manual mapping for this anime
 */
export function hasManualMapping(anilistId?: number, title?: string): boolean {
  if (anilistId && ANILIST_TO_TMDB[anilistId]) return true
  if (title && TITLE_TO_TMDB[title.toLowerCase().trim()]) return true
  return false
}
