import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // A link that can't sign the user in (expired, already used, or opened in
  // a different browser than the one that asked for it — PKCE keeps the
  // verifier in the original browser) goes to a page that explains what to
  // do, instead of continuing to /auth/claim signed out.
  const linkError = NextResponse.redirect(new URL('/auth/link-error', origin))
  if (!code) {
    console.warn('[callback] no code param in URL')
    return linkError
  }

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
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('[callback] exchangeCodeForSession error:', error.message)
    return linkError
  }
  console.log('[callback] session created')

  return response
}
