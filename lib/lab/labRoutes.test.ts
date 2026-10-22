import { test } from 'node:test'
import assert from 'node:assert/strict'
import { labRoutesEnabled } from './labRoutes'

const env = process.env as Record<string, string | undefined>

function withEnv(over: Record<string, string | undefined>, fn: () => void) {
  const before = { ...env }
  for (const [k, v] of Object.entries(over)) { if (v === undefined) delete env[k]; else env[k] = v }
  try { fn() } finally { for (const k of Object.keys(over)) { if (before[k] === undefined) delete env[k]; else env[k] = before[k] } }
}

test('lab routes: off on any Vercel deployment, on in dev, local build only with LAB_ROUTES=1', () => {
  withEnv({ VERCEL: '1', NODE_ENV: 'development', LAB_ROUTES: '1' }, () => assert.equal(labRoutesEnabled(), false))
  withEnv({ VERCEL: undefined, NODE_ENV: 'development', LAB_ROUTES: undefined }, () => assert.equal(labRoutesEnabled(), true))
  withEnv({ VERCEL: undefined, NODE_ENV: 'production', LAB_ROUTES: undefined }, () => assert.equal(labRoutesEnabled(), false))
  withEnv({ VERCEL: undefined, NODE_ENV: 'production', LAB_ROUTES: '1' }, () => assert.equal(labRoutesEnabled(), true))
})
