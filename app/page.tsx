'use client'

import Image from "next/image"
import { use, useEffect, useState } from "react"
import { ScaleLoader } from "react-spinners"
import { fetchAnimeDetails } from "@/lib/anilist"
import { TAGS } from "@/lib/constants"
import TagButton from "@/components/tag-button"
import AnimeCard from "@/components/anime-card"
import BottomButton from "@/components/bottom-button"
import ErrorBox from "@/components/error-box"
import LimitPopup from "@/components/limit-popup"
import WaitlistBox from "@/components/waitlist-box"

export default function Home() {

    const [selectedTags, setSelectedTags] = useState<string[]>([])  // state of empty array of string, initalized to an empty array
    const [customTag, setCustomTag] = useState("")   // stores user tag input
    const [description, setDescription] = useState("")
    const [recommendations, setRecommendations] = useState<AnimeRecommendation[]>([]);
    const [seenTitles, setSeenTitles] = useState<string[]>([]); // stores titles of games already seen
    const [isLoading, setIsLoading] = useState(false)
    const [isRateLimited, setIsRateLimited] = useState(false);
    const [error, setError] = useState("")
    const [isWelcomePopupOpen, setWelcomePopupOpen] = useState(false)
    const [isLimitPopupOpen, setLimitPopupOpen] = useState(false)
    const [isWaitlistBoxOpen, setWaitlistBoxOpen] = useState(false)

    const isButtonDisabled = isLoading || (selectedTags.length === 0 && description.trim() === "") || isRateLimited;


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

    useEffect(() => {
        const hasVisited = localStorage.getItem('hasVisitedBefore');
        const hasDismissedWaitlist = localStorage.getItem('waitlistDismissed');
        const isStillRateLimited = localStorage.getItem('rateLimited');

        if (!hasVisited) {
            setWelcomePopupOpen(true);
        }

        if (!hasDismissedWaitlist) {
            setWaitlistBoxOpen(true);
        }

        if (isStillRateLimited) {
            setIsRateLimited(true);
            openLimitPopup();
        }
    }, []);

    const handleWelcomePopup = () => {
        setWelcomePopupOpen(false);
        localStorage.setItem('hasVisitedBefore', 'true');
    };

    const openLimitPopup = () => {
        setLimitPopupOpen(true);
    };

    const closeLimitPopup = () => {
        setLimitPopupOpen(false);
    };

    const openWaitlistBox = () => {
        setWaitlistBoxOpen(true);
    };

    const closeWaitlistBox = () => {
        setWaitlistBoxOpen(false);
        localStorage.setItem('waitlistDismissed', 'true')
    };

    type AnimeRecommendation = {
        title: string;
        reason: string;
        description: string;
        image: string;
        externalLinks: { url: string; site: string } | null;
    };

    // Check if the title is already in the seenTitles array
    const addSeenTitle = (title: string) => {
        setSeenTitles((prev) =>
            prev.includes(title) ? prev : [...prev, title]
        );
    }

    const handleGetRecommendations = async () => {
        if (isButtonDisabled) {
            if (isRateLimited) {
                openLimitPopup();
            }
            return;
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
                localStorage.setItem('rateLimited', 'true'); // <- NEW
                openLimitPopup();
                setError("Rate limit reached.");
                return;
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
                    const { description, bannerImage, externalLinks } = await fetchAnimeDetails(title);

                    animeFinish.push({
                        title,
                        reason: reason?.trim() || "No reason provided",
                        description,
                        image: bannerImage,
                        externalLinks,
                    });

                    newSeenTitles.push(title);
                } catch (e) {
                    console.warn(`Failed to fetch details for: ${title}`, e);
                }
            }

            setSeenTitles(newSeenTitles);
            setRecommendations(prev => [...animeFinish, ...prev]);

        } catch (err) {
            console.error(err);
            setError("Failed to get recommendations. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="bg-[#fffcf8]">
            <div className="min-h-screen bg-[#fffcf8] text-[#4a4023] pb-16 font-sans">

                <div>
                    {isWelcomePopupOpen && (
                        <div className="fixed top-0 left-0 w-full h-full bg-black/50 flex justify-center items-center z-50">
                            <div className="relative">
                                <Image src="/images/welcome-popup.png" alt="Popup" width={900} height={600} />
                                <button onClick={handleWelcomePopup} className="absolute top-0 right-0 p-2 m-4 rounded-full font-mono border-2 text-xs sm:text-md border-[#4a4023]/50 transition-all"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className=""><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
                            </div>
                        </div>
                    )}
                </div>

                {/* banner */}
                <section className="w-full flex justify-center">
                    <div className="relative w-full max-w-[1200px]">
                        <Image
                            src="/images/header-image.png"
                            alt="Banner"
                            width={600}
                            height={300}
                            className="w-full h-auto mb-10 [mask-image:linear-gradient(to_top,transparent_0%,black_10%)]"
                        />
                        {/* <a href="https://www.google.com/" target="_blank" rel="noopener noreferrer">
                            <button className="absolute left-[1%] top-[60%] sm:left-[9%] md:left-[10%] lg:left-[12%] px-6 py-2 bg-black text-white rounded-md">
                                Waitlist
                            </button>
                        </a> */}

                    </div>
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
                                {TAGS.map((tag) => {
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
                                    .filter((tag) => !TAGS.includes(tag)) // Only show truly custom tags
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
                        className={`w-full mx-auto py-4 rounded-lg font-mono transition-colors text-white flex items-center justify-center gap-2
    ${isButtonDisabled
                                ? "bg-[#000000] cursor-not-allowed"
                                : "bg-[#4a4023] hover:bg-[#3b341c] cursor-pointer"}
  `}
                        disabled={isButtonDisabled}
                        onClick={handleGetRecommendations}
                    >
                        {isLoading ? (
                            <>
                                <ScaleLoader height={20} color="#ffffff" />
                                Getting Recommendations...
                            </>
                        ) : (
                            "Get Recommendations"
                        )}
                    </button>


                    {isLimitPopupOpen && (
                        <LimitPopup
                            message="Rate limit reached. Please wait before trying again."
                            onClose={closeLimitPopup}
                        />
                    )}
                    {/* {error && ErrorBox({ message: error })} */}

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

            {isWaitlistBoxOpen && <WaitlistBox onDismiss={closeWaitlistBox} />}
            <BottomButton />


        </div>
    )
}
