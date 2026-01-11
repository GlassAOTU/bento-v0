'use client'

interface TooltipProps {
    content: string
    children: React.ReactNode
    position?: 'top' | 'bottom'
}

export function Tooltip({ content, children, position = 'bottom' }: TooltipProps) {
    return (
        <div className="relative group inline-block">
            {children}
            <span
                className={`
                    absolute z-50
                    invisible opacity-0
                    group-hover:visible group-hover:opacity-100
                    transition-opacity duration-200
                    bg-gray-900 dark:bg-gray-100
                    text-white dark:text-gray-900
                    text-xs font-medium
                    px-2 py-1 rounded
                    whitespace-nowrap
                    left-1/2 -translate-x-1/2
                    pointer-events-none
                    hidden [@media(hover:hover)]:block
                    ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}
                `}
            >
                {content}
            </span>
        </div>
    )
}
