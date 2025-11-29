import { useState } from 'react';
import { fetchAnimeDetails } from "@/lib/anilist";
import {
    trackRecommendationQueryStarted,
    trackRecommendationQueryCompleted,
    trackRecommendationRateLimited,
    getAuthStatus
} from '@/lib/analytics/events';

// Helper to fetch TMDB backdrop image for a title (wide format for recommendation cards)
async function getTMDBImage(title: string): Promise<string | null> {
    try {
        const response = await fetch(`/api/anime/tmdb-lookup?title=${encodeURIComponent(title)}&type=backdrop`);
        const data = await response.json();
        // Use backdrop for wide cards, fall back to poster if no backdrop
        return data.backdrop_url || data.poster_url || null;
    } catch {
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

export function useRecommendations(initialRecommendations: AnimeRecommendation[] = [], user?: any) {
    const [recommendations, setRecommendations] = useState<AnimeRecommendation[]>(initialRecommendations);
    const [seenTitles, setSeenTitles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [rateLimitInfo, setRateLimitInfo] = useState<{ message: string; resetAt: string | null } | null>(null);
    const [error, setError] = useState("");

    const addSeenTitle = (title: string) => {
        setSeenTitles((prev) =>
            prev.includes(title) ? prev : [...prev, title]
        );
    };

    const getRecommendations = async (description: string, selectedTags: string[], append: boolean = false) => {

        if (isLoading || (selectedTags.length === 0 && description.trim() === "") || isRateLimited) {
            if (isRateLimited) {
                return { error: "Rate limited" };
            }
            return { error: "Invalid input" };
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
            const response = await fetch("/api/openai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description, tags: selectedTags, seenTitles }),
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

            const recommendations = data.recommendations.split(" | ");

            for (const rec of recommendations) {
                const [rawTitle, reason] = rec.split(" ~ ");
                const title = rawTitle.replace(/^"(.*)"$/, "$1").trim();

                if (newSeenTitles.includes(title)) {
                    continue;
                }

                try {
                    const { description, bannerImage, externalLinks, trailer } = await fetchAnimeDetails(title);

                    // Try to get TMDB image, fall back to AniList banner
                    const tmdbImage = await getTMDBImage(title);

                    animeFinish.push({
                        title,
                        reason: reason?.trim() || "No reason provided",
                        description,
                        image: tmdbImage || bannerImage,
                        externalLinks,
                        trailer
                    });

                    newSeenTitles.push(title);
                } catch (e) {
                    console.warn(`[useRecommendations] Failed to fetch details for: ${title}`, e);
                }
            }


            // Clear state when not appending (fresh search)
            if (!append) {
                setSeenTitles(newSeenTitles);
                setRecommendations(animeFinish);
            } else {
                setSeenTitles(newSeenTitles);
                setRecommendations(prev => [...animeFinish, ...prev]);
            }

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
        isLoading,
        isRateLimited,
        rateLimitInfo,
        error,
        getRecommendations,
        addSeenTitle,
        setRecommendations,
        setSeenTitles
    };
} 