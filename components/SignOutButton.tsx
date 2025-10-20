"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser-client';

export default function SignOutButton() {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSignOut = async () => {
        setLoading(true);
        try {
            const supabase = await createClient();
            await supabase.auth.signOut();
            try {
                await fetch('/api/auth/signout', { method: 'POST' });
            } catch (e) {
                // ignore
            }
            router.replace('/');
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleSignOut}
            disabled={loading}
            className="text-sm p-2 rounded-md border border-red-500 text-red-500 hover:bg-red-50 transition-colors"
        >
            {loading ? 'Signing out...' : 'Sign out'}
        </button>
    );
}
