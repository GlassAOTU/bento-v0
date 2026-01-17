'use client'

type Props = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function ClearConfirmDialog({ isOpen, onClose, onConfirm }: Props) {
    if (!isOpen) return null

    return (
        <div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className="bg-white dark:bg-darkInput rounded-lg p-6 max-w-sm mx-4 shadow-xl">
                <h3 className="text-lg font-bold text-mySecondary dark:text-white mb-2">
                    Clear Recommendations?
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                    This will clear all your current recommendations. This action cannot be undone.
                </p>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => {
                            onConfirm()
                            onClose()
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                        Clear All
                    </button>
                </div>
            </div>
        </div>
    )
}
