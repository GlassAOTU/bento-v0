'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser-client'
import { identifyUser } from '@/lib/analytics/events'

interface Profile {
    id: string
    user_id: string
    username: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    created_at: string
}

interface AuthContextType {
    user: User | null
    profile: Profile | null
    loading: boolean
    profileLoading: boolean
    hasProfile: boolean
    refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)
    const [profileLoading, setProfileLoading] = useState(false)
    const [hasProfile, setHasProfile] = useState(false)
    const [profileFetchInProgress, setProfileFetchInProgress] = useState(false)

    // Fetch profile data with debouncing to prevent duplicate calls
    const fetchProfile = async () => {
        // Prevent duplicate concurrent fetches
        if (profileFetchInProgress) {
            console.log('[AuthContext] Profile fetch already in progress, skipping...')
            return
        }

        try {
            setProfileFetchInProgress(true)
            setProfileLoading(true)

            const response = await fetch('/api/profile')

            if (!response.ok) {
                setProfile(null)
                setHasProfile(false)
                return
            }

            const data = await response.json()

            if (data.profile) {
                setProfile(data.profile)
                setHasProfile(true)
            } else {
                setProfile(null)
                setHasProfile(false)
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
            setProfile(null)
            setHasProfile(false)
        } finally {
            setProfileLoading(false)
            setProfileFetchInProgress(false)
        }
    }

    // Initialize auth
    useEffect(() => {
        const initAuth = async () => {
            try {
                const supabase = createClient()

                // Listen for auth changes first (important for OAuth flow)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log('[AuthContext] Auth event:', event)
                    setUser(session?.user ?? null)
                    setLoading(false)

                    if (session?.user) {
                        console.log('Auth state changed:', {
                            id: session.user.id,
                            email: session.user.email,
                            email_confirmed_at: session.user.email_confirmed_at,
                        })

                        // Identify user in PostHog
                        identifyUser(session.user.id, {
                            email: session.user.email,
                            created_at: session.user.created_at
                        })

                        // Fetch profile
                        fetchProfile()
                    } else {
                        // User signed out, clear profile
                        setProfile(null)
                        setHasProfile(false)
                        setProfileLoading(false)
                    }
                })

                // Get session first - reads from storage and auto-refreshes if needed
                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Error getting session:', error)
                }

                const user = session?.user ?? null
                setUser(user)
                setLoading(false)

                // Only fetch profile if user exists and no auth state change is pending
                // (avoids double fetch during OAuth redirect)
                if (user) {
                    console.log('Current user:', {
                        id: user.id,
                        email: user.email,
                        email_confirmed_at: user.email_confirmed_at,
                        created_at: user.created_at,
                        last_sign_in_at: user.last_sign_in_at,
                    })

                    // Small delay to let onAuthStateChange handle OAuth case
                    setTimeout(() => {
                        if (!profileFetchInProgress) {
                            fetchProfile()
                        }
                    }, 100)
                }

                return () => subscription.unsubscribe()
            } catch (error) {
                console.error('Error initializing auth:', error)
                setLoading(false)
            }
        }

        initAuth()
    }, [])

    const value = {
        user,
        profile,
        loading,
        profileLoading,
        hasProfile,
        refreshProfile: fetchProfile
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider')
    }
    return context
}
