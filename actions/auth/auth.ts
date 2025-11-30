"use server";

import { createClient } from "@/lib/supabase/server-client";

// Sign up user
export async function signup(formData: FormData) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    });

    if (error) {
        console.error('Signup error:', error.message);
        return { error: error.message };
    }

    if (data.user) {
        // If email confirmation is required, user won't have email_confirmed_at
        const needsEmailConfirmation = !data.user.email_confirmed_at;

        if (needsEmailConfirmation) {
            return {
                success: true,
                needsEmailConfirmation: true,
                email: data.user.email
            };
        }

        // Email already confirmed (shouldn't happen with email confirmation enabled)
        return { success: true };
    }

    return { success: true };
}

// Sign in user
export async function signin(formData: FormData) {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.signInWithPassword({
        email,
        password,
    });


    if (error) {
        // Check if error is due to unconfirmed email
        if (error.message === 'Email not confirmed') {
            return {
                success: true,
                needsEmailConfirmation: true,
                email: email
            };
        }

        console.error('[Server Action] Signin error:', error.message);
        return { error: error.message };
    }

    if (user) {

        // Check if email is confirmed
        if (!user.email_confirmed_at) {
            return {
                success: true,
                needsEmailConfirmation: true,
                email: user.email
            };
        }

        return { success: true };
    }

    return { success: true };
}

// Resend verification email
export async function resendVerificationEmail(email: string) {
    const supabase = await createClient();

    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
    });

    if (error) {
        console.error('Resend verification error:', error.message);
        return { error: error.message };
    }

    return { success: true };
}