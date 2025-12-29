interface AnimeSectionProps {
    children: React.ReactNode
    title?: string
    divider?: boolean
    noPaddingTop?: boolean
    className?: string
}

export default function AnimeSection({ children, title, divider = false, noPaddingTop = false, className = '' }: AnimeSectionProps) {
    return (
        <section className={`w-full ${noPaddingTop ? 'pb-12' : 'py-12'} ${className}`}>
            <div className="container mx-auto max-w-7xl px-6 md:px-16">
                {title && (
                    <h2 className="text-2xl font-bold text-mySecondary font-instrument-sans mb-8">
                        {title}
                    </h2>
                )}
                {children}
                {divider && (
                    <hr className="border-t border-gray-200 mt-12" />
                )}
            </div>
        </section>
    )
}
