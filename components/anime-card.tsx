import Image from "next/image"

export default function AnimeCard({ item }: { item: { title: string; reason: string; description: string; image: string; externalLinks: { url: string; site: string } | null } }) {
    return (
        <div className="flex gap-6 rounded-lg flex-col">
            {/* <div className="w-40 h-52 max-w-[950px] max-h-[208px] rounded-md overflow-hidden shadow-md bg-red-600"> */}
            <div className="rounded-md overflow-hidden max-h-[200px] flex items-center justify-center">


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
                <h3 className="text-xl font-bold text-[#4a4023] mb-2 tracking-tighter">
                    {item.title}
                </h3>
                <b className="italic mb-3">{item.reason}</b>
                <p className="text-md text-[#4a4023] mb-4 tracking-tighter leading-relaxed">
                    {item.description}
                </p>

                {item.externalLinks && (
                    <div className="self-start">
                        <a href={item.externalLinks.url} target="_blank" rel="noopener noreferrer" className="inline-block">
                            <button className="px-4 py-1 rounded-md border font-mono border-[#4a4023]/50 hover:bg-[#e6e3df] hover:border-[#4a4023] transition-colors font-medium text-sm">{item.externalLinks.site}</button>
                        </a>
                    </div>
                )}
            </div>

        </div>
    )
}

