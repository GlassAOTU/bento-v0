"use client";

import { useEffect, useState } from "react";
import { createClient } from '@/lib/supabase/browser-client';
import { useRouter } from 'next/navigation';

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const init = async () => {
            const supabase = createClient();
            try {
                // Parse access_token and refresh_token from URL hash or search params
                const parseTokens = () => {
                    try {
                        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
                        const params = new URLSearchParams(hash || window.location.search);
                        const access_token = params.get('access_token');
                        const refresh_token = params.get('refresh_token');
                        return { access_token, refresh_token };
                    } catch {
                        return { access_token: null, refresh_token: null };
                    }
                };

                const { access_token, refresh_token } = parseTokens();
                if (access_token) {
                    try {
                        // @ts-ignore - setSession exists on the client
                        await supabase.auth.setSession({ access_token, refresh_token });
                        // Clean URL to avoid leaking tokens
                        window.history.replaceState({}, document.title, window.location.pathname + window.location.search.replace(/(#.*$)/, ''));
                    } catch (e) {
                        // ignore
                    }
                }

                // Verify authenticated user exists after attempting to set session from URL tokens.
                try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                        // No valid session — redirect to home where users can request a reset.
                        router.replace('/');
                        return;
                    }
                } catch {
                    router.replace('/');
                    return;
                }
            } catch (e) {
                // ignore
            }
            setReady(true);
        };
        init();
    }, []);

    const passwordIsStrong = (pwd: string) => {
        const re = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/;
        return re.test(pwd);
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!password) return setError('Please enter a new password');
        if (!passwordIsStrong(password)) return setError('Password must be at least 8 characters and include uppercase, lowercase, number and special character.');
        if (password !== confirm) return setError('Passwords do not match');

        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase.auth.updateUser({ password });
            if (error) {
                setError(error.message);
            } else {
                setSuccess('Password updated. Redirecting...');
                setTimeout(() => router.replace('/account'), 1200);
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    if (!ready) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-white p-8">
            <div className="max-w-md w-full bg-white p-6 rounded-md shadow-sm border">
                <h2 className="text-xl font-semibold mb-4">Reset your password</h2>
                <p className="text-sm text-gray-600 mb-4">Enter a new password that meets the requirements.</p>
                {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
                {success && <div className="mb-3 text-sm text-green-600">{success}</div>}
                <form onSubmit={onSubmit} className="flex flex-col gap-3">
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="New password" className="px-3 py-2 border rounded" />
                    <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm new password" className="px-3 py-2 border rounded" />
                    <button type="submit" disabled={loading} className="px-4 py-2 bg-mySecondary text-white rounded">{loading ? 'Updating...' : 'Update password'}</button>
                </form>
            </div>
        </main>
    );
}
