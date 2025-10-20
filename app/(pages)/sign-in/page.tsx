'use client'

import NavigationBar from "@/components/NavigationBar";
import Image from "next/image";
import { useState } from "react";

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!email) return setError('Please enter email');
        if (!password) return setError('Please enter password');

        setLoading(true);
        try {
            const res = await fetch('/api/auth/sign-in', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || 'Unable to sign in');
            } else {
                // redirect to home
                window.location.href = '/';
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    const [showReset, setShowReset] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetMsg, setResetMsg] = useState<string | null>(null);
    const [resetLoading, setResetLoading] = useState(false);

    const onReset = async (e?: React.FormEvent) => {
        if (e && typeof e.preventDefault === 'function') e.preventDefault();
        setResetMsg(null);
        if (!resetEmail) return setResetMsg('Please provide your email');
        setResetLoading(true);
        try {
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: resetEmail }),
            });
            const data = await res.json();
            if (!res.ok) setResetMsg(data?.error || 'Unable to send reset email');
            else setResetMsg('If an account exists, a password reset email has been sent');
        } catch (err: any) {
            setResetMsg(err?.message || 'Network error');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="bg-white">

            <NavigationBar />

            <div className="min-h-screen text-mySecondary pb-16 font-instrument-sans">
                {/* Page content */}
                <div className="max-w-5xl flex flex-col mx-auto gap-8">

                    {/* Banner */}
                    <section className="flex justify-center sm:px-10 md:mb-10">
                        <div className="relative max-w-[1200px]">
                            <Image
                                src="/images/header-image.png"
                                alt="Banner"
                                width={600}
                                height={300}
                                className="hidden sm:inline w-full h-auto [mask-image:linear-gradient(to_top,transparent_0%,black_10%)]"
                            />
                            <Image
                                src="/images/header-image-mobile.png"
                                alt="Banner"
                                width={600}
                                height={300}
                                className="sm:hidden w-full h-auto [mask-image:linear-gradient(to_top,transparent_0%,black_10%)]"
                            />
                        </div>
                    </section>

                    {/* Login Form Section */}
                    <section className="px-10">
                        <h1 className="text-3xl font-bold mb-6">Welcome Back</h1>
                        <p className="mb-6 text-lg">Sign in to your account to continue getting personalized anime recommendations.</p>

                        <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md bg-white p-6 rounded-md shadow-sm border">
                            {error && <div className="text-sm text-red-600">{error}</div>}
                            <input
                                type="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required
                                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mySecondary"
                            />
                            <input
                                type="password"
                                name="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Password"
                                required
                                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mySecondary"
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-mySecondary text-white rounded-md hover:bg-[#2b2b2b] focus:outline-none focus:ring-2 focus:ring-mySecondary font-medium"
                            >
                                {loading ? 'Signing in...' : 'Sign in'}
                            </button>
                            <p className="text-sm text-gray-500 mt-2">Don't have an account? <a href="/sign-up" className="text-mySecondary font-semibold">Create one</a></p>
                            <div className="mt-3">
                                <button type="button" onClick={() => setShowReset(s => !s)} className="text-sm text-mySecondary underline">Forgot password?</button>
                            </div>
                        </form>

                        {showReset && (
                            <div className="mt-3 max-w-md bg-white p-4 rounded-md shadow-sm border">
                                {resetMsg && <div className="text-sm text-gray-700 mb-2">{resetMsg}</div>}
                                <div className="flex">
                                    <input
                                        type="email"
                                        value={resetEmail}
                                        onChange={e => setResetEmail(e.target.value)}
                                        placeholder="Email to reset"
                                        className="px-3 py-2 border rounded-l w-full"
                                    />
                                    <button onClick={(e) => onReset(e)} disabled={resetLoading} className="px-3 py-2 bg-mySecondary text-white rounded-r">
                                        {resetLoading ? 'Sending...' : 'Send reset'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </section>

                    <div className="px-10">
                        <hr />
                    </div>

                </div>
            </div>
        </div>
    )
}