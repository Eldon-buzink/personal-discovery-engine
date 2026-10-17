#!/usr/bin/env node
// Pushes the two styled auth emails (supabase/templates/confirmation.html and
// magic_link.html, with their subjects from supabase/config.toml) to a hosted
// Supabase project through the Management API. Only these four fields are
// sent, so nothing else in the project's auth settings changes (unlike
// `supabase config push`, which would also push local values such as
// site_url = 127.0.0.1).
//
// Before running: the project needs custom SMTP (Authentication → Emails →
// SMTP settings in the dashboard). Supabase's built-in mailer sends its
// default emails whatever the template says.
//
// Usage:
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/push-auth-email-templates.mjs <project-ref>
//   (token: https://supabase.com/dashboard/account/tokens)
//   Add --dry-run to print what would be sent without sending it.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const ref = args.find((a) => !a.startsWith('--'))
const token = process.env.SUPABASE_ACCESS_TOKEN

if (!ref) {
  console.error('Usage: SUPABASE_ACCESS_TOKEN=... node scripts/push-auth-email-templates.mjs <project-ref> [--dry-run]')
  process.exit(1)
}
if (!token && !dryRun) {
  console.error('Set SUPABASE_ACCESS_TOKEN (a personal access token from https://supabase.com/dashboard/account/tokens).')
  process.exit(1)
}

// Subjects come from config.toml so local and production stay the same.
const config = fs.readFileSync(path.join(root, 'supabase/config.toml'), 'utf8')
function subjectFor(name) {
  const m = config.match(new RegExp(`\\[auth\\.email\\.template\\.${name}\\][^\\[]*?subject\\s*=\\s*"([^"]+)"`))
  if (!m) throw new Error(`No subject for ${name} in supabase/config.toml`)
  return m[1]
}
const read = (file) => fs.readFileSync(path.join(root, 'supabase/templates', file), 'utf8')

const body = {
  mailer_subjects_confirmation: subjectFor('confirmation'),
  mailer_templates_confirmation_content: read('confirmation.html'),
  mailer_subjects_magic_link: subjectFor('magic_link'),
  mailer_templates_magic_link_content: read('magic_link.html'),
}

if (dryRun) {
  for (const [k, v] of Object.entries(body)) console.log(k, '=>', v.length > 80 ? `${v.length} characters of HTML` : v)
  process.exit(0)
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})
if (!res.ok) {
  console.error(`Supabase answered ${res.status}: ${await res.text()}`)
  process.exit(1)
}
const saved = await res.json()
console.log('Saved. Subjects now:', saved.mailer_subjects_confirmation, '|', saved.mailer_subjects_magic_link)
console.log('SMTP set up:', saved.smtp_host ? `yes (${saved.smtp_host})` : 'no, so Supabase will keep sending its default emails until it is')
