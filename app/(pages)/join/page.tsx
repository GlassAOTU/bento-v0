'use client'

import NavigationBar from "@/components/NavigationBar";
import Image from "next/image";
import { useState } from 'react';

export default function JoinPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const passwordIsStrong = (pwd: string) => {
        const re = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/;
        return re.test(pwd);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!email) return setError('Please provide an email');
        if (!password) return setError('Please provide a password');
        if (!passwordIsStrong(password)) return setError('Password must be at least 8 characters and include uppercase, lowercase, number and special character.');
        if (password !== confirmPassword) return setError('Passwords do not match');

        setLoading(true);
        try {
            const res = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || 'Unable to create account');
            } else {
                setSuccess('Account created — check your email for verification');
                setName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
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

                    {/* Signup Form Section */}
                    <section className="px-10">
                        <h1 className="text-3xl font-bold mb-6">Join Bento</h1>
                        <p className="mb-6 text-lg">Create your account to get personalized anime recommendations.</p>

                        <form onSubmit={onSubmit} className="flex flex-col gap-4 max-w-md bg-white p-6 rounded-md shadow-sm border">
                            {error && <div className="text-sm text-red-600">{error}</div>}
                            {success && <div className="text-sm text-green-600">{success}</div>}

                            <input
                                type="text"
                                name="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Full name"
                                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mySecondary"
                            />

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

                            <input
                                type="password"
                                name="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm password"
                                required
                                className="px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-mySecondary"
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-3 bg-mySecondary text-white rounded-md hover:bg-[#2b2b2b] focus:outline-none focus:ring-2 focus:ring-mySecondary font-medium disabled:opacity-60"
                            >
                                {loading ? 'Creating...' : 'Create account'}
                            </button>

                            <p className="text-sm text-gray-500 mt-2">By creating an account you agree to our terms and privacy policy.</p>
                        </form>
                    </section>

                    <div className="px-10">
                        <hr />
                    </div>

                </div>
            </div>

        </div>
    );
}