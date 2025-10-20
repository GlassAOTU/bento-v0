import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email } = body ?? {};
        if (!email) {
            return NextResponse.json({ error: 'Missing email' }, { status: 400 });
        }

        const supabase = await createClient();

        // Attempt to send password reset email
        const redirectTo = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/reset`
            : undefined;

        const { data, error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ message: 'Password reset email sent' });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
}
