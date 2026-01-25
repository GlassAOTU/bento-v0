'use client'

import { useEffect, useState, ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface ModalBaseProps {
    isOpen: boolean
    onClose: () => void
    children: ReactNode
    className?: string
}

export default function ModalBase({ isOpen, onClose, children, className = '' }: ModalBaseProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (!isOpen) return

        document.body.style.overflow = 'hidden'

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleEscape)

        return () => {
            document.body.style.overflow = 'unset'
            document.removeEventListener('keydown', handleEscape)
        }
    }, [isOpen, onClose])

    if (!isOpen || !mounted) return null

    const modal = (
        <div
            className="fixed inset-0 bg-black/50 flex justify-center items-center z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose()
            }}
        >
            <div className={`relative bg-white dark:bg-darkBg rounded-lg mx-4 ${className}`} onClick={(e) => e.stopPropagation()}>
                {children}
            </div>
        </div>
    )

    return createPortal(modal, document.body)
}
