import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { linkErrorPath, linkErrorReason, type LinkErrorReason } from '@/lib/auth/linkError'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  // A link that can't sign the user in (expired, already used, or opened in
  // a different browser than the one that asked for it — PKCE keeps the
  // verifier in the original browser) goes to a page that explains what to
  // do, instead of continuing to /auth/claim signed out.
  // The current emails link to /auth/confirm instead; this route is for
  // older emails and Supabase's default templates.
  const linkError = (reason: LinkErrorReason) => NextResponse.redirect(new URL(linkErrorPath(reason), origin))
  if (!code) {
    // Supabase's own error for an expired link arrives in the URL fragment,
    // which the server never sees; the page reads it.
    console.warn('[callback] no code param in URL')
    return linkError('invalid')
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
    console.error('[callback] exchangeCodeForSession error:', error.code ?? '', error.message)
    return linkError(linkErrorReason(error))
  }
  console.log('[callback] session created')

  return response
}
