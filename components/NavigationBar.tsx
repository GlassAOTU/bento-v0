// components/NavigationBar.tsx
'use client';

import { createClient } from '@/lib/supabase/browser-client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { User } from '@supabase/supabase-js';
import Image from 'next/image';
import WaitlistPopup from './WaitlistPopup';
import AuthModal from './AuthModal';
import { identifyUser, trackUserSignout } from '@/lib/analytics/events';

export default function NavigationBar() {
    const pathname = usePathname();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalView, setAuthModalView] = useState<'signin' | 'signup'>('signin');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const initAuth = async () => {
            const supabase = createClient();

            // Get initial session
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);


            // Listen for auth changes
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);

                // Identify user in PostHog
                if (session?.user) {
                    identifyUser(session.user.id, {
                        email: session.user.email,
                        created_at: session.user.created_at
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
        trackUserSignout();
        await supabase.auth.signOut();
        setUser(null); // Immediately update UI
    };

    return (
        <>
            <div className="flex justify-center">
                <div className="w-full px-10 m-4 items-center bg-white flex flex-row max-w-5xl justify-between">
                    {/* Logo */}
                    <a href="/" className="flex-shrink-0">
                        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M52 26C52 40.3594 40.3594 52 26 52C11.6406 52 0 40.3594 0 26C0 11.6406 11.6406 0 26 0C40.3594 0 52 11.6406 52 26Z" fill="#292929"/>
                            <path d="M30.2068 49.5888C27.0997 49.5888 24.5105 48.8552 22.4391 47.388C20.3677 45.8776 19.0084 43.7846 18.361 41.1091L19.0084 40.9796V49.0062L13.1 48.5792L13.3 3.30745L19.332 2.4V23.567L18.62 23.3728C19.3536 20.8699 20.7777 18.9064 22.8922 17.4823C25.0499 16.0582 27.6391 15.3462 30.6599 15.3462C33.6375 15.3462 36.2052 16.0582 38.3629 17.4823C40.5637 18.9064 42.2467 20.8915 43.4119 23.4375C44.6202 25.9836 45.2244 28.9612 45.2244 32.3704C45.2244 35.8227 44.5986 38.8435 43.3472 41.4327C42.0957 44.022 40.348 46.0286 38.104 47.4527C35.86 48.8768 33.2276 49.5888 30.2068 49.5888ZM28.7827 44.022C31.7172 44.022 34.0475 42.9863 35.7737 40.9149C37.4998 38.8435 38.3629 35.9953 38.3629 32.3704C38.3629 28.7886 37.4998 26.0052 35.7737 24.0201C34.0475 21.9919 31.6956 20.9778 28.718 20.9778C25.7835 20.9778 23.4316 22.0135 21.6623 24.0848C19.9362 26.1131 19.0731 28.9397 19.0731 32.5646C19.0731 36.1032 19.9362 38.9082 21.6623 40.9796C23.4316 43.0078 25.8051 44.022 28.7827 44.022Z" fill="white"/>
                        </svg>
                    </a>

                    {/* Desktop Navigation Links */}
                    <div className="flex-row gap-12 hidden md:flex md:justify-center">
                        <a href="/" className={pathname === '/' ? 'font-semibold' : ''}>
                            recommendations
                        </a>
                        <a href="/discover" className={pathname === '/discover' ? 'font-semibold' : ''}>
                            discover
                        </a>
                        {user && (
                            <a href="/watchlists?tab=watchlist" className={pathname === '/watchlists' ? 'font-semibold' : ''}>
                                my anime
                            </a>
                        )}
                    </div>

                    {/* Desktop Auth Buttons */}
                    <div className="hidden md:flex gap-4 items-center">
                        {loading ? (
                            <div className="text-sm text-gray-500">Loading...</div>
                        ) : user ? (
                            <div className="flex gap-4 items-center">
                                <button
                                    onClick={handleSignOut}
                                    className="text-sm font-medium hover:text-gray-600 transition-colors"
                                >
                                    Sign Out
                                </button>
                                <a
                                    href="/watchlists?tab=recent-searches"
                                    className="block"
                                >
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-600 hover:opacity-80 transition-opacity">
                                        {user.user_metadata?.avatar_url ? (
                                            <Image
                                                src={user.user_metadata.avatar_url}
                                                alt="Profile"
                                                width={40}
                                                height={40}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                                {user.email?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                </a>
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

                    {/* Mobile Hamburger Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 rounded-md hover:bg-gray-100 transition-colors"
                        aria-label="Toggle menu"
                    >
                        {isMobileMenuOpen ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                            </svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12" />
                                <line x1="3" y1="6" x2="21" y2="6" />
                                <line x1="3" y1="18" x2="21" y2="18" />
                            </svg>
                        )}
                    </button>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
                    <div className="max-w-5xl mx-auto px-10 py-6 space-y-4">
                        {/* Navigation Links */}
                        <a
                            href="/"
                            className={`block py-2 hover:text-gray-600 transition-colors ${pathname === '/' ? 'font-semibold' : ''}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            recommendations
                        </a>
                        <a
                            href="/discover"
                            className={`block py-2 hover:text-gray-600 transition-colors ${pathname === '/discover' ? 'font-semibold' : ''}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            discover
                        </a>
                        {user && (
                            <a
                                href="/watchlists?tab=watchlist"
                                className={`block py-2 hover:text-gray-600 transition-colors ${pathname === '/watchlists' ? 'font-semibold' : ''}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                my anime
                            </a>
                        )}

                        <div className="pt-4 border-t border-gray-200 space-y-3">
                            {loading ? (
                                <div className="text-sm text-gray-500">Loading...</div>
                            ) : user ? (
                                <>
                                    <div className="flex items-center justify-between gap-4">
                                        <button
                                            onClick={() => {
                                                handleSignOut();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="text-sm font-medium hover:text-gray-600 transition-colors"
                                        >
                                            Sign Out
                                        </button>
                                        <a
                                            href="/watchlists?tab=recent-searches"
                                            onClick={() => setIsMobileMenuOpen(false)}
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-600 hover:opacity-80 transition-opacity">
                                                {user.user_metadata?.avatar_url ? (
                                                    <Image
                                                        src={user.user_metadata.avatar_url}
                                                        alt="Profile"
                                                        width={40}
                                                        height={40}
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                                        {user.email?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        </a>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setAuthModalView('signin');
                                            setIsAuthModalOpen(true);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="block w-full text-center py-2 px-4 rounded-md border border-mySecondary hover:bg-gray-50 transition-colors"
                                    >
                                        Login
                                    </button>
                                    <button
                                        onClick={() => {
                                            setAuthModalView('signup');
                                            setIsAuthModalOpen(true);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="block w-full text-center py-2 px-4 rounded-md bg-mySecondary text-white hover:bg-[#2b2b2b] transition-colors"
                                    >
                                        Join
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Waitlist Popup */}
            {isWaitlistOpen && <WaitlistPopup onClose={() => setIsWaitlistOpen(false)} />}

            {/* Auth Modal */}
            <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                initialView={authModalView}
            />
        </>
    );
}