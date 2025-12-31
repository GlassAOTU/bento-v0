'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/browser-client'
import { X } from 'lucide-react'
import Image from 'next/image'
import { slugify } from '@/lib/utils/slugify'

interface WatchlistItem {
    id: string
    title: string
    reason: string
    description: string
    image: string
    external_links: { url: string; site: string } | null
    trailer: { id: string; site: string } | null
}

interface Watchlist {
    id: string
    name: string
    description: string | null
    is_public?: boolean
    items: WatchlistItem[]
}

interface EditWatchlistModalProps {
    isOpen: boolean
    onClose: () => void
    watchlist: Watchlist | null
    onSave: () => void
}

export default function EditWatchlistModal({ isOpen, onClose, watchlist, onSave }: EditWatchlistModalProps) {
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [isPublic, setIsPublic] = useState(false)
    const [itemsToRemove, setItemsToRemove] = useState<Set<string>>(new Set())
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Set mounted state on client side
    useEffect(() => {
        setMounted(true)
    }, [])

    // Initialize form state when watchlist changes
    useEffect(() => {
        if (watchlist && isOpen) {
            setName(watchlist.name)
            setDescription(watchlist.description || '')
            setIsPublic(watchlist.is_public || false)
            setItemsToRemove(new Set())
            setError(null)
            setSuccess(false)
        }
    }, [watchlist, isOpen])

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }

        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    const toggleItemRemoval = (itemId: string) => {
        setItemsToRemove(prev => {
            const newSet = new Set(prev)
            if (newSet.has(itemId)) {
                newSet.delete(itemId)
            } else {
                newSet.add(itemId)
            }
            return newSet
        })
    }

    const willDeleteEntireWatchlist = watchlist ? itemsToRemove.size === watchlist.items.length : false
    const hasChanges = watchlist ? (
        name.trim() !== watchlist.name ||
        (description.trim() || null) !== watchlist.description ||
        isPublic !== (watchlist.is_public || false) ||
        itemsToRemove.size > 0
    ) : false

    const handleDelete = async () => {
        if (!watchlist) return

        setSaving(true)
        setError(null)

        try {
            const supabase = createClient()

            // Delete all items first
            const { error: itemsError } = await supabase
                .from('watchlist_items')
                .delete()
                .eq('watchlist_id', watchlist.id)

            if (itemsError) {
                throw new Error(`Failed to delete items: ${itemsError.message}`)
            }

            // Then delete the watchlist itself
            const { error: watchlistError } = await supabase
                .from('watchlists')
                .delete()
                .eq('id', watchlist.id)

            if (watchlistError) {
                throw new Error(`Failed to delete watchlist: ${watchlistError.message}`)
            }

            // Success!
            setSuccess(true)

            // Call onSave to refresh parent data
            onSave()

            // Close modal after brief delay
            setTimeout(() => {
                onClose()
            }, 1500)
        } catch (err: any) {
            console.error('Error deleting watchlist:', err)
            setError(err.message || 'Failed to delete watchlist')
        } finally {
            setSaving(false)
            setShowDeleteConfirm(false)
        }
    }

    const handleSave = async () => {
        if (!watchlist) return

        setSaving(true)
        setError(null)

        try {
            const supabase = createClient()

            if (willDeleteEntireWatchlist) {
                // Delete entire watchlist
                // First delete all items
                const { error: itemsError } = await supabase
                    .from('watchlist_items')
                    .delete()
                    .eq('watchlist_id', watchlist.id)

                if (itemsError) {
                    throw new Error(`Failed to delete items: ${itemsError.message}`)
                }

                // Then delete the watchlist itself
                const { error: watchlistError } = await supabase
                    .from('watchlists')
                    .delete()
                    .eq('id', watchlist.id)

                if (watchlistError) {
                    throw new Error(`Failed to delete watchlist: ${watchlistError.message}`)
                }
            } else {
                // Update watchlist metadata including slug
                const { error: updateError } = await supabase
                    .from('watchlists')
                    .update({
                        name: name.trim(),
                        description: description.trim() || null,
                        is_public: isPublic,
                        slug: slugify(name.trim())
                    })
                    .eq('id', watchlist.id)

                if (updateError) {
                    throw new Error(`Failed to update watchlist: ${updateError.message}`)
                }

                // Delete selected items
                if (itemsToRemove.size > 0) {
                    const { error: deleteError } = await supabase
                        .from('watchlist_items')
                        .delete()
                        .in('id', Array.from(itemsToRemove))

                    if (deleteError) {
                        throw new Error(`Failed to remove items: ${deleteError.message}`)
                    }
                }
            }

            // Success!
            setSuccess(true)

            // Call onSave to refresh parent data
            onSave()

            // Close modal after brief delay
            setTimeout(() => {
                onClose()
            }, 1500)
        } catch (err: any) {
            console.error('Error saving watchlist:', err)
            setError(err.message || 'Failed to save changes')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen || !watchlist || !mounted) return null

    const remainingItems = watchlist.items.filter(item => !itemsToRemove.has(item.id))

    const modalContent = (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose()
                }
            }}
        >
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-[800px] w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-6 flex items-center justify-between z-10">
                    <h2 className="text-2xl font-bold dark:text-white">Edit Watchlist</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={saving}
                            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 underline transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Delete Watchlist
                        </button>
                        <button
                            onClick={onClose}
                            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Delete Confirmation */}
                    {showDeleteConfirm && !success && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-800 rounded-md">
                            <h4 className="text-sm font-semibold text-red-900 dark:text-red-300 mb-2">Delete this watchlist?</h4>
                            <p className="text-xs text-red-700 dark:text-red-400 mb-4">
                                This will permanently delete "{watchlist?.name}" and all {watchlist?.items.length} anime in it. This action cannot be undone.
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    disabled={saving}
                                    className="flex-1 py-2 px-3 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={saving}
                                    className="flex-1 py-2 px-3 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Deleting...' : 'Delete Permanently'}
                                </button>
                            </div>
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-8">
                            <div className="mb-4 text-6xl">✓</div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                                {willDeleteEntireWatchlist ? 'Watchlist Deleted!' : 'Changes Saved!'}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400">
                                {willDeleteEntireWatchlist
                                    ? 'The watchlist has been removed'
                                    : 'Your watchlist has been updated'}
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Form Inputs */}
                            <div className="mb-6">
                                <label htmlFor="watchlist-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Watchlist Name *
                                </label>
                                <input
                                    id="watchlist-name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    disabled={willDeleteEntireWatchlist}
                                    placeholder="e.g., Must Watch, Action Anime, etc."
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-gray-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                                    maxLength={100}
                                    required
                                />
                            </div>

                            <div className="mb-6">
                                <label htmlFor="watchlist-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Description (optional)
                                </label>
                                <textarea
                                    id="watchlist-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    disabled={willDeleteEntireWatchlist}
                                    placeholder="What's this watchlist for?"
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-gray-500 focus:border-transparent resize-none disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
                                    rows={3}
                                    maxLength={500}
                                />
                            </div>

                            {/* Visibility Toggle */}
                            <div className="mb-6">
                                <label className="flex items-center justify-between p-4 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                                    <div>
                                        <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Make this watchlist public</span>
                                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">Public watchlists will appear on your profile</span>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={isPublic}
                                            onChange={(e) => setIsPublic(e.target.checked)}
                                            disabled={willDeleteEntireWatchlist}
                                            className="sr-only peer"
                                        />
                                        <div className={`w-11 h-6 rounded-full peer peer-focus:ring-2 peer-focus:ring-black dark:peer-focus:ring-gray-500 transition-colors ${
                                            isPublic ? 'bg-black dark:bg-white' : 'bg-gray-300 dark:bg-gray-600'
                                        } ${willDeleteEntireWatchlist ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                            <div className={`absolute top-0.5 left-0.5 bg-white dark:bg-gray-900 w-5 h-5 rounded-full transition-transform ${
                                                isPublic ? 'translate-x-5' : 'translate-x-0'
                                            }`}></div>
                                        </div>
                                    </div>
                                </label>
                            </div>

                            {/* Items Section */}
                            <div className="mb-6">
                                <h3 className="text-lg font-semibold mb-3 dark:text-white">
                                    Anime in this watchlist ({remainingItems.length})
                                </h3>

                                {watchlist.items.length === 0 ? (
                                    <div className="text-center py-8 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <p className="text-gray-400 dark:text-gray-500">This watchlist is empty</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                        {watchlist.items.map((item) => {
                                            const isMarkedForRemoval = itemsToRemove.has(item.id)
                                            return (
                                                <div
                                                    key={item.id}
                                                    className={`relative group ${
                                                        isMarkedForRemoval ? 'opacity-50' : ''
                                                    }`}
                                                >
                                                    <div className={`relative w-full aspect-square rounded-lg overflow-hidden ${
                                                        isMarkedForRemoval ? 'border-2 border-red-500' : 'border border-gray-200 dark:border-gray-700'
                                                    }`}>
                                                        <Image
                                                            src={item.image || '/images/banner-not-available.png'}
                                                            alt={item.title}
                                                            fill
                                                            className="object-cover"
                                                        />
                                                        {/* Remove Button */}
                                                        <button
                                                            onClick={() => toggleItemRemoval(item.id)}
                                                            className={`absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                                                                isMarkedForRemoval
                                                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                                                    : 'bg-black/60 text-white hover:bg-red-500'
                                                            }`}
                                                            title={isMarkedForRemoval ? 'Undo remove' : 'Remove from watchlist'}
                                                        >
                                                            <X size={16} />
                                                        </button>
                                                    </div>
                                                    <p className="mt-2 text-xs text-center font-medium text-gray-900 dark:text-white line-clamp-2">
                                                        {item.title}
                                                    </p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Warning for full deletion */}
                            {willDeleteEntireWatchlist && (
                                <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md flex items-start gap-3">
                                    <span className="text-orange-600 dark:text-orange-400 text-xl">⚠️</span>
                                    <div>
                                        <p className="text-sm font-medium text-orange-800 dark:text-orange-300">
                                            Warning: Removing all anime will delete this watchlist
                                        </p>
                                        <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                                            This action cannot be undone.
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Footer Buttons */}
                            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={saving}
                                    className="flex-1 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={saving || !hasChanges || (!willDeleteEntireWatchlist && !name.trim())}
                                    className={`flex-1 py-3 rounded-md transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                                        willDeleteEntireWatchlist
                                            ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                                            : 'bg-[#F9F9F9] dark:bg-gray-800 text-black dark:text-white border border-black dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {saving
                                        ? 'Saving...'
                                        : willDeleteEntireWatchlist
                                            ? 'Delete Watchlist'
                                            : 'Save Changes'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
