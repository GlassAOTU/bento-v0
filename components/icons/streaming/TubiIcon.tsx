interface IconProps {
    size?: number
    className?: string
}

export function TubiIcon({ size = 20, className }: IconProps) {
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="currentColor"
            className={className}
        >
            <path d="M4 6h4v12H4V6zm6 0h4v8c0 2.21-1.79 4-4 4v-2c1.1 0 2-.9 2-2V8h-2V6zm6 0h4v8c0 2.21-1.79 4-4 4v-2c1.1 0 2-.9 2-2V8h-2V6z" />
        </svg>
    )
}
