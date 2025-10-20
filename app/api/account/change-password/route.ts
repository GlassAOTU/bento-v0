import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { currentPassword, newPassword } = body ?? {};

        if (!currentPassword || !newPassword) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // Basic password strength check (server-side guard)
        const strongRe = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}/;
        if (!strongRe.test(newPassword)) {
            return NextResponse.json({ error: 'New password does not meet strength requirements' }, { status: 400 });
        }

        const supabase = await createClient();

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || !user.email) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const email = user.email;

        // Reauthenticate by signing in with email and current password via the Admin or via RPC.
        // Supabase JS doesn't expose a server-side reauth; as a workaround, sign in with the credentials.
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password: currentPassword,
        });

        if (signInError) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
        }

        // Update the user's password
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: 'Password updated' });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
}
