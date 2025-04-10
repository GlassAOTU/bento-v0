'use client'

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useState } from "react"
import { fetchAnimeDetails } from "./api/anilist/route"
import TagButton from "@/components/TagButton"

export default function Home() {

    const [selectedTags, setSelectedTags] = useState<string[]>([])  // state of empty array of string, initalized to an empty array
    const [customTag, setCustomTag] = useState("")   // stores user tag input
    const [description, setDescription] = useState("")
    const [recommendations, setRecommendations] = useState<{ title: string; description: string; image: string; streamingLink: { url: string; site: string } | null }[]>([]);
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState("")

    const tags = [
        "Shonen",
        "Isekai",
        "Fantasy",
        "Slice of Life",
        "Sci-Fi",
        "Romance",
        "Comedy",
        "Sports",
        "Horror",
        "Psychological",
        "Retro",
        "Long runners",
        "Quick watches"
    ]

    const handleTagClick = (tag: string) => {
        if (selectedTags.includes(tag)) {   // checks to see if the selectedTags array already included the tag
            setSelectedTags(selectedTags.filter(t => t !== tag))    // removes tag from the selectedTags array
        } else if (selectedTags.length < 5) {   // if there is space for more tags
            setSelectedTags([...selectedTags, tag])     // adds tag to the end selectedTags array
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomTag(e.target.value);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();  // Prevent accidental form submission

            const trimmedTag = customTag.trim();
            if (!trimmedTag) return; // Ignore empty input

            // Check for duplicates and tag limit
            if (!selectedTags.includes(trimmedTag) && selectedTags.length < 5) {
                setSelectedTags([...selectedTags, trimmedTag]); // Add new tag
            }

            setCustomTag(""); // Clear input
        }
    };

    const handleGetRecommendations = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description, tags: selectedTags }),
            });

            if (!response.ok) throw new Error("Failed to get recommendations");

            const data = await response.json();
            const animeList: string[] = data.recommendations.split(" | ");
            const animeFinish: { title: string; description: string; image: string; streamingLink: { url: string; site: string } | null }[] = [];

            for (const anime of animeList) {
                const [title, description] = anime.split(" ~ ");
                const { coverImage, streamingLink } = await fetchAnimeDetails(title);

                animeFinish.push({
                    title,
                    description,
                    image: coverImage,
                    streamingLink  // This is now a single link, not an array
                });
            }

            setRecommendations(animeFinish);
        } catch (err) {
            setError("Failed to get recommendations. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fffcf8] text-[#4a4023] pb-16">

            {/* Description Section */}
            <div className="max-w-3xl mx-auto px-6 mt-8">
                <p className="text-[#4a4023] mb-2">Share a short description of what you're looking for / choose some tags.</p>
                <p className="text-[#4a4023] mb-4">We take care of the rest</p>

                <Input
                    placeholder="Write your description..."
                    className="w-full border border-[#d9d9d9] rounded-lg p-4 bg-white text-[#4a4023]"
                />

                {/* Tags Section */}
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-[#4a4023]">Tags (Choose up to 5)</p>
                        <div className="relative">
                            <Input
                                placeholder="Choose custom tag"
                                className="border border-[#d9d9d9] rounded-lg px-3 py-1 bg-white text-[#4a4023]"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                                <TagButton
                                    key={tag}
                                    label={tag}
                                    isSelected={selectedTags.includes(tag)}
                                    onClick={() => handleTagClick(tag)}
                                />

                            );
                        })}
                    </div>
                </div>

                {/* Recommendations */}
                <div className="mt-12 space-y-6">
                    {[1, 2, 3, 4, 5].map((item) => (
                        <div key={item} className="flex gap-4 border border-[#d9d9d9] rounded-lg p-4 bg-white">
                            <div className="w-32 h-24 flex-shrink-0">
                                <Image
                                    src="/placeholder.svg?height=96&width=128"
                                    alt="Anime thumbnail"
                                    width={128}
                                    height={96}
                                    className="w-full h-full object-cover rounded-md"
                                />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-lg text-[#4a4023]">Frieren: Beyond Journey's End</h3>
                                <p className="text-sm text-[#4a4023] mt-1 line-clamp-4">
                                    During their decade-long quest to defeat the Demon King, the hero Himmel and his companions —priest
                                    Heiter, dwarf warrior Eisen, and elven mage Frieren—forge deep bonds through countless adventures,
                                    creating cherished memories for most of them. However, for Frieren, whose life spans over a thousand
                                    years, this time is but a fleeting moment. After their victory, she resumes her solitary pursuit of
                                    collecting spells, seemingly indifferent to their shared past. Yet, as the years pass and she
                                    witnesses the deaths of her former comrades, she comes to regret taking their presence for granted.
                                    Determined to understand human emotions and forge true connections, Frieren embarks on a new
                                    journey—one of self-discovery and genuine companionship.
                                </p>
                                <Button
                                    variant="outline"
                                    className="mt-2 rounded-md border border-[#d9d9d9] bg-white text-[#4a4023] hover:bg-[#f5f2ec] px-4 py-1 h-auto"
                                >
                                    Where to watch it
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
