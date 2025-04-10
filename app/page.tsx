import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function Home() {
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
                        {[
                            "Adventure",
                            "Isekai",
                            "Comedy",
                            "Horror",
                            "Sci-Fi",
                            "Slice of Life",
                            "Action",
                            "Shonen",
                            "Retro",
                            "90s",
                            "Fun",
                            "Hello",
                        ].map((tag) => (
                            <Button
                                key={tag}
                                variant="outline"
                                className="rounded-lg border border-[#d9d9d9] bg-white text-[#4a4023] hover:bg-[#f5f2ec] px-4 py-1 h-auto"
                            >
                                {tag}
                            </Button>
                        ))}
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
