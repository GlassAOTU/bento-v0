'use client'

import ModalBase from '@/components/ui/ModalBase'

type Props = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

export default function ClearConfirmDialog({ isOpen, onClose, onConfirm }: Props) {
    return (
        <ModalBase isOpen={isOpen} onClose={onClose} className="p-6 max-w-sm shadow-xl dark:bg-darkInput">
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
        </ModalBase>
    )
}
