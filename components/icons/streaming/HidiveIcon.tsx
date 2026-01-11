interface IconProps {
    size?: number
    className?: string
}

export function HidiveIcon({ size = 20, className }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14H8V8h2v8zm6 0h-2V8h2v8z" />
        </svg>
    )
}
