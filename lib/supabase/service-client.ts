import { createClient } from '@supabase/supabase-js'

/**
 * Create a Supabase client with SERVICE_ROLE key for admin operations
 * This bypasses RLS and should only be used in secure server-side contexts
 */
export function createServiceClient() {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY is not defined')
    }

    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}