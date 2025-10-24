import { useState } from 'react';
import { fetchAnimeDetails } from "@/lib/anilist";
import posthog from 'posthog-js';

export type AnimeRecommendation = {
    title: string;
    reason: string;
    description: string;
    image: string;
    externalLinks: { url: string; site: string } | null;
    trailer: { id: string, site: string }| null;
};

export function useRecommendations() {
    const [recommendations, setRecommendations] = useState<AnimeRecommendation[]>([]);
    const [seenTitles, setSeenTitles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [error, setError] = useState("");

    const addSeenTitle = (title: string) => {
        setSeenTitles((prev) =>
            prev.includes(title) ? prev : [...prev, title]
        );
    };

    const getRecommendations = async (description: string, selectedTags: string[]) => {
        if (isLoading || (selectedTags.length === 0 && description.trim() === "") || isRateLimited) {
            if (isRateLimited) {
                return { error: "Rate limited" };
            }
            return { error: "Invalid input" };
        }

        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/openai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description, tags: selectedTags, seenTitles }),
            });

            if (response.status === 429) {
                setIsRateLimited(true);
                localStorage.setItem('rateLimited', 'true');
                setError("Rate limit reached.");
                return { error: "Rate limit reached" };
            }

            if (!response.ok) {
                throw new Error("Failed to fetch recommendations");
            }

            const data = await response.json();
            const newSeenTitles = [...seenTitles];
            const animeFinish: AnimeRecommendation[] = [];

            const recommendations = data.recommendations.split(" | ");

            for (const rec of recommendations) {
                const [rawTitle, reason] = rec.split(" ~ ");
                const title = rawTitle.replace(/^"(.*)"$/, "$1").trim();

                if (newSeenTitles.includes(title)) continue;

                try {
                    const { description, bannerImage, externalLinks, trailer } = await fetchAnimeDetails(title);

                    animeFinish.push({
                        title,
                        reason: reason?.trim() || "No reason provided",
                        description,
                        image: bannerImage,
                        externalLinks,
                        trailer
                    });

                    newSeenTitles.push(title);
                } catch (e) {
                    console.warn(`Failed to fetch details for: ${title}`, e);
                }
            }

            setSeenTitles(newSeenTitles);
            setRecommendations(prev => [...animeFinish, ...prev]);

            // Track the recommendation request with PostHog
            posthog.capture('submit_recommendations', {
                selected_tags: selectedTags,
                description: description.trim(),
                recommendations: animeFinish.map(rec => rec.title)
            });

            return { success: true, data: animeFinish };
        } catch (err) {
            console.error(err);
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
        error,
        getRecommendations,
        addSeenTitle
    };
} 