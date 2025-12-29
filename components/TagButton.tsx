"use client"

interface TagButtonProps {
    label: string
    isSelected: boolean
    onClick: () => void
}

export default function TagButton({ label, isSelected, onClick }: TagButtonProps) {
    return (
        <button
            onClick={onClick}
            className={`px-4 py-1 rounded-lg border border-mySecondary/50 dark:border-gray-600 transition-all ${isSelected
                    ? "bg-mySecondary text-white shadow-sm hover:bg-[#303030]"
                    : "text-mySecondary dark:text-gray-300 hover:bg-mySecondary/10 dark:hover:bg-gray-800 hover:border-mySecondary shadow-sm"
                }`}
        >
            {label}
        </button>
    )
}
