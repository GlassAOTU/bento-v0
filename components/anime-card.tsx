import Image from "next/image"
import { useState } from "react"

export default function AnimeCard({ item, onTrailerClick }: {
    item: {
        title: string;
        reason: string;
        description: string;
        image: string;
        externalLinks: { url: string; site: string } | null;
        trailer: { id: string, site: string } | null;
    };
    onTrailerClick?: (trailerId: string) => void;
}) {
    return (
        <div className="flex gap-6 rounded-lg flex-col hover:scale-[102%] transition-all">
            {/* <div className="w-40 h-52 max-w-[950px] max-h-[208px] rounded-md overflow-hidden shadow-md bg-red-600"> */}
            <div className="rounded-md overflow-hidden  flex items-center justify-center">


                <Image
                    src={item.image || 'images/banner-not-available.png'} alt={item.title}
                    width={1900}
                    height={400}
                    className="object-cover w-full h-full"
                    priority={true}
                    loading="eager"
                />
            </div>
            {/* </div> */}
            <div className="flex flex-col justify-between flex-1">
                <h3 className="text-xl font-bold text-mySecondary mb-2 tracking-tighter">
                    {item.title}
                </h3>
                <b className="italic mb-3">{item.reason}</b>
                <p className="text-md text-mySecondary mb-4 tracking-tighter leading-relaxed">
                    {item.description}
                </p>

                <div className="flex flex-row justify-between">
                    {item.externalLinks && (
                        <div className="self-start">
                            <a href={item.externalLinks.url} target="_blank" rel="noopener noreferrer" className="inline-block">
                                <button className="px-4 py-1 rounded-md border  border-mySecondary/50 hover:bg-mySecondary/10 hover:border-mySecondary transition-colors font-medium text-sm">{item.externalLinks.site}</button>
                            </a>
                        </div>
                    )}

                    {item.trailer && item.trailer.id && item.trailer.site && (
                        <div className="self-start">
                            <button 
                                onClick={() => item.trailer?.id && onTrailerClick?.(item.trailer.id)}
                                className="px-4 py-1 rounded-md border border-mySecondary/50 hover:bg-mySecondary/10 hover:border-mySecondary transition-colors font-medium text-sm"
                            >
                                Watch Trailer
                            </button>
                        </div>
                    )}

                </div>
            </div>

        </div>
    )
}

