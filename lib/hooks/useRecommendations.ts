import { useState } from 'react';
import { fetchAnimeDetails } from "@/lib/anilist";
import { normalizeTitleForMatch } from "@/lib/recommendations/normalizeTitle";
import {
    trackRecommendationQueryStarted,
    trackRecommendationQueryCompleted,
    trackRecommendationRateLimited,
    getAuthStatus
} from '@/lib/analytics/events';

// Helper to fetch TMDB backdrop image for a title (wide format for recommendation cards)
async function getTMDBImage(title: string): Promise<string | null> {
    const startTime = Date.now();
    try {
        const response = await fetch(`/api/anime/tmdb-lookup?title=${encodeURIComponent(title)}&type=backdrop`);
        const data = await response.json();
        // Use backdrop for wide cards, fall back to poster if no backdrop
        console.log("[useRecommendations] TMDB lookup", {
            title,
            ms: Date.now() - startTime,
            ok: response.ok
        });
        return data.backdrop_url || data.poster_url || null;
    } catch {
        console.log("[useRecommendations] TMDB lookup failed", {
            title,
            ms: Date.now() - startTime
        });
        return null;
    }
}

export type AnimeRecommendation = {
    title: string;
    reason: string;
    description: string;
    image: string;
    externalLinks: { url: string; site: string } | null;
    trailer: { id: string, site: string }| null;
};

type CachedRec = { title: string; reason: string }

const ABBREVIATION_MAP: Record<string, string> = {
    'jjk': 'Jujutsu Kaisen',
    'aot': 'Attack on Titan',
    'frieren': 'Frieren: Beyond Journey\'s End'
}

function extractMentionedTitles(description: string): string[] {
    const mentioned: string[] = []
    const lowerDesc = description.toLowerCase()

    for (const [abbr, fullTitle] of Object.entries(ABBREVIATION_MAP)) {
        if (lowerDesc.includes(abbr)) {
            mentioned.push(fullTitle)
        }
    }

    const patterns = [
        /(?:like|similar to|enjoyed|loved|want more|fans of|if you like)\s+["']?([^"',.\n]+)["']?/gi
    ]

    for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(description)) !== null) {
            const title = match[1].trim()
            if (title.length > 2 && title.length < 100) {
                mentioned.push(title)
            }
        }
    }

    const unique = new Set<string>()
    const results: string[] = []
    for (const title of mentioned) {
        const key = normalizeTitleForMatch(title)
        if (!key || unique.has(key)) continue
        unique.add(key)
        results.push(title)
    }

    return results
}

function isMentionedTitle(normalizedTitle: string, mentionedKeys: string[]): boolean {
    for (const key of mentionedKeys) {
        if (normalizedTitle === key) return true
        if (normalizedTitle.startsWith(`${key} `)) return true
        if (normalizedTitle.startsWith(`${key}:`)) return true
    }
    return false
}

