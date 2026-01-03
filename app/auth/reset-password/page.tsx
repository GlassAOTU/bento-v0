'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/browser-client'

function ResetPasswordForm() {
    const router = useRouter()
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    // Password validation rules
    const passwordValidation = {
        minLength: password.length >= 8,
        hasUpperCase: /[A-Z]/.test(password),
        hasLowerCase: /[a-z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    }

    const isPasswordValid = Object.values(passwordValidation).every(Boolean)
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

    const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!isPasswordValid) {
            setError('Please meet all password requirements')
            return
        }

        if (!passwordsMatch) {
            setError('Passwords do not match')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const supabase = await createClient()
            const { error } = await supabase.auth.updateUser({
                password: password
            })

            setLoading(false)

            if (error) {
                console.error('Password reset error:', error.message)
                setError(error.message)
            } else {
                console.log('Password reset successful')
                setSuccess(true)
                // Redirect to home page after 2 seconds
                setTimeout(() => {
                    router.push('/')
                }, 2000)
            }
        } catch (err) {
            setLoading(false)
            setError('Failed to reset password')
            console.error('Password reset error:', err)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkBg px-4">
                <div className="bg-white dark:bg-darkInput rounded-lg w-full max-w-md p-8 text-center">
                    <div className="mb-4 text-4xl">✓</div>
                    <h2 className="text-3xl font-bold mb-4 dark:text-white">Password reset successful!</h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">
                        Your password has been updated successfully.
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Redirecting you to the home page...
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkBg px-4">
            <div className="bg-white dark:bg-darkInput rounded-lg w-full max-w-md p-8">
                <h2 className="text-4xl font-bold mb-2 text-center dark:text-white">Reset your password</h2>
                <p className="text-base text-gray-400 dark:text-gray-500 mb-8 text-center">
                    Enter your new password below
                </p>

                {/* Error Message */}
                {error && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                        <span className="text-red-600 dark:text-red-400 text-sm">⚠️</span>
                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                    </div>
                )}

                <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
                    {/* Password Field */}
                    <div>
                        <label htmlFor="password" className="block text-base font-normal mb-2 dark:text-white">
                            New Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 border dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-white"
                        />

                        {/* Password Requirements */}
                        {password.length > 0 && (
                            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600">
                                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Password must contain:</p>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${passwordValidation.minLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {passwordValidation.minLength ? '✓' : '○'}
                                        </span>
                                        <span className={`text-xs ${passwordValidation.minLength ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                            At least 8 characters
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${passwordValidation.hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {passwordValidation.hasUpperCase ? '✓' : '○'}
                                        </span>
                                        <span className={`text-xs ${passwordValidation.hasUpperCase ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                            One uppercase letter
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${passwordValidation.hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {passwordValidation.hasLowerCase ? '✓' : '○'}
                                        </span>
                                        <span className={`text-xs ${passwordValidation.hasLowerCase ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                            One lowercase letter
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {passwordValidation.hasNumber ? '✓' : '○'}
                                        </span>
                                        <span className={`text-xs ${passwordValidation.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                            One number
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                                            {passwordValidation.hasSpecialChar ? '✓' : '○'}
                                        </span>
                                        <span className={`text-xs ${passwordValidation.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                            One special character (!@#$%^&*)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Confirm Password Field */}
                    <div>
                        <label htmlFor="confirm-password" className="block text-base font-normal mb-2 dark:text-white">
                            Confirm New Password
                        </label>
                        <input
                            id="confirm-password"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 bg-white dark:bg-gray-700 dark:text-white ${
                                confirmPassword.length > 0 && !passwordsMatch
                                    ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
                                    : 'dark:border-gray-600 focus:ring-blue-500'
                            }`}
                        />
                        {confirmPassword.length > 0 && !passwordsMatch && (
                            <p className="mt-1 text-xs text-red-600 dark:text-red-400">Passwords do not match</p>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading || !isPasswordValid || !passwordsMatch}
                        className="w-full py-4 bg-[#F9F9F9] dark:bg-gray-700 text-black dark:text-white rounded-[6px] border-[0.5px] border-black dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium text-base mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Resetting password...' : 'Reset password'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-darkBg px-4">
                <div className="text-gray-600 dark:text-gray-400">Loading...</div>
            </div>
        }>
            <ResetPasswordForm />
        </Suspense>
    )
}
