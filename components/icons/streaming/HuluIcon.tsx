interface IconProps {
    size?: number
    className?: string
}

export function HuluIcon({ size = 20, className }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M2 6h3v5c.5-.6 1.4-1 2.5-1 2 0 3.5 1.5 3.5 3.5V18H8v-4c0-1-.7-1.5-1.5-1.5S5 13 5 14v4H2V6zm11 4h3v1c.5-.6 1.4-1 2.5-1 2 0 3.5 1.5 3.5 3.5V18h-3v-4c0-1-.7-1.5-1.5-1.5S16 13 16 14v4h-3v-8z" />
        </svg>
    )
}
