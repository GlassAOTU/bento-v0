/**
 * Utilities for managing recent searches in localStorage
 */

export interface RecentSearchResult {
    title: string
    image: string
    reason: string
    description: string
}

export interface RecentSearch {
    description: string
    tags: string[]
    timestamp: number
    results: RecentSearchResult[]
}

const STORAGE_KEY = 'recentSearches'
const MAX_SEARCHES = 10
const MAX_RESULTS_PER_SEARCH = 3

/**
 * Save a new search to localStorage
 */
export function saveRecentSearch(
    description: string,
    tags: string[],
    results: RecentSearchResult[]
): void {
    try {
        const searches = getRecentSearches()

        const newSearch: RecentSearch = {
            description: description.trim(),
            tags,
            timestamp: Date.now(),
            results: results.slice(0, MAX_RESULTS_PER_SEARCH) // Only store first 3 results
        }

        // Add to beginning of array
        searches.unshift(newSearch)

        // Keep only max number of searches
        if (searches.length > MAX_SEARCHES) {
            searches.pop()
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(searches))
    } catch (error) {
        console.error('Failed to save recent search:', error)
    }
}

/**
 * Get all recent searches from localStorage
 */
export function getRecentSearches(): RecentSearch[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (!stored) return []

        const searches = JSON.parse(stored) as RecentSearch[]
        return searches
    } catch (error) {
        console.error('Failed to get recent searches:', error)
        return []
    }
}

/**
 * Clear all recent searches
 */
export function clearRecentSearches(): void {
    try {
        localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
        console.error('Failed to clear recent searches:', error)
    }
}

/**
 * Format timestamp to readable string
 */
export function formatSearchTimestamp(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (days > 7) {
        return new Date(timestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        })
    } else if (days > 0) {
        return days === 1 ? 'Yesterday' : `${days} days ago`
    } else if (hours > 0) {
        return hours === 1 ? '1 hour ago' : `${hours} hours ago`
    } else if (minutes > 0) {
        return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`
    } else {
        return 'Just now'
    }
}
