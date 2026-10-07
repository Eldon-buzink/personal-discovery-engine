import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { User } from '@supabase/supabase-js'

// Cookie-bound Supabase client for server actions and route handlers. It
// sees exactly the session the browser has (createBrowserClient from
// @supabase/ssr stores it in cookies, and /auth/callback sets the same
// cookies), so server code can identify the caller instead of trusting a
// userId argument the client could set to anything.
//
// setAll can throw when called from a Server Component render (cookies are
// read-only there); server actions and route handlers can write, which is
// where a refreshed token actually gets persisted.
export function createServerSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // Read-only context (Server Component render) — nothing to persist.
          }
        },
      },
    }
  )
}

// The signed-in user for this request, or null. getUser() (not getSession())
// because it validates the token with Supabase Auth instead of trusting
// whatever the cookie claims.
export async function getSessionUser(): Promise<User | null> {
  const { data, error } = await createServerSupabase().auth.getUser()
  if (error || !data.user) return null
  return data.user
}
