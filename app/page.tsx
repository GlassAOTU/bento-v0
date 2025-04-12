'use client'

import Image from "next/image"
import { useState } from "react"
import { fetchAnimeDetails } from "./api/anilist/route"
import TagButton from "@/components/tag-button"
import AnimeCard from "@/components/anime-card"

export default function Home() {

    const [selectedTags, setSelectedTags] = useState<string[]>([])  // state of empty array of string, initalized to an empty array
    const [customTag, setCustomTag] = useState("")   // stores user tag input
    const [description, setDescription] = useState("")
    const [recommendations, setRecommendations] = useState<{ title: string; description: string; image: string; externalLinks: { url: string; site: string } | null }[]>([]);
    const [seenTitles, setSeenTitles] = useState<string[]>([]); // stores titles of games already seen
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

    const addSeenTitle = (title: string) => {
        if (!seenTitles.includes(title)) {   // checks to see if the seenTitles array already included the title
            setSeenTitles([...seenTitles, title])    // adds title to the end seenTitles array
        }
    }

    const handleGetRecommendations = async () => {
        setIsLoading(true);
        setError("");

        try {
            const response = await fetch("/api/recommendations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ description, tags: selectedTags, seenTitles }),
            });

            if (!response.ok) throw new Error("Failed to get recommendations");

            const data = await response.json();
            const animeList: string[] = data.recommendations.split(" | ");
            const newSeenTitles = [...seenTitles];
            const animeFinish: { title: string; description: string; image: string; externalLinks: { url: string; site: string } | null }[] = [];

            for (const title of animeList) {
                if (newSeenTitles.includes(title)) continue;

                try {
                    const { description, coverImage, externalLinks } = await fetchAnimeDetails(title);
                    animeFinish.push({ title, description, image: coverImage, externalLinks });
                    newSeenTitles.push(title);
                } catch (e) {
                    console.warn(`Failed to fetch details for: ${title}`, e);
                }
            }
            setSeenTitles(newSeenTitles);
            setRecommendations(prev => [...animeFinish, ...prev]);
        } catch (err) {
            setError("Failed to get recommendations. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fffcf8] text-[#4a4023] pb-16 font-sans">

            {/* banner */}
            <section className="w-full flex justify-center">
                <Image
                    src="/images/banner.png"
                    alt="Banner"
                    width={600} // just a reference size
                    height={300}
                    className="w-full max-w-[1200px] h-auto mb-6 [mask-image:linear-gradient(to_top,transparent_0%,black_10%)]"
                />
            </section>

            {/* aligning and centering page */}
            <div className="max-w-4xl flex flex-col mx-auto gap-8 px-10">

                {/* user description section */}
                <section className="">
                    <p className="mb-2 text-xl">Share a short description of what you're looking for / choose some tags.</p>
                    <p className="mb-4 text-xl">We take care of the rest</p>

                    {/* user input */}
                    <input
                        placeholder="Write your description..."
                        className="w-full rounded-md border font-mono border-[#4a4023]/50 px-4 py-6 bg-white focus:outline-none focus:border-[#4a4023] hover:border-[#4a4023] transition-colors"
                        value={description} onChange={(e) => setDescription(e.target.value)}
                    />
                </section>

                <hr />

                {/* Tags Section */}
                <section className="">
                    <div className="flex flex-col justify-between gap-3">
                        <p className="text-xl">Tags (Choose up to {5 - selectedTags.length})</p>
                        <div className="flex flex-wrap gap-x-3 gap-y-2">
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

                            {/* Render custom tags that weren't in the original list */}
                            {selectedTags
                                .filter((tag) => !tags.includes(tag)) // Only show truly custom tags
                                .map((tag) => (
                                    <TagButton
                                        key={tag}
                                        label={tag}
                                        isSelected={selectedTags.includes(tag)}
                                        onClick={() => handleTagClick(tag)}
                                    />

                                ))}

                            {/* Custom tag input (only if less than 5 tags are selected) */}
                            {selectedTags.length < 5 && (
                                <input
                                    type="text"
                                    placeholder="Type a tag..."
                                    value={customTag}
                                    onChange={handleInputChange}
                                    onKeyDown={handleInputKeyDown}
                                    className="text-sm font-mono px-2 py-1.5 rounded-md border border-[#4a4023]/50 w-48 focus:outline-none focus:border-[#4a4023] hover:border-[#4a4023] transition-colors"
                                />
                            )}
                        </div>
                    </div>
                </section>

                <hr />

                {/* Search Button */}
                <button
                    className={`w-full mx-auto py-4 rounded-lg font-mono transition-colors text-white
    ${isLoading || (!description && selectedTags.length === 0)
                            ? "bg-[#000000] cursor-not-allowed"
                            : "bg-[#4a4023] hover:bg-[#3b341c] cursor-pointer"}
  `}
                    disabled={isLoading || (!description && selectedTags.length === 0)}
                    onClick={handleGetRecommendations}
                >
                    {isLoading ? "Getting Recommendations..." : "Get Recommendations"}
                </button>
                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

                <hr />

                {/* recommendation cards */}
                <section className="flex flex-col">
                    {recommendations.map((item, index) => (
                        <div key={index}>
                            <AnimeCard item={item} />
                            {index !== recommendations.length - 1 && (
                                <hr className="my-5 border-t border-stone-300" />
                            )}
                        </div>
                    ))}
                </section>


            </div>
        </div>
    )
}
