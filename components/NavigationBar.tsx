// components/NavigationBar.tsx
'use client';

import { createClient } from '@/lib/supabase/browser-client';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import WaitlistPopup from './WaitlistPopup';
import AuthModal from './AuthModal';

export default function NavigationBar() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalView, setAuthModalView] = useState<'signin' | 'signup'>('signin');

    useEffect(() => {
        const initAuth = async () => {
            const supabase = createClient();

            // Get initial session
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);

            // Log user details to console
            if (user) {
                console.log('Current user:', {
                    id: user.id,
                    email: user.email,
                    email_confirmed_at: user.email_confirmed_at,
                    confirmed_at: user.confirmed_at,
                    created_at: user.created_at,
                    last_sign_in_at: user.last_sign_in_at,
                    is_email_confirmed: !!user.email_confirmed_at,
                });
            }

            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);

                // Log on auth state change
                if (session?.user) {
                    console.log('Auth state changed:', {
                        id: session.user.id,
                        email: session.user.email,
                        email_confirmed_at: session.user.email_confirmed_at,
                        is_email_confirmed: !!session.user.email_confirmed_at,
                    });

                    // Close auth modal when user signs in
                    setIsAuthModalOpen(false);
                }
            });

            return () => subscription.unsubscribe();
        };

        initAuth();
    }, []);

    const handleSignOut = async () => {
        const supabase = createClient();
        await supabase.auth.signOut();
        setUser(null); // Immediately update UI
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
                        discover
                    </a>
                    <a href="/recommendation" className="font-semibold">
                        recommendations
                    </a>
                    {user && (
                        <a href="/watchlists?tab=watchlist" className="font-semibold">
                            watchlist
                        </a>
                    )}
                </div>

                {/* Auth Buttons */}
                <div className="flex gap-2">
                    {loading ? (
                        <div className="text-sm text-gray-500">Loading...</div>
                    ) : user ? (
                        <div className="flex gap-2">
                            <a
                                href="/watchlists?tab=recent-searches"
                                className="text-sm p-2 rounded-md border border-mySecondary hover:border-mySecondary transition-colors"
                            >
                                Account
                            </a>
                            <button
                                onClick={handleSignOut}
                                className="text-sm p-2 rounded-md border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
                            >
                                Sign out
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setAuthModalView('signin');
                                    setIsAuthModalOpen(true);
                                }}
                                className="text-sm p-2 rounded-md border border-mySecondary hover:border-mySecondary transition-colors"
                            >
                                Login
                            </button>
                            <button
                                onClick={() => {
                                    setAuthModalView('signup');
                                    setIsAuthModalOpen(true);
                                }}
                                className="text-sm p-2 rounded-md bg-mySecondary text-white hover:bg-[#2b2b2b] transition-colors"
                            >
                                Join
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Waitlist Popup */}
            {isWaitlistOpen && <WaitlistPopup onClose={() => setIsWaitlistOpen(false)} />}

            {/* Auth Modal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialView={authModalView}
            />
        </div>
    );
}