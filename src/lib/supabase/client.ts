import { createBrowserClient } from '@supabase/ssr'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const IS_CONFIGURED = SUPABASE_URL.startsWith('http') && SUPABASE_KEY.length > 0

export function createClient() {
  if (!IS_CONFIGURED) {
    // Return a no-op stub when credentials aren't configured (local dev only)
    return {
      auth: {
        getSession:          async () => ({ data: { session: null }, error: null }),
        signInWithPassword:  async () => ({ data: null, error: { message: 'Supabase not configured' } }),
        signUp:              async () => ({ data: { user: null }, error: { message: 'Supabase not configured' } }),
        signOut:             async () => ({ error: null }),
        signInAnonymously:   async () => ({ data: { session: null }, error: { message: 'Supabase not configured' } }),
        onAuthStateChange:   () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select:  () => ({ eq: () => ({ data: [], error: null, count: 0 }) }),
        insert:  () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }),
        update:  () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
        delete:  () => ({ eq: () => ({ eq: () => ({ eq: async () => ({ error: null }) }) }) }),
      }),
    } as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY)
}
