import Image from "next/image"
import { Button } from "@/components/ui/button"

export default function AnimeCard({ item }: { item: { title: string; description: string; image: string; streamingLink: { url: string; site: string } | null } }) {
    return (
        <div className="flex gap-6 rounded-lg">
            <div className="w-40 h-52 max-w-[160px] max-h-[208px] flex-shrink-0 rounded-md overflow-hidden shadow-md">
                <Image
                    src={item.image} alt={item.title}
                    width={200}
                    height={144}
                    className="object-cover w-full h-full"
                />
            </div>
            <div className="flex flex-col justify-between flex-1">
                <h3 className="text-xl  font-bold text-[#171717] mb-2 tracking-tight">
                    {item.title}
                </h3>
                <p className="text-sm text-[#3e3434] mb-4 leading-relaxed">
                    {item.description}
                </p>

                {item.streamingLink && (
                    <a href={item.streamingLink.url} target="_blank" rel="noopener noreferrer">
                        <button className="px-6 py-2 rounded-md border border-black hover:bg-[#e6e3df] transition-colors">{item.streamingLink.site}</button>
                    </a>
                )}
            </div>

        </div>
    )
}

