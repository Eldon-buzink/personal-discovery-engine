#!/usr/bin/env node
// Pushes the two sign-in emails to a hosted Supabase project through the
// Management API: supabase/templates/confirm_signup.html ("Confirm signup",
// new addresses) and magic_link.html (existing accounts), their subjects
// from supabase/config.toml, and the 24-hour link expiry. Only those fields
// are sent, so nothing else in the project's auth settings changes (unlike
// `supabase config push`, which would also push local values such as
// site_url = 127.0.0.1).
//
// Usage (token from https://supabase.com/dashboard/account/tokens, kept in
// your shell, never in the repo):
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-auth-email-templates.mjs <project-ref>
//   ... --dry-run   print what would be sent, send nothing
//   ... --check     only read the current settings back (no changes)

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const checkOnly = args.includes('--check')
const ref = args.find((a) => !a.startsWith('--'))
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!ref) {
  console.error('Usage: SUPABASE_ACCESS_TOKEN=... node scripts/push-auth-email-templates.mjs <project-ref> [--dry-run | --check]')
  process.exit(1)
}
if (!token && !dryRun) {
  console.error('Set SUPABASE_ACCESS_TOKEN in your shell (https://supabase.com/dashboard/account/tokens).')
  process.exit(1)
}

const config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8')
function templateFor(name) {
  const block = config.match(new RegExp(`\\[auth\\.email\\.template\\.${name}\\]([^\\[]*)`))
  const subject = block?.[1].match(/subject\s*=\s*"([^"]+)"/)?.[1]
  const file = block?.[1].match(/content_path\s*=\s*"([^"]+)"/)?.[1]
  if (!subject || !file) throw new Error(`No subject/content_path for ${name} in supabase/config.toml`)
  return { subject, html: fs.readFileSync(path.join(root, file), 'utf8') }
}
const otpExpiry = Number(config.match(/^otp_expiry\s*=\s*(\d+)/m)?.[1] ?? 86400)

const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

function report(c) {
  console.log('Email confirmations:', c.mailer_autoconfirm ? 'OFF (new addresses get the magic link email)' : 'ON (new addresses get "Confirm signup")')
  console.log('Link expiry (seconds):', c.mailer_otp_exp)
  console.log('Custom SMTP:', c.smtp_host ? `yes (${c.smtp_host}, sender ${c.smtp_admin_email ?? '?'})` : 'no, so Supabase sends its default emails')
  console.log('Site URL:', c.site_url, '(the email links use it: it must be https://getbearing.me, the same as SITE_ORIGIN in lib/server/siteOrigin.ts)')
  console.log('Subjects:', JSON.stringify(c.mailer_subjects_confirmation), '|', JSON.stringify(c.mailer_subjects_magic_link))
}

if (checkOnly) {
  const res = await fetch(api, { headers })
  if (!res.ok) { console.error(`Supabase answered ${res.status}: ${await res.text()}`); process.exit(1) }
  report(await res.json())
  process.exit(0)
}

const confirmation = templateFor('confirmation')
const magicLink = templateFor('magic_link')
const body = {
  mailer_subjects_confirmation: confirmation.subject,
  mailer_templates_confirmation_content: confirmation.html,
  mailer_subjects_magic_link: magicLink.subject,
  mailer_templates_magic_link_content: magicLink.html,
  mailer_otp_exp: otpExpiry,
}

if (dryRun) {
  for (const [k, v] of Object.entries(body)) console.log(k, '=>', typeof v === 'string' && v.length > 80 ? `${v.length} characters of HTML` : v)
  process.exit(0)
}

const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify(body) })
if (!res.ok) {
  console.error(`Supabase answered ${res.status}: ${await res.text()}`)
  process.exit(1)
}
console.log('Saved.')
report(await res.json())
