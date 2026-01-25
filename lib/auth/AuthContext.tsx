'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/browser-client'
import { identifyUser, trackUserSignup, trackUserSignin } from '@/lib/analytics/events'

interface Profile {
    id: string
    user_id: string
    username: string
    display_name: string | null
    bio: string | null
    avatar_url: string | null
    created_at: string
}

type AuthStatus =
    | 'initializing'
    | 'unauthenticated'
    | 'loading_profile'
    | 'no_profile'
    | 'ready'

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
    const [status, setStatus] = useState<AuthStatus>('initializing')
    const profileFetchInProgress = useRef(false)

    const loading = status === 'initializing'
    const profileLoading = status === 'loading_profile'
    const hasProfile = status === 'ready' && profile !== null

    const fetchProfile = async () => {
        if (profileFetchInProgress.current) {
            console.log('[AuthContext] Profile fetch already in progress, skipping...')
            return
        }

        try {
            profileFetchInProgress.current = true
            setStatus('loading_profile')

            const response = await fetch('/api/profile')

            if (!response.ok) {
                setProfile(null)
                setStatus('no_profile')
                return
            }

            const data = await response.json()

            if (data.profile) {
                setProfile(data.profile)
                setStatus('ready')
            } else {
                setProfile(null)
                setStatus('no_profile')
            }
        } catch (err) {
            console.error('Error fetching profile:', err)
            setProfile(null)
            setStatus('no_profile')
        } finally {
            profileFetchInProgress.current = false
        }
    }

    useEffect(() => {
        const initAuth = async () => {
            try {
                const supabase = createClient()

                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    console.log('[AuthContext] Auth event:', event)
                    setUser(session?.user ?? null)

                    if (session?.user) {
                        console.log('Auth state changed:', {
                            id: session.user.id,
                            email: session.user.email,
                            email_confirmed_at: session.user.email_confirmed_at,
                        })

                        identifyUser(session.user.id, {
                            email: session.user.email,
                            created_at: session.user.created_at
                        })

                        const provider = session.user.app_metadata?.provider
                        const authMethod = provider === 'google' ? 'google' : provider === 'email' ? 'email' : 'other'

                        if (event === 'SIGNED_IN') {
                            const createdAt = new Date(session.user.created_at)
                            const now = new Date()
                            const isNewUser = (now.getTime() - createdAt.getTime()) < 60000

                            if (isNewUser) {
                                trackUserSignup({
                                    auth_method: authMethod,
                                    is_first_session: true
                                })
                            } else {
                                trackUserSignin({
                                    auth_method: authMethod
                                })
                            }
                        }

                        fetchProfile()
                    } else {
                        setProfile(null)
                        setStatus('unauthenticated')
                    }
                })

                const { data: { session }, error } = await supabase.auth.getSession()

                if (error) {
                    console.error('Error getting session:', error)
                }

                const currentUser = session?.user ?? null
                setUser(currentUser)

                if (currentUser) {
                    console.log('Current user:', {
                        id: currentUser.id,
                        email: currentUser.email,
                        email_confirmed_at: currentUser.email_confirmed_at,
                        created_at: currentUser.created_at,
                        last_sign_in_at: currentUser.last_sign_in_at,
                    })

                    setTimeout(() => {
                        if (!profileFetchInProgress.current) {
                            fetchProfile()
                        }
                    }, 100)
                } else {
                    setStatus('unauthenticated')
                }

                return () => subscription.unsubscribe()
            } catch (error) {
                console.error('Error initializing auth:', error)
                setStatus('unauthenticated')
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
