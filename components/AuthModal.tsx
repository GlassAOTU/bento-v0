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
    const [view, setView] = useState<'signin' | 'signup' | 'confirmation' | 'forgot-password' | 'password-reset-sent'>(initialView)
    const [email, setEmail] = useState('')
    const [resendLoading, setResendLoading] = useState(false)
    const [resendSuccess, setResendSuccess] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [signupEmail, setSignupEmail] = useState('')
    const [emailTouched, setEmailTouched] = useState(false)
    const [password, setPassword] = useState('')
    const [passwordFocused, setPasswordFocused] = useState(false)
    const [signinEmail, setSigninEmail] = useState('')
    const [signinPassword, setSigninPassword] = useState('')
    const [resetEmail, setResetEmail] = useState('')
    const [resetLoading, setResetLoading] = useState(false)

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const isEmailValid = signupEmail.length === 0 || emailRegex.test(signupEmail)
    const isResetEmailValid = resetEmail.length === 0 || emailRegex.test(resetEmail)

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
            setSigninEmail('') // Clear signin email when modal opens
            setSigninPassword('') // Clear signin password when modal opens
        }
    }, [isOpen, initialView])

    // Clear form state when view changes
    useEffect(() => {
        setError(null)
        setSignupEmail('')
        setEmailTouched(false)
        setPassword('')
        setPasswordFocused(false)
        setSigninEmail('')
        setSigninPassword('')
        // Don't clear resetEmail when showing the confirmation screen
        if (view !== 'password-reset-sent') {
            setResetEmail('')
        }
        setResetLoading(false)
    }, [view])

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

    const handlePasswordReset = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!isResetEmailValid || resetEmail.length === 0) {
            setError('Please enter a valid email address')
            return
        }

        setResetLoading(true)
        setError(null)

        try {
            const supabase = await createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
                redirectTo: `${window.location.origin}/auth/reset-password`,
            })

            setResetLoading(false)

            if (error) {
                console.error('[AuthModal] Password reset error:', error.message)
                setError(error.message)
            } else {
                console.log('[AuthModal] Password reset email sent to:', resetEmail)
                setView('password-reset-sent')
            }
        } catch (err) {
            setResetLoading(false)
            setError('Failed to send password reset email')
            console.error('[AuthModal] Password reset error:', err)
        }
    }

    const handleOAuthSignIn = async (provider: 'google' | 'facebook' | 'apple') => {
        try {
            console.log(`[AuthModal] Starting ${provider} OAuth sign in`)
            const supabase = await createClient()

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: provider,
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                }
            })

            if (error) {
                console.error(`[AuthModal] ${provider} OAuth error:`, error.message)
                setError(`Failed to sign in with ${provider}. Please try again.`)
            } else {
                console.log(`[AuthModal] ${provider} OAuth initiated successfully`)
                // User will be redirected to provider's auth page
                // After auth, they'll be redirected back to /auth/callback
                // The callback will handle the session and redirect to home
            }
        } catch (err) {
            console.error(`[AuthModal] ${provider} OAuth error:`, err)
            setError(`Failed to sign in with ${provider}. Please try again.`)
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
                            className="w-full py-4 bg-[#F9F9F9] text-black rounded-[6px] border-[0.5px] border-black hover:bg-gray-200 transition-colors font-medium"
                        >
                            Got it
                        </button>
                    </div>
                ) : view === 'signin' ? (
                    // Sign In Form
                    <div>
                        <h2 className="text-4xl font-bold mb-2 text-center">Sign In</h2>
                        <p className="text-base text-gray-400 mb-8 text-center">
                            Welcome back!
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
                        }} className="flex flex-col gap-5">
                            {/* Email Field */}
                            <div>
                                <label htmlFor="signin-email" className="block text-base font-normal mb-2">
                                    Email
                                </label>
                                <input
                                    id="signin-email"
                                    type="email"
                                    name="email"
                                    required
                                    value={signinEmail}
                                    onChange={(e) => setSigninEmail(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Password Field */}
                            <div>
                                <label htmlFor="signin-password" className="block text-base font-normal mb-2">
                                    Password
                                </label>
                                <input
                                    id="signin-password"
                                    type="password"
                                    name="password"
                                    required
                                    value={signinPassword}
                                    onChange={(e) => setSigninPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Sign In Button */}
                            <button
                                type="submit"
                                className="w-full py-4 bg-[#F9F9F9] text-black rounded-[6px] border-[0.5px] border-black hover:bg-gray-200 transition-colors font-medium text-base mt-2"
                            >
                                Sign In
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 border-t border-gray-300"></div>
                            <span className="text-sm text-gray-500">or</span>
                            <div className="flex-1 border-t border-gray-300"></div>
                        </div>

                        {/* OAuth Buttons */}
                        <div className="flex flex-col gap-3">
                            {/* Google */}
                            <button
                                type="button"
                                onClick={() => handleOAuthSignIn('google')}
                                className="w-full py-4 bg-white text-black rounded-[6px] border-[0.5px] border-gray-300 hover:bg-gray-50 transition-colors font-normal text-base flex items-center justify-center gap-3"
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
                                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
                                    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                                    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </button>

                            {/* Facebook */}
                            <button
                                type="button"
                                onClick={() => handleOAuthSignIn('facebook')}
                                className="w-full py-4 bg-white text-black rounded-[6px] border-[0.5px] border-gray-300 hover:bg-gray-50 transition-colors font-normal text-base flex items-center justify-center gap-3"
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 9C18 4.02944 13.9706 0 9 0C4.02944 0 0 4.02944 0 9C0 13.4922 3.29115 17.2155 7.59375 17.8907V11.6016H5.30859V9H7.59375V7.01719C7.59375 4.76156 8.93742 3.51562 10.9932 3.51562C11.9776 3.51562 13.0078 3.69141 13.0078 3.69141V5.90625H11.873C10.755 5.90625 10.4062 6.60001 10.4062 7.3125V9H12.9023L12.5033 11.6016H10.4062V17.8907C14.7088 17.2155 18 13.4922 18 9Z" fill="#1877F2"/>
                                </svg>
                                Continue with Facebook
                            </button>

                        </div>

                        {/* Forgot Password Link */}
                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => setView('forgot-password')}
                                className="text-sm text-black underline hover:text-gray-700"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Sign Up Link */}
                        <div className="mt-4 text-center text-sm">
                            <span className="text-gray-600">Don't have an account? </span>
                            <button
                                onClick={() => {
                                    setView('signup')
                                }}
                                className="text-mySecondary hover:underline font-medium"
                            >
                                Sign up
                            </button>
                        </div>
                    </div>
                ) : view === 'signup' ? (
                    // Sign Up Form
                    <div>
                        <h2 className="text-4xl font-bold mb-2 text-center">Create an account</h2>
                        <p className="text-base text-gray-400 mb-8 text-center">
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
                        }} className="flex flex-col gap-5">
                            {/* Email Field */}
                            <div>
                                <label htmlFor="signup-email" className="block text-base font-normal mb-2">
                                    Email
                                </label>
                                <input
                                    id="signup-email"
                                    type="email"
                                    name="email"
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

                            {/* Password Field */}
                            <div>
                                <label htmlFor="signup-password" className="block text-base font-normal mb-2">
                                    Password
                                </label>
                                <input
                                    id="signup-password"
                                    type="password"
                                    name="password"
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
                            {/* Sign Up Button */}
                            <button
                                type="submit"
                                disabled={(signupEmail.length > 0 || password.length > 0) && !isFormValid}
                                className="w-full py-4 bg-[#F9F9F9] text-black rounded-[6px] border-[0.5px] border-black hover:bg-gray-200 transition-colors font-medium text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Sign up
                            </button>
                        </form>

                        {/* Divider */}
                        <div className="flex items-center gap-4 my-6">
                            <div className="flex-1 border-t border-gray-300"></div>
                            <span className="text-sm text-gray-500">or</span>
                            <div className="flex-1 border-t border-gray-300"></div>
                        </div>

                        {/* OAuth Buttons */}
                        <div className="flex flex-col gap-3">
                            {/* Google */}
                            <button
                                type="button"
                                onClick={() => handleOAuthSignIn('google')}
                                className="w-full py-4 bg-white text-black rounded-[6px] border-[0.5px] border-gray-300 hover:bg-gray-50 transition-colors font-normal text-base flex items-center justify-center gap-3"
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17.64 9.20454C17.64 8.56636 17.5827 7.95272 17.4764 7.36363H9V10.845H13.8436C13.635 11.97 13.0009 12.9231 12.0477 13.5613V15.8195H14.9564C16.6582 14.2527 17.64 11.9454 17.64 9.20454Z" fill="#4285F4"/>
                                    <path d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5613C11.2418 14.1013 10.2109 14.4204 9 14.4204C6.65591 14.4204 4.67182 12.8372 3.96409 10.71H0.957275V13.0418C2.43818 15.9831 5.48182 18 9 18Z" fill="#34A853"/>
                                    <path d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957275C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957275 13.0418L3.96409 10.71Z" fill="#FBBC05"/>
                                    <path d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335"/>
                                </svg>
                                Continue with Google
                            </button>

                            {/* Facebook */}
                            <button
                                type="button"
                                onClick={() => handleOAuthSignIn('facebook')}
                                className="w-full py-4 bg-white text-black rounded-[6px] border-[0.5px] border-gray-300 hover:bg-gray-50 transition-colors font-normal text-base flex items-center justify-center gap-3"
                            >
                                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M18 9C18 4.02944 13.9706 0 9 0C4.02944 0 0 4.02944 0 9C0 13.4922 3.29115 17.2155 7.59375 17.8907V11.6016H5.30859V9H7.59375V7.01719C7.59375 4.76156 8.93742 3.51562 10.9932 3.51562C11.9776 3.51562 13.0078 3.69141 13.0078 3.69141V5.90625H11.873C10.755 5.90625 10.4062 6.60001 10.4062 7.3125V9H12.9023L12.5033 11.6016H10.4062V17.8907C14.7088 17.2155 18 13.4922 18 9Z" fill="#1877F2"/>
                                </svg>
                                Continue with Facebook
                            </button>

                        </div>

                        {/* Sign In Link */}
                        <div className="mt-6 text-center text-sm">
                            <span className="text-gray-600">Already have an account? </span>
                            <button
                                onClick={() => {
                                    setView('signin')
                                }}
                                className="text-mySecondary hover:underline font-medium"
                            >
                                Sign in
                            </button>
                        </div>
                    </div>
                ) : view === 'forgot-password' ? (
                    // Forgot Password Form
                    <div>
                        <h2 className="text-4xl font-bold mb-2 text-center">Reset password</h2>
                        <p className="text-base text-gray-400 mb-8 text-center">
                            Enter your email and we'll send you a link to reset your password
                        </p>

                        {/* Error Message */}
                        {error && (
                            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2">
                                <span className="text-red-600 text-sm">⚠️</span>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handlePasswordReset} className="flex flex-col gap-5">
                            {/* Email Field */}
                            <div>
                                <label htmlFor="reset-email" className="block text-base font-normal mb-2">
                                    Email
                                </label>
                                <input
                                    id="reset-email"
                                    type="email"
                                    name="email"
                                    required
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 ${
                                        error
                                            ? 'border-red-300 focus:ring-red-500'
                                            : 'border-gray-300 focus:ring-blue-500'
                                    }`}
                                />
                            </div>

                            {/* Send Reset Link Button */}
                            <button
                                type="submit"
                                disabled={resetLoading || !isResetEmailValid || resetEmail.length === 0}
                                className="w-full py-4 bg-[#F9F9F9] text-black rounded-[6px] border-[0.5px] border-black hover:bg-gray-200 transition-colors font-medium text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resetLoading ? 'Sending...' : 'Send reset link'}
                            </button>
                        </form>

                        {/* Back to Sign In Link */}
                        <div className="mt-6 text-center text-sm">
                            <button
                                onClick={() => setView('signin')}
                                className="text-mySecondary hover:underline font-medium"
                            >
                                ← Back to sign in
                            </button>
                        </div>
                    </div>
                ) : view === 'password-reset-sent' ? (
                    // Password Reset Sent Confirmation
                    <div className="text-center py-8">
                        <h2 className="text-3xl font-bold mb-4">Check your email</h2>
                        <p className="text-gray-600 mb-2">
                            If an account exists for
                        </p>
                        {resetEmail && (
                            <p className="text-gray-600 mb-4">
                                <span className="font-medium">{resetEmail}</span>
                            </p>
                        )}
                        <p className="text-sm text-gray-500 mb-6">
                            you will receive a password reset link. Click the link in the email to reset your password.
                        </p>

                        <button
                            onClick={() => setView('signin')}
                            className="w-full py-4 bg-[#F9F9F9] text-black rounded-[6px] border-[0.5px] border-black hover:bg-gray-200 transition-colors font-medium"
                        >
                            Back to sign in
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
