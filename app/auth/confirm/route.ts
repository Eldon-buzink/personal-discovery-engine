import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Where the sign-in emails link to (supabase/templates, and the reminder in
// app/api/cron/saved-progress): /auth/confirm?token_hash=...&type=email.
// Verifying the token hash needs nothing from the browser that asked for
// the link, so it signs the person in wherever the email is opened. Then
// /auth/claim brings their saved progress over. A link that's expired or
// already used goes to /auth/link-error, which offers a new one.
const TYPES: EmailOtpType[] = ['email', 'magiclink', 'signup', 'invite']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const linkError = NextResponse.redirect(new URL('/auth/link-error', origin))

  if (!tokenHash || !type || !TYPES.includes(type)) return linkError

  const response = NextResponse.redirect(new URL('/auth/claim', origin))
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
  if (error) {
    console.warn('[confirm] verifyOtp failed:', error.message)
    return linkError
  }
  return response
}
