interface IconProps {
    size?: number
    className?: string
}

export function PeacockIcon({ size = 20, className }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M12 2L8 6l4 4-4 4 4 4-4 4h8l-4-4 4-4-4-4 4-4-4-4z" />
        </svg>
    )
}
