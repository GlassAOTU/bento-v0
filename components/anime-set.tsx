import { AnimeRecommendation } from "@/lib/hooks/useRecommendations";
import AnimeCard from "./anime-card";

export default function AnimeSet({ description, selectedTags, searchHistory, set, onTrailerClick }: { description: String, selectedTags: string[], searchHistory: { description: string; tags: string[]; }[], set: AnimeRecommendation[], onTrailerClick: any }) {
    return (
        <div className="">
            {/* <p className="py-36 font-extrabold text-2xl"> */}
                {/* {description},{" "}
                {selectedTags.join(", ")},{" "} */}
                {/* {searchHistory.map((h) => `${h.description} [${h.tags.join(", ")}]`).join(", ")} */}
            {/* </p> */}
            {set.map((item, idx) => (
                <div key={idx}>
                    <AnimeCard item={item} onTrailerClick={onTrailerClick} />
                    {idx !== set.length - 1 && (
                        <hr className="my-5 border-t" />
                    )}
                </div>
            ))}
        </div>
    )
}
