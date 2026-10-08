import test from 'node:test'
import assert from 'node:assert/strict'
import { runAccountDeletion, isDeleteConfirmation, type DeletionDeps } from './deleteAccount'

function deps(over: Partial<Record<keyof DeletionDeps, boolean>> = {}) {
  const calls: string[] = []
  const d: DeletionDeps = {
    verifyCode: async (code) => { calls.push(`verify:${code}`); return over.verifyCode ?? true },
    deleteData: async () => { calls.push('data'); return over.deleteData ?? true },
    deleteAuthUser: async () => { calls.push('auth'); return over.deleteAuthUser ?? true },
  }
  return { d, calls }
}

test('happy path: confirmation, code, data, then the auth user last', async () => {
  const { d, calls } = deps()
  assert.deepEqual(await runAccountDeletion({ code: ' 123456 ', confirmation: 'Delete' }, d), { ok: true })
  assert.deepEqual(calls, ['verify:123456', 'data', 'auth'])
})

test('without typing "delete" nothing runs', async () => {
  for (const confirmation of ['', 'del', 'delete me', undefined, 42]) {
    const { d, calls } = deps()
    assert.deepEqual(await runAccountDeletion({ code: '123456', confirmation }, d), { ok: false, reason: 'confirmation' })
    assert.deepEqual(calls, [])
  }
})

test('a malformed code is rejected before anything is called', async () => {
  for (const code of ['12345', '1234567', 'abcdef', '', null]) {
    const { d, calls } = deps()
    assert.deepEqual(await runAccountDeletion({ code, confirmation: 'delete' }, d), { ok: false, reason: 'code' })
    assert.deepEqual(calls, [])
  }
})

test('a wrong code deletes nothing', async () => {
  const { d, calls } = deps({ verifyCode: false })
  assert.deepEqual(await runAccountDeletion({ code: '123456', confirmation: 'delete' }, d), { ok: false, reason: 'code' })
  assert.deepEqual(calls, ['verify:123456'])
})

test('if the data deletion fails, the auth user is not deleted', async () => {
  const { d, calls } = deps({ deleteData: false })
  assert.deepEqual(await runAccountDeletion({ code: '123456', confirmation: 'delete' }, d), { ok: false, reason: 'data' })
  assert.deepEqual(calls, ['verify:123456', 'data'])
})

test('if the auth deletion fails, a re-run repeats the (idempotent) data step and retries auth', async () => {
  const first = deps({ deleteAuthUser: false })
  assert.deepEqual(await runAccountDeletion({ code: '111111', confirmation: 'delete' }, first.d), { ok: false, reason: 'auth' })
  assert.deepEqual(first.calls, ['verify:111111', 'data', 'auth'])
  const retry = deps()
  assert.deepEqual(await runAccountDeletion({ code: '222222', confirmation: 'delete' }, retry.d), { ok: true })
  assert.deepEqual(retry.calls, ['verify:222222', 'data', 'auth'])
})

test('isDeleteConfirmation is case- and whitespace-insensitive, nothing more', () => {
  assert.equal(isDeleteConfirmation('  DELETE '), true)
  assert.equal(isDeleteConfirmation('deleted'), false)
})