export function useRecommendations(initialRecommendations: AnimeRecommendation[] = [], user?: any) {
    const [recommendations, setRecommendations] = useState<AnimeRecommendation[]>(initialRecommendations);
    const [seenTitles, setSeenTitles] = useState<string[]>([]);
    const [cachedRecs, setCachedRecs] = useState<CachedRec[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitInfo, setRateLimitInfo] = useState<{ message: string; resetAt: string | null } | null>(null);
    const [error, setError] = useState("");

    const addSeenTitle = (title: string) => {
        setSeenTitles((prev) =>
            prev.includes(title) ? prev : [...prev, title]
        );
    };

    const clearAll = () => {
        setRecommendations([]);
        setSeenTitles([]);
        setCachedRecs([]);
        setError("");
        sessionStorage.removeItem('recommendations_data');
        sessionStorage.removeItem('recommendations_history');
        sessionStorage.removeItem('recommendations_seenTitles');
        sessionStorage.removeItem('recommendations_description');
        sessionStorage.removeItem('recommendations_tags');
    };

    const loadFromShare = (recs: AnimeRecommendation[], titles: string[]) => {
        setRecommendations(recs);
        setSeenTitles(titles);
    };

    const getRecommendations = async (description: string, selectedTags: string[], append: boolean = false) => {

        // When appending with existing recommendations, allow even if description/tags seem empty
        // (they're stored in sessionStorage and the API will use seenTitles)
        const hasExistingRecs = recommendations.length > 0
        const hasValidInput = selectedTags.length > 0 || description.trim() !== ""

        if (isLoading || isRateLimited) {
            if (isRateLimited) {
                return { error: "Rate limited" };
            }
            return { error: "Loading" };
        }

        if (!hasValidInput && !(append && hasExistingRecs)) {
            return { error: "Invalid input" };
        }

        // If appending and we have enough cached recs, use cache instead of API
        if (append && cachedRecs.length >= 7) {
            setIsLoading(true);
            try {
                const toDisplay = cachedRecs.slice(0, 7);
                const toCache = cachedRecs.slice(7);
                const newSeenTitles = [...seenTitles];
                const normalizedSelected = new Set(newSeenTitles.map((title) => normalizeTitleForMatch(title)));
                const animeFinish: AnimeRecommendation[] = [];

                const detailPromises = toDisplay.map(async ({ title, reason }) => {
                    try {
                        const { description, externalLinks, trailer, titleEnglish } = await fetchAnimeDetails(title);
                        const tmdbImage = await getTMDBImage(title);

                        if (!tmdbImage) {
                            newSeenTitles.push(title);
                            return null;
                        }

                        const displayTitle = titleEnglish || title;
                        const displayKey = normalizeTitleForMatch(displayTitle);
                        if (displayKey && normalizedSelected.has(displayKey)) {
                            newSeenTitles.push(displayTitle);
                            return null;
                        }

                        if (displayKey) {
                            normalizedSelected.add(displayKey);
                        }

                        newSeenTitles.push(displayTitle);

                        return {
                            title: displayTitle,
                            reason,
                            description,
                            image: tmdbImage,
                            externalLinks,
                            trailer
                        } as AnimeRecommendation;
                    } catch (e) {
                        console.warn(`[useRecommendations] Failed to fetch details for: ${title}`, e);
                        newSeenTitles.push(title);
                        return null;
                    }
                });

                for (const promise of detailPromises) {
                    promise.then((result) => {
                        if (!result) return;
                        animeFinish.push(result);
                        setRecommendations((prev) => [result, ...prev]);
                    });
                }

                await Promise.allSettled(detailPromises);

                setCachedRecs(toCache);
                setSeenTitles(newSeenTitles);

                return { success: true, data: animeFinish, fromCache: true };
            } finally {
                setIsLoading(false);
            }
        }

        const startTime = Date.now();

        // Track query started
        trackRecommendationQueryStarted({
            description: description.trim(),
            description_length: description.trim().length,
            tags_selected: selectedTags,
            tag_count: selectedTags.length,
            is_append: append,
            auth_status: getAuthStatus(user)
        });

        setIsLoading(true);
        setError("");

        try {
            const apiStart = Date.now();
            const response = await fetch("/api/recommendations/generate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description, tags: selectedTags, seenTitles }),
            });
            console.log("[useRecommendations] Recommendations API response", {
                ms: Date.now() - apiStart,
                status: response.status
            });


            if (response.status === 429) {
                const errorData = await response.json();
                setIsRateLimited(true);
                setRateLimitInfo({
                    message: errorData.error || "Rate limit reached.",
                    resetAt: errorData.resetAt || null
                });
                localStorage.setItem('rateLimited', 'true');
                localStorage.setItem('rateLimitInfo', JSON.stringify({
                    message: errorData.error,
                    resetAt: errorData.resetAt
                }));
                setError("Rate limit reached.");

                // Track rate limit event
                trackRecommendationRateLimited({
                    auth_status: getAuthStatus(user)
                });

                return { error: "Rate limit reached" };
            }

            if (!response.ok) {
                console.error('[useRecommendations] Response not ok:', response.status);
                throw new Error("Failed to fetch recommendations");
            }

            const data = await response.json();

            const newSeenTitles = [...seenTitles];
            const animeFinish: AnimeRecommendation[] = [];

            let parsedRecs: CachedRec[] = [];

            if (typeof data.recommendations === "string") {
                const raw = data.recommendations.replace(/\n/g, " ").trim();
                const entries = raw.split(/\s*\|\s*/g).filter(Boolean);
                parsedRecs = entries.map((entry: string) => {
                    const [rawTitle, reason] = entry.split(" ~ ");
                    const title = rawTitle?.replace(/^"(.*)"$/, "$1").trim() || "";
                    return {
                        title,
                        reason: reason?.trim() || ""
                    };
                }).filter((rec: CachedRec) => rec.title.length > 0);
            } else if (Array.isArray(data.recommendations)) {
                parsedRecs = data.recommendations.map((rec: any) => ({
                    title: typeof rec?.title === "string" ? rec.title.trim() : "",
                    reason: typeof rec?.reason === "string" ? rec.reason.trim() : ""
                })).filter((rec: CachedRec) => rec.title.length > 0);
            }

            const normalizedSeen = new Set(newSeenTitles.map((title) => normalizeTitleForMatch(title)));
            const mentionedTitles = extractMentionedTitles(description || "");
            const mentionedKeys = mentionedTitles.map((title) => normalizeTitleForMatch(title)).filter(Boolean);
            const normalizedBatch = new Set<string>();
            const filteredRecs: CachedRec[] = [];

            for (const rec of parsedRecs) {
                const normalizedTitle = normalizeTitleForMatch(rec.title);
                if (!normalizedTitle) continue;
                if (normalizedSeen.has(normalizedTitle)) continue;
                if (mentionedKeys.length && isMentionedTitle(normalizedTitle, mentionedKeys)) continue;
                if (normalizedBatch.has(normalizedTitle)) continue;

                normalizedBatch.add(normalizedTitle);
                filteredRecs.push({
                    title: rec.title,
                    reason: rec.reason || "Recommended based on your interest in similar anime"
                });
            }

            // Combine with any existing cache (for append scenarios)
            const allAvailable = append ? [...cachedRecs, ...filteredRecs] : filteredRecs;

            // Take first 7 for display, cache the rest
            const toDisplay = allAvailable.slice(0, 7);
            const toCache = allAvailable.slice(7);

            if (!append) {
                setRecommendations([]);
            }

            // Fetch details for the 7 we're displaying
            const normalizedSelected = new Set(normalizedSeen);

            const detailPromises = toDisplay.map(async ({ title, reason }) => {
                try {
                    const { description, externalLinks, trailer, titleEnglish } = await fetchAnimeDetails(title);
                    const tmdbImage = await getTMDBImage(title);

                    if (!tmdbImage) {
                        newSeenTitles.push(title);
                        return null;
                    }

                    const displayTitle = titleEnglish || title;
                    const displayKey = normalizeTitleForMatch(displayTitle);
                    if (displayKey && normalizedSelected.has(displayKey)) {
                        newSeenTitles.push(displayTitle);
                        return null;
                    }

                    if (displayKey) {
                        normalizedSelected.add(displayKey);
                    }

                    newSeenTitles.push(displayTitle);

                    return {
                        title: displayTitle,
                        reason,
                        description,
                        image: tmdbImage,
                        externalLinks,
                        trailer
                    } as AnimeRecommendation;
                } catch (e) {
                    console.warn(`[useRecommendations] Failed to fetch details for: ${title}`, e);
                    newSeenTitles.push(title);
                    return null;
                }
            });

            for (const promise of detailPromises) {
                promise.then((result) => {
                    if (!result) return;
                    animeFinish.push(result);
                    setRecommendations((prev) => append ? [result, ...prev] : [...prev, result]);
                });
            }

            await Promise.allSettled(detailPromises);

            // Update cache with remainder
            setCachedRecs(toCache);

            // Update state
            setSeenTitles(newSeenTitles);

            const endTime = Date.now();
            const responseTime = endTime - startTime;

            // Track query completed
            trackRecommendationQueryCompleted({
                description: description.trim(),
                tags_selected: selectedTags,
                results_count: animeFinish.length,
                response_time_ms: responseTime,
                auth_status: getAuthStatus(user)
            });

            return { success: true, data: animeFinish };
        } catch (err) {
            console.error('[useRecommendations] Error:', err);
            setError("Failed to get recommendations. Please try again later.");
            return { error: "Failed to get recommendations" };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        recommendations,
        seenTitles,
        cachedCount: cachedRecs.length,
        isLoading,
        isRateLimited,
        rateLimitInfo,
        error,
        getRecommendations,
        addSeenTitle,
        setRecommendations,
        setSeenTitles,
        clearAll,
        loadFromShare
    };
} 
