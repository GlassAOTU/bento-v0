import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server-client';

export async function POST() {
    try {
        const supabase = await createClient();
        // This will clear server-side cookies via the server client helper
        await supabase.auth.signOut();
        return NextResponse.json({ message: 'Signed out' });
    } catch (err: any) {
        return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
    }
}
