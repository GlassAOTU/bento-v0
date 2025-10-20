"use server";

import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";

// Sign up user
export async function signup(formData: FormData) {
    const supabase = await createClient();
    const email = formData.get('email') as string | null;
    const password = formData.get('password') as string | null;
    const confirmPassword = formData.get('confirmPassword') as string | null;
    const name = formData.get('name') as string | null;

    if (!email || !password || !confirmPassword) {
        console.error('Missing signup fields');
        return;
    }

    if (password !== confirmPassword) {
        console.error('Passwords do not match');
        return;
    }

    const { data: user, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: name ?? undefined,
            },
        },
    });

    if (error) {
        console.error('Signup error:', error.message);
    } else if (user) {
        redirect('/');
    }
}

// Sign in user
export async function signin(formData: FormData) {
    const supabase = await createClient();
    const {
        data: { user },
        error,
    } = await supabase.auth.signInWithPassword({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    });
    if (user) {
        redirect('/');
    }

    if (error) {
        console.error('Signin error:', error.message);
    }
}