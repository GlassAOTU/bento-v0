"use client";

import { useState } from "react";

export default function ChangePasswordForm() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const passwordIsStrong = (pwd: string) => {
        // Minimum 8 chars, at least one lowercase, one uppercase, one number and one special char
        const re = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/;
        return re.test(pwd);
    };

    const validate = () => {
        setError(null);
        if (!currentPassword) return setError("Please enter your current password.");
        if (!newPassword) return setError("Please enter a new password.");
        if (!passwordIsStrong(newPassword)) return setError("New password must be at least 8 characters and include uppercase, lowercase, number and special character.");
        if (newPassword !== confirmPassword) return setError("New password and confirmation do not match.");
        return true;
    };

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSuccess(null);
        setError(null);

        if (validate() !== true) return;

        setLoading(true);
        try {
            const res = await fetch('/api/account/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword, newPassword }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data?.error || 'Unable to change password');
            } else {
                setSuccess(data?.message || 'Password changed successfully');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (err: any) {
            setError(err?.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={onSubmit} className="max-w-lg mx-auto p-4 bg-white rounded-md shadow-sm border">
            <h3 className="text-lg font-semibold mb-4">Change password</h3>

            {error && <div className="mb-3 text-sm text-red-600">{error}</div>}
            {success && <div className="mb-3 text-sm text-green-600">{success}</div>}

            <label className="block mb-2 text-sm">Current password</label>
            <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full p-2 mb-3 border rounded"
                required
            />

            <label className="block mb-2 text-sm">New password</label>
            <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2 mb-3 border rounded"
                required
            />

            <label className="block mb-2 text-sm">Confirm new password</label>
            <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2 mb-4 border rounded"
                required
            />

            <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-mySecondary text-white rounded disabled:opacity-60"
            >
                {loading ? 'Updating...' : 'Change password'}
            </button>
        </form>
    );
}
