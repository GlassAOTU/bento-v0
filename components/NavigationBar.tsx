// components/NavigationBar.tsx
'use client';

import { createClient } from '@/lib/supabase/browser-client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import WaitlistPopup from './WaitlistPopup';
import AuthModal from './AuthModal';
import UsernameSetupModal from './UsernameSetupModal';
import EditProfileModal from './EditProfileModal';
import { trackUserSignout } from '@/lib/analytics/events';
import { useAuth } from '@/lib/auth/AuthContext';
import { useTheme } from '@/lib/theme/ThemeContext';
import ThemeToggle from './ThemeToggle';

export default function NavigationBar() {
    const pathname = usePathname();
    const { user, profile, loading, profileLoading, hasProfile, refreshProfile } = useAuth();
    const { theme } = useTheme();
    const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [authModalView, setAuthModalView] = useState<'signin' | 'signup'>('signin');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUsernameSetupOpen, setIsUsernameSetupOpen] = useState(false);
    const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

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
                <div className="w-full px-10 m-4 items-center bg-white dark:bg-darkBg flex flex-row max-w-7xl justify-between">
                    {/* Logo */}
                    <a href="/" className="flex-shrink-0">
                        <Image
                            src={theme === 'dark' ? '/images/White Cat.png' : '/images/Black Cat.png'}
                            alt="Bento Logo"
                            width={52}
                            height={52}
                            className="w-[52px] h-[52px] object-contain"
                        />
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
                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-600 hover:opacity-80 transition-opacity">
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

                    {/* Mobile Hamburger Menu Button */}
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="md:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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
                <div className="md:hidden bg-white dark:bg-darkBg border-t border-gray-200 dark:border-gray-700 shadow-lg">
                    <div className="max-w-7xl mx-auto px-10 py-6 space-y-4">
                        {/* Navigation Links */}
                        <a
                            href="/"
                            className={`block py-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${pathname === '/' ? 'font-semibold' : ''}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            recommendations
                        </a>
                        <a
                            href="/discover"
                            className={`block py-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${pathname === '/discover' ? 'font-semibold' : ''}`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            discover
                        </a>
                        {user && (
                            <a
                                href="/watchlists?tab=watchlist"
                                className={`block py-2 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${pathname === '/watchlists' ? 'font-semibold' : ''}`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                my anime
                            </a>
                        )}

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Theme</span>
                            <ThemeToggle />
                        </div>

                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                            {loading ? (
                                <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
                            ) : user ? (
                                <>
                                    <div className="flex items-center justify-between gap-4">
                                        <button
                                            onClick={() => {
                                                handleSignOut();
                                                setIsMobileMenuOpen(false);
                                            }}
                                            className="text-sm font-medium hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        >
                                            Sign Out
                                        </button>
                                        <button
                                            onClick={() => {
                                                setIsEditProfileModalOpen(true)
                                                setIsMobileMenuOpen(false)
                                            }}
                                        >
                                            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-pink-600 hover:opacity-80 transition-opacity">
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
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            setAuthModalView('signin');
                                            setIsAuthModalOpen(true);
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className="block w-full text-center py-2 px-4 rounded-md border border-mySecondary dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
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
                                        Create Account
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