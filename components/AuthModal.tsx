'use client'

import { useState, useEffect } from 'react'
import { signin, signup, resendVerificationEmail } from '@/actions/auth/auth'
import { createClient } from '@/lib/supabase/browser-client'

type AuthModalProps = {
    isOpen: boolean
    onClose: () => void
    initialView?: 'signin' | 'signup'
}

// Helper function to map auth errors to user-friendly messages
function getErrorMessage(error: string, isSignup: boolean = false): string {
    // Normalize error message
    const normalizedError = error.toLowerCase().trim()

    // Sign in specific errors
    if (!isSignup) {
        if (normalizedError.includes('invalid login credentials') ||
            normalizedError.includes('invalid email or password')) {
            return 'Sorry, you entered an incorrect email address or password'
        }
    }

    // Sign up specific errors
    if (isSignup) {
        if (normalizedError.includes('user already registered') ||
            normalizedError.includes('already registered')) {
            return 'An account with this email already exists. Please sign in instead.'
        }
    }

    // Common errors for both
    if (normalizedError.includes('password should be at least')) {
        return 'Password must be at least 6 characters long'
    }

    if (normalizedError.includes('invalid email') ||
        normalizedError.includes('unable to validate email')) {
        return 'Please enter a valid email address'
    }

    if (normalizedError.includes('email rate limit') ||
        normalizedError.includes('rate limit')) {
        return 'Too many attempts. Please try again in a few minutes.'
    }

    if (normalizedError.includes('network') ||
        normalizedError.includes('fetch')) {
        return 'Network error. Please check your connection and try again.'
    }

    if (normalizedError.includes('weak password')) {
        return 'Please choose a stronger password'
    }

    // Return original error if no mapping found
    return error
}

