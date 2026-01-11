interface IconProps {
    size?: number
    className?: string
}

export function VrvIcon({ size = 20, className }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M4 6l4 12h2l4-12h-2l-3 9-3-9H4zm10 0l4 12h2l4-12h-2l-3 9-3-9h-2z" />
        </svg>
    )
}
