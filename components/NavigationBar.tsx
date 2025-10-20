// components/NavigationBar.tsx
"use client";

import { createClient } from '@/lib/supabase/browser-client';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import WaitlistPopup from './WaitlistPopup';
import { useRouter } from 'next/navigation';

export default function NavigationBar() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const initAuth = async () => {
            const supabase = await createClient();

            // Get initial session
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        };

        initAuth();
    }, []);

    // Keep sign out logic here for reuse by a dedicated SignOutButton on the account page
    const handleSignOut = async () => {
        const supabase = await createClient();
        await supabase.auth.signOut();
        setUser(null);
        try {
            await fetch('/api/auth/signout', { method: 'POST' });
        } catch (e) {
            // ignore
        }

        router.replace('/');
    };

    return (
        <div className="flex justify-center">
            <div className="w-full px-10 m-4 items-center bg-white flex flex-row max-w-5xl justify-between">
                {/* Waitlist Button */}
                <button
                    onClick={() => setIsWaitlistOpen(true)}
                    className="text-sm p-2 rounded-md border border-mySecondary hover:border-mySecondary transition-colors"
                >
                    join the waitlist
                </button>

                {/* Navigation Links */}
                <div className="flex-row gap-12 hidden md:flex md:justify-center">
                    <a href="/" className="font-semibold">
                        recommendations
                    </a>
                </div>

                {/* Auth Buttons */}
                <div className="flex gap-2">
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading...</div>
                    ) : user ? (
                        <div className="flex gap-2">
                            <a
                                href="/account"
                                className="text-sm p-2 rounded-md border border-mySecondary hover:border-mySecondary transition-colors"
                            >
                                Account
                            </a>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <a
                                href="/sign-in"
                                className="text-sm p-2 rounded-md border border-mySecondary hover:border-mySecondary transition-colors"
                            >
                                Login
                            </a>
                            <a
                                href="/sign-up"
                                className="text-sm p-2 rounded-md bg-mySecondary text-white hover:bg-[#2b2b2b] transition-colors"
                            >
                                Join
                            </a>
                        </div>
                    )}
                </div>
            </div>

            {/* Waitlist Popup */}
            {isWaitlistOpen && <WaitlistPopup onClose={() => setIsWaitlistOpen(false)} />}
        </div>
    );
}