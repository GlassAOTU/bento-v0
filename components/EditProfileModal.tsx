'use client'

import { useState } from 'react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/browser-client'

const AVATAR_OPTIONS = [
    '/images/profiles/edward2.png',
    '/images/profiles/gojo2.png',
    '/images/profiles/maomao2.png',
    '/images/profiles/momo2.png',
    '/images/profiles/tanjiro2.png',
]

interface EditProfileModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
    profile: {
        username: string
        display_name: string | null
        bio: string | null
        avatar_url: string | null
    }
    userEmail?: string
    isEmailProvider?: boolean
}

type TabType = 'profile' | 'account'

export default function EditProfileModal({ isOpen, onClose, onSuccess, profile, userEmail, isEmailProvider = false }: EditProfileModalProps) {
    const [activeTab, setActiveTab] = useState<TabType>('profile')
    const [displayName, setDisplayName] = useState(profile.display_name || '')
    const [bio, setBio] = useState(profile.bio || '')
    const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || AVATAR_OPTIONS[0])
    const [username, setUsername] = useState(profile.username)
    const [email, setEmail] = useState(userEmail || '')
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState('')
    const [showAvatarPicker, setShowAvatarPicker] = useState(false)
    const [usernameError, setUsernameError] = useState('')
    const [showPasswordModal, setShowPasswordModal] = useState(false)
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [passwordError, setPasswordError] = useState('')
    const [passwordSaving, setPasswordSaving] = useState(false)

    if (!isOpen) return null

    const checkUsernameAvailability = async (newUsername: string) => {
        if (newUsername === profile.username) {
            setUsernameError('')
            return true
        }

        const usernameRegex = /^[a-z0-9_-]{3,20}$/
        if (!usernameRegex.test(newUsername)) {
            setUsernameError('3-20 chars, lowercase letters, numbers, _ or -')
            return false
        }

        try {
            const response = await fetch(`/api/profile/check-username/${newUsername}`)
            const data = await response.json()
            if (!data.available) {
                setUsernameError('Username already taken')
                return false
            }
            setUsernameError('')
            return true
        } catch {
            setUsernameError('Could not check availability')
            return false
        }
    }

    const handleSave = async () => {
        setSaving(true)
        setError('')

        if (username !== profile.username) {
            const available = await checkUsernameAvailability(username)
            if (!available) {
                setSaving(false)
                return
            }
        }

        try {
            const response = await fetch('/api/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username !== profile.username ? username : undefined,
                    display_name: displayName || null,
                    bio: bio || null,
                    avatar_url: avatarUrl
                })
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Failed to save profile')
            }

            if (isEmailProvider && email !== userEmail) {
                const supabase = createClient()
                const { error: emailError } = await supabase.auth.updateUser({ email })
                if (emailError) {
                    throw new Error(emailError.message)
                }
            }

            onSuccess?.()
            onClose()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save profile')
        } finally {
            setSaving(false)
        }
    }

    const handleChangePassword = async () => {
        setPasswordError('')

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match')
            return
        }

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters')
            return
        }

        setPasswordSaving(true)

        try {
            const supabase = createClient()

            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: userEmail || '',
                password: currentPassword
            })

            if (signInError) {
                setPasswordError('Current password is incorrect')
                setPasswordSaving(false)
                return
            }

            const { error: updateError } = await supabase.auth.updateUser({
                password: newPassword
            })

            if (updateError) {
                throw new Error(updateError.message)
            }

            setShowPasswordModal(false)
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (err) {
            setPasswordError(err instanceof Error ? err.message : 'Failed to change password')
        } finally {
            setPasswordSaving(false)
        }
    }

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        {
            id: 'profile',
            label: 'Profile',
            icon: (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.7 0 5-2.3 5-5s-2.3-5-5-5-5 2.3-5 5 2.3 5 5 5zm0 2c-3.3 0-10 1.7-10 5v2h20v-2c0-3.3-6.7-5-10-5z" />
                </svg>
            )
        },
        {
            id: 'account',
            label: 'Account',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="5" y="11" width="14" height="10" rx="2" strokeWidth={2} />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0v4" />
                </svg>
            )
        }
    ]

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center">
                {/* Backdrop */}
                <div
                    className="absolute inset-0 bg-black/50"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold dark:text-white">Edit Profile</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your public profile and account settings.</p>
                    </div>

                    {/* Content */}
                    <div className="flex min-h-[400px]">
                        {/* Sidebar */}
                        <div className="w-48 border-r border-gray-200 dark:border-gray-700 py-4">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                                        activeTab === tab.id
                                            ? 'bg-gray-100 dark:bg-gray-800 text-black dark:text-white'
                                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="flex-1 p-6">
                            {error && (
                                <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md">
                                    {error}
                                </div>
                            )}

                            {activeTab === 'profile' && (
                                <div className="space-y-6">
                                    {/* Profile Photo */}
                                    <div>
                                        <div
                                            className="flex items-center gap-4 cursor-pointer group"
                                            onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                                        >
                                            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-200 dark:bg-gray-700 flex items-center justify-center group-hover:opacity-80 transition-opacity">
                                                {avatarUrl ? (
                                                    <Image
                                                        src={avatarUrl}
                                                        alt="Profile"
                                                        width={64}
                                                        height={64}
                                                        className="w-full h-full object-contain"
                                                    />
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 text-2xl font-bold">
                                                        {profile.username.charAt(0).toUpperCase()}
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-medium dark:text-white">Profile photo</p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">Click to change</p>
                                            </div>
                                        </div>

                                        {/* Avatar Picker */}
                                        {showAvatarPicker && (
                                            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Choose your avatar</p>
                                                <div className="grid grid-cols-5 gap-3">
                                                    {AVATAR_OPTIONS.map((avatar) => (
                                                        <button
                                                            key={avatar}
                                                            onClick={() => {
                                                                setAvatarUrl(avatar)
                                                                setShowAvatarPicker(false)
                                                            }}
                                                            className={`relative w-12 h-12 rounded-lg overflow-hidden transition-all ${
                                                                avatarUrl === avatar
                                                                    ? 'ring-2 ring-black dark:ring-white ring-offset-2 dark:ring-offset-gray-800'
                                                                    : 'hover:opacity-80'
                                                            }`}
                                                        >
                                                            <Image
                                                                src={avatar}
                                                                alt="Avatar option"
                                                                width={48}
                                                                height={48}
                                                                className="w-full h-full object-contain"
                                                            />
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Display Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={displayName}
                                            onChange={(e) => setDisplayName(e.target.value)}
                                            placeholder="Enter display name"
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-gray-800 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                        />
                                    </div>

                                    {/* Bio */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Bio
                                        </label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Tell us about yourself"
                                            rows={4}
                                            maxLength={500}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent resize-none bg-white dark:bg-gray-800 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                        />
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{bio.length}/500</p>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'account' && (
                                <div className="space-y-6">
                                    {/* Username */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Username
                                        </label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => {
                                                setUsername(e.target.value.toLowerCase())
                                                setUsernameError('')
                                            }}
                                            onBlur={() => {
                                                if (username !== profile.username) {
                                                    checkUsernameAvailability(username)
                                                }
                                            }}
                                            className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-gray-800 text-black dark:text-white ${
                                                usernameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                                            }`}
                                        />
                                        {usernameError && (
                                            <p className="text-xs text-red-500 dark:text-red-400 mt-1">{usernameError}</p>
                                        )}
                                    </div>

                                    {/* Email - only for email/password users */}
                                    {isEmailProvider && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                                Email
                                            </label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-gray-800 text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                                            />
                                            {email !== userEmail && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">A confirmation email will be sent to verify the new address</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Change Password - only for email/password users */}
                                    {isEmailProvider && (
                                        <div>
                                            <button
                                                onClick={() => setShowPasswordModal(true)}
                                                className="w-full py-3 px-4 border border-red-400 dark:border-red-500 text-red-500 dark:text-red-400 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium"
                                            >
                                                Change Password
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 dark:text-gray-300"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving || !!usernameError}
                            className="px-4 py-2 text-sm font-medium bg-black dark:bg-white text-white dark:text-black rounded-md hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowPasswordModal(false)}
                    />
                    <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
                        <h3 className="text-lg font-bold mb-4 dark:text-white">Change Password</h3>

                        {passwordError && (
                            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-md">
                                {passwordError}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-gray-800 text-black dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-gray-800 text-black dark:text-white"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-gray-800 text-black dark:text-white"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowPasswordModal(false)
                                    setCurrentPassword('')
                                    setNewPassword('')
                                    setConfirmPassword('')
                                    setPasswordError('')
                                }}
                                disabled={passwordSaving}
                                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleChangePassword}
                                disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword}
                                className="px-4 py-2 text-sm font-medium bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50"
                            >
                                {passwordSaving ? 'Changing...' : 'Change Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
