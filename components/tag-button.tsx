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
            className={`px-4 py-1 rounded-lg  border border-[#4a4023]/50 transition-all ${isSelected
                    ? "bg-[#4a4023] text-white shadow-sm hover:bg-[#3b341c]"
                    : "text-[#4a4023] hover:bg-[#e6e3df] hover:border-[#4a4023] shadow-sm"
                }`}
        >
            {label}
        </button>
    )
}
