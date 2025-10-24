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
        // Log user details to console
        console.log('New user signed up:', {
            id: data.user.id,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            confirmed_at: data.user.confirmed_at,
            created_at: data.user.created_at,
        });

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
    console.log('[Server Action] signin called')
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    console.log('[Server Action] Email:', email)

    const supabase = await createClient();
    console.log('[Server Action] Supabase client created')

    const {
        data: { user },
        error,
    } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    console.log('[Server Action] Supabase response:', { user: user?.email, error: error?.message })

    if (error) {
        // Check if error is due to unconfirmed email
        if (error.message === 'Email not confirmed') {
            console.log('[Server Action] Email not confirmed error, returning needsEmailConfirmation');
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
        console.log('[Server Action] User authenticated:', user.email)
        console.log('[Server Action] Email confirmed at:', user.email_confirmed_at)

        // Check if email is confirmed
        if (!user.email_confirmed_at) {
            console.log('[Server Action] User email not confirmed, returning needsEmailConfirmation')
            return {
                success: true,
                needsEmailConfirmation: true,
                email: user.email
            };
        }

        console.log('[Server Action] Email confirmed, auth successful')
        return { success: true };
    }

    console.log('[Server Action] No user returned, returning success')
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