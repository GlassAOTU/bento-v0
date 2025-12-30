/**
 * Centralized PostHog analytics event tracking
 * Type-safe event properties and consistent tracking across the app
 */

import posthog from 'posthog-js'

// ============================================================================
// AUTHENTICATION & IDENTITY
// ============================================================================

export function identifyUser(userId: string, properties: {
  email?: string
  created_at?: string
  total_watchlists?: number
  total_anime_saved?: number
  total_searches_performed?: number
}) {
  posthog.identify(userId, properties)
}

export function trackUserSignup(properties: {
  auth_method: 'email' | 'google' | 'other'
  is_first_session: boolean
}) {
  posthog.capture('user_signed_up', properties)
}

export function trackUserSignin(properties: {
  auth_method: 'email' | 'google' | 'other'
}) {
  posthog.capture('user_signed_in', properties)
}

export function trackUserSignout() {
  posthog.capture('user_signed_out')
}

// ============================================================================
// DISCOVER PAGE (HOMEPAGE)
// ============================================================================

export function trackDiscoverSearch(properties: {
  query: string
  results_count: number
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('discover_search', properties)
}

export function trackDiscoverSearchCleared() {
  posthog.capture('discover_search_cleared')
}

export function trackDiscoverAnimeCardClick(properties: {
  anime_id: number
  anime_title: string
  category: string
  position_in_carousel: number
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('discover_anime_card_click', properties)
}

export function trackCategoryCarouselScroll(properties: {
  category: string
  direction: 'left' | 'right'
}) {
  posthog.capture('category_carousel_scroll', properties)
}

export function trackDiscoverFormatFilter(properties: {
  format: 'all' | 'tv' | 'movie'
  had_query: boolean
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('discover_format_filter', properties)
}

// ============================================================================
// RECOMMENDATIONS PAGE
// ============================================================================

export function trackRecommendationQueryStarted(properties: {
  description: string
  description_length: number
  tags_selected: string[]
  tag_count: number
  is_append: boolean
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('recommendation_query_started', properties)
}

export function trackRecommendationQueryCompleted(properties: {
  description: string
  tags_selected: string[]
  results_count: number
  response_time_ms: number
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('recommendation_query_completed', properties)
}

export function trackRecommendationRateLimited(properties: {
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('recommendation_rate_limited', properties)
}

export function trackRecommendationAnimeCardClick(properties: {
  anime_title: string
  position_in_results: number
  query_description: string
  tags_used: string[]
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('recommendation_anime_card_click', properties)
}

export function trackRecommendationTrailerOpened(properties: {
  anime_title: string
  source_page: 'recommendations' | 'anime_detail'
}) {
  posthog.capture('recommendation_trailer_opened', properties)
}

export function trackRecommendationExternalLinkClicked(properties: {
  anime_title: string
  platform: string
  source_page: 'recommendations' | 'anime_detail'
}) {
  posthog.capture('recommendation_external_link_clicked', properties)
}

export function trackRecommendationSeeMoreClicked(properties: {
  current_results_count: number
  total_queries: number
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('recommendation_see_more_clicked', properties)
}

// ============================================================================
// ANIME DETAIL PAGE
// ============================================================================

export function trackAnimeDetailViewed(properties: {
  anime_id?: number
  anime_title: string
  referrer_page: string
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('anime_detail_viewed', properties)
}

export function trackAnimeTrailerWatched(properties: {
  anime_title: string
}) {
  posthog.capture('anime_trailer_watched', properties)
}

export function trackAnimeExternalLinkClicked(properties: {
  anime_title: string
  platform: string
}) {
  posthog.capture('anime_external_link_clicked', properties)
}

export function trackAnimeSimilarClicked(properties: {
  source_anime: string
  target_anime: string
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('anime_similar_clicked', properties)
}

// ============================================================================
// WATCHLIST JOURNEY (CONVERSION FUNNEL)
// ============================================================================

export function trackWatchlistAddClicked(properties: {
  anime_title: string
  source_page: 'discover' | 'recommendations' | 'anime_detail'
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('watchlist_add_clicked', properties)
}

export function trackWatchlistModalOpened(properties: {
  anime_title: string
  has_existing_watchlists: boolean
  watchlist_count: number
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('watchlist_modal_opened', properties)
}

export function trackWatchlistUnauthenticatedPrompt(properties: {
  anime_title: string
}) {
  posthog.capture('watchlist_unauthenticated_prompt', properties)
}

export function trackWatchlistAuthInitiated(properties: {
  anime_title_attempting_to_add: string
  auth_action: 'signup' | 'signin'
}) {
  posthog.capture('watchlist_auth_initiated', properties)
}

export function trackWatchlistAnimeAdded(properties: {
  anime_title: string
  watchlist_name: string
  watchlist_id: string
  auth_status: 'authenticated' | 'anonymous'
}) {
  posthog.capture('watchlist_anime_added', properties)
}

export function trackWatchlistCreated(properties: {
  watchlist_name: string
  watchlist_id: string
  created_with_anime: boolean
  anime_title?: string
}) {
  posthog.capture('watchlist_created', properties)
}

export function trackWatchlistDuplicatePrevented(properties: {
  anime_title: string
  watchlist_name: string
}) {
  posthog.capture('watchlist_duplicate_prevented', properties)
}

// ============================================================================
// MY ANIME PAGE
// ============================================================================

export function trackMyAnimePageViewed(properties: {
  active_tab: 'watchlist' | 'recent-searches'
  watchlist_count: number
  total_anime_count: number
}) {
  posthog.capture('my_anime_page_viewed', properties)
}

export function trackWatchlistTabSwitched(properties: {
  from_tab: 'watchlist' | 'recent-searches'
  to_tab: 'watchlist' | 'recent-searches'
}) {
  posthog.capture('watchlist_tab_switched', properties)
}

export function trackWatchlistExpanded(properties: {
  watchlist_name: string
  watchlist_id: string
  total_items: number
  action: 'expand' | 'collapse'
}) {
  posthog.capture('watchlist_expanded', properties)
}

export function trackWatchlistEdited(properties: {
  watchlist_name: string
  watchlist_id: string
}) {
  posthog.capture('watchlist_edited', properties)
}

export function trackRecentSearchClicked(properties: {
  description: string
  tags: string[]
  search_age_days: number
  results_count: number
}) {
  posthog.capture('recent_search_clicked', properties)
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getAuthStatus(user: any): 'authenticated' | 'anonymous' {
  return user ? 'authenticated' : 'anonymous'
}

export function getReferrerPage(): string {
  if (typeof window === 'undefined') return 'unknown'
  return document.referrer || 'direct'
}
