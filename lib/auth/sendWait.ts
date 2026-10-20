// Supabase lets one address ask for a sign-in email only every so often. A
// request inside that window fails with HTTP 429 and a message like "For
// security purposes, you can only request this after 17 seconds." That
// means a link went out moments ago, so callers treat it as sent and count
// down to when another can be asked for. Returns the seconds to wait, or
// null when the error isn't this.
export function sendWaitSeconds(error: unknown): number | null {
  const e = (error ?? {}) as { status?: number; code?: string; message?: string }
  const message = e.message ?? ''
  const limited = e.status === 429 || e.code === 'over_email_send_rate_limit' || /only request this after/i.test(message)
  if (!limited) return null
  const seconds = message.match(/after (\d+) seconds?/i)
  return seconds ? Math.max(1, Number(seconds[1])) : 60
}
