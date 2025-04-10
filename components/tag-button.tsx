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
            className={`px-4 py-1 rounded-lg font-mono border border-black transition-all ${isSelected
                    ? "bg-black text-white shadow-sm"
                    : "text-black hover:bg-[#e6e3df] shadow-sm"
                }`}
        >
            {label}
        </button>
    )
}
