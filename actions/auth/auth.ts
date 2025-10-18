"use server";

import { createClient } from "@/lib/supabase/server-client";
import { redirect } from "next/navigation";

// Sign up user
export async function signup(formData: FormData) {
    const supabase = await createClient();
    const { data: user, error } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
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