/**
 * Convert anime title to URL-safe slug
 * Example: "Frieren: Beyond Journey's End" -> "frieren-beyond-journeys-end"
 */
export function slugify(text: string): string {
    return text
        .toLowerCase()
        .trim()
        // Remove special characters except spaces and hyphens
        .replace(/[^\w\s-]/g, '')
        // Replace multiple spaces/hyphens with single hyphen
        .replace(/[\s_-]+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, '')
}

/**
 * Convert slug back to search query for AniList
 * Example: "frieren-beyond-journeys-end" -> "frieren beyond journeys end"
 */
export function unslugify(slug: string): string {
    return slug.replace(/-/g, ' ')
}
