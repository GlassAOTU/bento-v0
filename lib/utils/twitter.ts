export function openTwitterIntent(text: string): void {
    const tweetUrl = new URL('https://twitter.com/intent/tweet')
    tweetUrl.searchParams.set('text', text)
    window.open(tweetUrl.toString(), '_blank', 'noopener,noreferrer')
}

export function formatShareTweet(animeTitle: string, rating: number, url: string): string {
    const stars = '⭐'.repeat(rating)
    return `I gave ${animeTitle} ${stars}\n\n${url}\n\n(paste your image here)`
}

export function getAnimePageUrl(animeSlug: string): string {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}/anime/${animeSlug}`
}
