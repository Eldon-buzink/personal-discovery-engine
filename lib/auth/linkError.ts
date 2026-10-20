// Why a sign-in link didn't work, passed to /auth/link-error as ?reason=
// so the page can say what happened (and so it shows in the logs):
//   expired  past its 24 hours, or already used
//   browser  an old-style link (/auth/callback) opened in a different
//            browser than the one that asked for it
//   invalid  anything else (missing or damaged link)
export type LinkErrorReason = 'expired' | 'browser' | 'invalid'

export function linkErrorReason(error: { code?: string; message?: string } | null | undefined): LinkErrorReason {
  const code = error?.code ?? ''
  const message = (error?.message ?? '').toLowerCase()
  if (code === 'otp_expired' || code === 'flow_state_expired' || message.includes('expired')) return 'expired'
  if (code === 'bad_code_verifier' || code === 'flow_state_not_found' || message.includes('code verifier')) return 'browser'
  return 'invalid'
}

export function linkErrorPath(reason: LinkErrorReason): string {
  return `/auth/link-error?reason=${reason}`
}
