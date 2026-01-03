import { useState } from 'react';
import { TAGS } from "@/lib/constants";
import TagButton from "@/components/TagButton";

interface TagSelectorProps {
    selectedTags: string[];
    onTagsChange: (tags: string[]) => void;
}

export default function TagSelector({ selectedTags, onTagsChange }: TagSelectorProps) {
    const [customTag, setCustomTag] = useState("");

    const handleTagClick = (tag: string) => {
        const isRemoving = selectedTags.includes(tag);

        // Create a new array with the updated tags
        let updatedTags;
        if (isRemoving) {
            updatedTags = selectedTags.filter(t => t !== tag);
        } else if (selectedTags.length < 5) {
            updatedTags = [...selectedTags, tag];
        } else {
            updatedTags = selectedTags;
        }

        // Update the state
        onTagsChange(updatedTags);
    };

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
                onTagsChange([...selectedTags, trimmedTag]); // Add new tag
            }

            setCustomTag(""); // Clear input
        }
    };

    return (
        <section className="px-10">
            <div className="flex flex-col justify-between gap-3">
                <p className="text-xl dark:text-gray-200">Tags (Choose up to 5)</p>
                <div className="flex flex-wrap gap-x-3 gap-y-2">
                    {TAGS.map((tag) => (
                        <TagButton
                            key={tag}
                            label={tag}
                            isSelected={selectedTags.includes(tag)}
                            onClick={() => handleTagClick(tag)}
                        />
                    ))}

                    {/* Render custom tags that weren't in the original list */}
                    {selectedTags
                        .filter((tag) => !TAGS.includes(tag))
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
                            className="text-sm px-2 py-1.5 rounded-md border border-mySecondary/50 dark:border-gray-600 w-48 bg-white dark:bg-darkInput dark:text-white dark:placeholder-gray-400 focus:outline-none focus:border-mySecondary hover:border-mySecondary transition-colors"
                        />
                    )}
                </div>
            </div>
        </section>
    );
} 