export default function AuthModal({ isOpen, onClose, initialView = 'signin' }: AuthModalProps) {
    const [view, setView] = useState<'signin' | 'signup' | 'confirmation'>(initialView)
    const [email, setEmail] = useState('')
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [signupEmail, setSignupEmail] = useState('')
    const [emailTouched, setEmailTouched] = useState(false)
    const [password, setPassword] = useState('')
    const [passwordFocused, setPasswordFocused] = useState(false)

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const isEmailValid = signupEmail.length === 0 || emailRegex.test(signupEmail)

    // Password validation rules
    const passwordValidation = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }

    const isPasswordValid = Object.values(passwordValidation).every(Boolean)
    const isFormValid = isEmailValid && signupEmail.length > 0 && isPasswordValid

    // Update view when initialView changes or modal opens
    useEffect(() => {
        if (isOpen) {
            setView(initialView)
            setResendSuccess(false)
            setError(null) // Clear errors when modal opens
            setSignupEmail('') // Clear signup email when modal opens
            setEmailTouched(false)
            setPassword('') // Clear password when modal opens
            setPasswordFocused(false)
        }
    }, [isOpen, initialView])

    const handleSignup = async (formData: FormData) => {
        console.log('[AuthModal] handleSignup called')
        console.log('[AuthModal] Email:', formData.get('email'))

        setError(null) // Clear previous errors

        const result = await signup(formData)

        console.log('[AuthModal] Signup result:', result)

        if (result?.needsEmailConfirmation) {
            console.log('[AuthModal] Email needs confirmation, showing confirmation view')
            setEmail(result.email || '')
            setView('confirmation')
        } else if (result?.error) {
            console.error('[AuthModal] Signup error:', result.error)
            setError(getErrorMessage(result.error, true))
        } else if (result?.success) {
            console.log('[AuthModal] Signup successful, refreshing session and closing modal')

            // Manually refresh the session on the client side (triggers onAuthStateChange)
            const supabase = await createClient()
            const { data, error } = await supabase.auth.refreshSession()
            console.log('[AuthModal] Session refreshed:', { user: data.user?.email, error })

            // Modal will auto-close via onAuthStateChange in NavigationBar
        }
    }

    const handleSignin = async (formData: FormData) => {
        console.log('[AuthModal] handleSignin called')
        console.log('[AuthModal] Email:', formData.get('email'))

        setError(null) // Clear previous errors

        const result = await signin(formData)

        console.log('[AuthModal] Signin result:', result)

        if (result?.needsEmailConfirmation) {
            console.log('[AuthModal] Email needs confirmation, showing confirmation view')
            setEmail(result.email || '')
            setView('confirmation')
        } else if (result?.error) {
            console.error('[AuthModal] Signin error:', result.error)
            setError(getErrorMessage(result.error, false))
        } else if (result?.success) {
            console.log('[AuthModal] Signin successful, refreshing session and closing modal')

            // Manually refresh the session on the client side (triggers onAuthStateChange)
            const supabase = await createClient()
            const { data, error } = await supabase.auth.refreshSession()
            console.log('[AuthModal] Session refreshed:', { user: data.user?.email, error })

            // Modal will auto-close via onAuthStateChange in NavigationBar
        }
    }

    const handleResendEmail = async () => {
        if (!email) return

        setResendLoading(true)
        setResendSuccess(false)

        const result = await resendVerificationEmail(email)

        setResendLoading(false)

        if (result?.success) {
            setResendSuccess(true)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50" onClick={(e) => {
            if (e.target === e.currentTarget) {
                onClose()
            }
        }}>
            <div className="relative bg-white rounded-lg w-full max-w-md p-8">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </button>

                {view === 'confirmation' ? (
                    // Email Confirmation Message
                    <div className="text-center py-8">
                        <h2 className="text-3xl font-bold mb-4">Thank you for signing up!</h2>
                        <p className="text-gray-600 mb-2">
                            Please check your email to verify your account.
                        </p>
                        {email && (
                            <p className="text-sm text-gray-500 mb-6">
                                We sent a verification link to <span className="font-medium">{email}</span>
                            </p>
                        )}

                        {/* Resend Link */}
                        <div className="mb-6">
                            {resendSuccess ? (
                                <p className="text-sm text-green-600">
                                    ✓ Verification email sent! Check your inbox.
                                </p>
                            ) : (
                                <button
                                    onClick={handleResendEmail}
                                    disabled={resendLoading}
                                    className="text-sm text-mySecondary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {resendLoading ? 'Sending...' : 'Resend verification email'}
                                </button>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-mySecondary text-white rounded-md hover:bg-[#2b2b2b] transition-colors font-medium"
                        >
                            Got it
                        </button>
                    </div>
                ) : view === 'signin' ? (
                    // Sign In Form
                    <div>
                        <h2 className="text-2xl font-bold mb-2 text-center">Sign in</h2>
                        <p className="text-sm text-gray-600 mb-6 text-center">
                            Welcome back! Sign in to your account
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                                <span className="text-red-600 text-sm">⚠️</span>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <form onSubmit={async (e) => {
                            e.preventDefault()
                            console.log('[AuthModal] Sign in form submitted')
                            const formData = new FormData(e.currentTarget)
                            await handleSignin(formData)
                        }} className="flex flex-col gap-4">
                            <input
                                type="email"
                                name="email"
                                placeholder="Email"
                                required
                                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="password"
                                name="password"
                                placeholder="Password"
                                required
                                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                type="submit"
                                className="px-6 py-3 bg-mySecondary text-white rounded-md hover:bg-[#2b2b2b] transition-colors font-medium"
                            >
                                Sign in
                            </button>
                        </form>

                        <div className="mt-4 text-center text-sm">
                            <span className="text-gray-600">Don't have an account? </span>
                            <button
                                onClick={() => {
                                    setView('signup')
                                    setError(null) // Clear error when switching views
                                }}
                                className="text-mySecondary hover:underline font-medium"
                            >
                                Sign up
                            </button>
                        </div>
                    </div>
                ) : (
                    // Sign Up Form
                    <div>
                        <h2 className="text-2xl font-bold mb-2 text-center">Create an account</h2>
                        <p className="text-sm text-gray-600 mb-6 text-center">
                            Join Bento to get personalized recommendations
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                                <span className="text-red-600 text-sm">⚠️</span>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <form onSubmit={async (e) => {
                            e.preventDefault()

                            // Validate email before submission
                            if (!isEmailValid || signupEmail.length === 0) {
                                setError('Please enter a valid email address')
                                return
                            }

                            // Validate password before submission
                            if (!isPasswordValid) {
                                setError('Please meet all password requirements')
                                return
                            }

                            const formData = new FormData(e.currentTarget)
                            await handleSignup(formData)
                        }} className="flex flex-col gap-4">
                            <div>
                                <input
                                    type="email"
                                    name="email"
                                    placeholder="Email"
                                    required
                                    value={signupEmail}
                                    onChange={(e) => setSignupEmail(e.target.value)}
                                    onBlur={() => setEmailTouched(true)}
                                    className={`px-4 py-3 border rounded-md focus:outline-none focus:ring-2 w-full ${
                                        emailTouched && !isEmailValid
                                            ? 'border-red-300 focus:ring-red-500'
                                            : error
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                />
                                {/* Email validation feedback */}
                                {emailTouched && !isEmailValid && signupEmail.length > 0 && (
                                    <p className="mt-1 text-xs text-red-600">Please enter a valid email address</p>
                                )}
                            </div>
                            <div>
                                <input
                                    type="password"
                                    name="password"
                                    placeholder="Password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onFocus={() => setPasswordFocused(true)}
                                    onBlur={() => setPasswordFocused(false)}
                                    className={`px-4 py-3 border rounded-md focus:outline-none focus:ring-2 w-full ${
                                        error
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                />

                                {/* Password Requirements */}
                                {(passwordFocused || password.length > 0) && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-md border border-gray-200">
                                        <p className="text-xs font-medium text-gray-700 mb-2">Password must contain:</p>
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {passwordValidation.minLength ? '✓' : '○'}
                                                </span>
                                                <span className={`text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-600'}`}>
                                                    At least 8 characters
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {passwordValidation.hasUpperCase ? '✓' : '○'}
                                                </span>
                                                <span className={`text-xs ${passwordValidation.hasUpperCase ? 'text-green-600' : 'text-gray-600'}`}>
                                                    One uppercase letter
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {passwordValidation.hasLowerCase ? '✓' : '○'}
                                                </span>
                                                <span className={`text-xs ${passwordValidation.hasLowerCase ? 'text-green-600' : 'text-gray-600'}`}>
                                                    One lowercase letter
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {passwordValidation.hasNumber ? '✓' : '○'}
                                                </span>
                                                <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-600' : 'text-gray-600'}`}>
                                                    One number
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                                                    {passwordValidation.hasSpecialChar ? '✓' : '○'}
                                                </span>
                                                <span className={`text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-600'}`}>
                                                    One special character (!@#$%^&*)
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={(signupEmail.length > 0 || password.length > 0) && !isFormValid}
                                className="px-6 py-3 bg-mySecondary text-white rounded-md hover:bg-[#2b2b2b] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sign up
                            </button>
                        </form>

                        <div className="mt-4 text-center text-sm">
                            <span className="text-gray-600">Already have an account? </span>
                            <button
                                onClick={() => {
                                    setView('signin')
                                    setError(null) // Clear error when switching views
                                    setSignupEmail('') // Clear signup email when switching views
                                    setEmailTouched(false)
                                    setPassword('') // Clear password when switching views
                                    setPasswordFocused(false)
                                }}
                                className="text-mySecondary hover:underline font-medium"
                            >
                                Sign in
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
