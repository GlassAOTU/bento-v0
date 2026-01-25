// components/NavigationBar.tsx
'use client';

import { createClient } from '@/lib/supabase/browser-client';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import WaitlistPopup from './WaitlistPopup';
import AuthModal from './AuthModal';
import UsernameSetupModal from './UsernameSetupModal';
import EditProfileModal from './EditProfileModal';
import { trackUserSignout } from '@/lib/analytics/events';
import { useAuth } from '@/lib/auth/AuthContext';
import ThemeToggle from './ThemeToggle';

export default function NavigationBar() {
    const pathname = usePathname();
    const { user, profile, loading, profileLoading, hasProfile, refreshProfile } = useAuth();
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalView, setAuthModalView] = useState<'signin' | 'signup'>('signin');
    const [isPageDropdownOpen, setIsPageDropdownOpen] = useState(false);
    const [isUsernameSetupOpen, setIsUsernameSetupOpen] = useState(false);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsPageDropdownOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Get current page name for mobile dropdown
    const getCurrentPageName = () => {
        if (pathname === '/discover') return 'discover';
        if (pathname === '/watchlists' || pathname?.startsWith('/watchlists')) return 'my anime';
        return 'recommendations';
    };

    // Show username setup modal only after both auth and profile checks are complete
    useEffect(() => {
        // Wait for both auth and profile loading to finish
        if (!loading && !profileLoading) {
            // Only show modal if user exists but has no profile
            if (user && !hasProfile) {
                setIsUsernameSetupOpen(true);
            } else {
                setIsUsernameSetupOpen(false);
            }
        }
    }, [user, hasProfile, loading, profileLoading]);

    const handleSignOut = async () => {
        const supabase = createClient();
        trackUserSignout();
        await supabase.auth.signOut();
        // AuthContext will handle updating user state via onAuthStateChange
    };

    return (
        <>
            <div className="flex justify-center">
                <div className="w-full px-4 md:px-10 m-4 items-center bg-white dark:bg-darkBg flex flex-row max-w-7xl justify-between">
                    {/* Logo + Mobile Page Dropdown */}
                    <div className="flex items-center gap-2">
                        <a href="/" className="flex-shrink-0">
                            {/* Desktop Logo - Light */}
                            <Image
                                src="/images/Black Cat.png"
                                alt="Bento Logo"
                                width={52}
                                height={52}
                                className="hidden md:block dark:md:hidden w-[52px] h-[52px] object-contain"
                            />
                            {/* Desktop Logo - Dark */}
                            <Image
                                src="/images/White Cat.png"
                                alt="Bento Logo"
                                width={52}
                                height={52}
                                className="hidden dark:md:block w-[52px] h-[52px] object-contain"
                            />
                            {/* Mobile Logo - Light */}
                            <Image
                                src="/images/Logo - Mobile.png"
                                alt="Bento Logo"
                                width={40}
                                height={40}
                                className="md:hidden dark:hidden w-10 h-10 object-contain"
                            />
                            {/* Mobile Logo - Dark */}
                            <Image
                                src="/images/Mobile Logo (Dark Mode).png"
                                alt="Bento Logo"
                                width={40}
                                height={40}
                                className="hidden dark:block dark:md:hidden w-10 h-10 object-contain"
                            />
                        </a>

                        {/* Mobile Page Dropdown */}
                        <div className="md:hidden relative" ref={dropdownRef}>
                            <button
                                onClick={() => setIsPageDropdownOpen(!isPageDropdownOpen)}
                                className="flex items-center gap-1 text-xs"
                            >
                                <span>{getCurrentPageName()}</span>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className={`transition-transform ${isPageDropdownOpen ? 'rotate-180' : ''}`}
                                >
                                    <polyline points="6 9 12 15 18 9" />
                                </svg>
                            </button>
                            {isPageDropdownOpen && (
                                <div className="absolute top-full left-0 mt-1 min-w-[140px] z-50">
                                    {getCurrentPageName() !== 'recommendations' && (
                                        <a
                                            href="/"
                                            className="flex items-center justify-between py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                            onClick={() => setIsPageDropdownOpen(false)}
                                        >
                                            <span>recommendations</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </a>
                                    )}
                                    {getCurrentPageName() !== 'discover' && (
                                        <a
                                            href="/discover"
                                            className="flex items-center justify-between py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                            onClick={() => setIsPageDropdownOpen(false)}
                                        >
                                            <span>discover</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </a>
                                    )}
                                    {user && getCurrentPageName() !== 'my anime' && (
                                        <a
                                            href="/watchlists?tab=watchlist"
                                            className="flex items-center justify-between py-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                            onClick={() => setIsPageDropdownOpen(false)}
                                        >
                                            <span>my anime</span>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6" />
                                            </svg>
                                        </a>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

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
                        <ThemeToggle />
                        {loading ? (
                            <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
                        ) : user ? (
                            <div className="flex gap-4 items-center">
                                <button
                                    onClick={handleSignOut}
                                    className="text-sm font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                >
                                    Sign Out
                                </button>
                                <button
                                    onClick={() => setIsEditProfileModalOpen(true)}
                                    className="block"
                                >
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-gradient-to-br from-purple-400 to-pink-600 hover:opacity-80 transition-opacity">
                                        {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                                            <Image
                                                src={profile?.avatar_url || user.user_metadata?.avatar_url}
                                                alt="Profile"
                                                width={40}
                                                height={40}
                                                className="w-full h-full object-contain"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                                                {user.email?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
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
                                    Create Account
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Mobile Auth Links */}
                    <div className="md:hidden flex items-center flex-shrink-0">
                        {loading ? null : user ? (
                            <button
                                onClick={() => setIsEditProfileModalOpen(true)}
                                className="block"
                            >
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-gradient-to-br from-purple-400 to-pink-600">
                                    {profile?.avatar_url || user.user_metadata?.avatar_url ? (
                                        <Image
                                            src={profile?.avatar_url || user.user_metadata?.avatar_url}
                                            alt="Profile"
                                            width={32}
                                            height={32}
                                            className="w-full h-full object-contain"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                                            {user.email?.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </button>
                        ) : (
                            <div className="flex items-center gap-3 text-xs whitespace-nowrap">
                                <button
                                    onClick={() => {
                                        setAuthModalView('signin');
                                        setIsAuthModalOpen(true);
                                    }}
                                    className="hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    log in
                                </button>
                                <button
                                    onClick={() => {
                                        setAuthModalView('signup');
                                        setIsAuthModalOpen(true);
                                    }}
                                    className="hover:text-gray-600 dark:hover:text-gray-300"
                                >
                                    create account
                                </button>
                            </div>
                        )}
                    </div>
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

            {/* Username Setup Modal */}
            <UsernameSetupModal
                isOpen={isUsernameSetupOpen}
                onClose={() => setIsUsernameSetupOpen(false)}
                onSuccess={() => {
                    refreshProfile(); // Refresh profile from AuthContext
                    setIsUsernameSetupOpen(false);
                }}
            />

            {/* Edit Profile Modal */}
            {profile && (
                <EditProfileModal
                    isOpen={isEditProfileModalOpen}
                    onClose={() => setIsEditProfileModalOpen(false)}
                    onSuccess={refreshProfile}
                    profile={{
                        username: profile.username,
                        display_name: profile.display_name,
                        bio: profile.bio,
                        avatar_url: profile.avatar_url
                    }}
                    userEmail={user?.email}
                    isEmailProvider={!user?.app_metadata?.provider || user?.app_metadata?.provider === 'email'}
                />
            )}
        </>
    );
}