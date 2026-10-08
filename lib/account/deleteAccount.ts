// The order of an account deletion, with the actual work passed in so the
// sequence can be unit-tested (app/actions/account.ts supplies the real
// Supabase calls):
//
//   1. the visitor typed "delete"
//   2. a fresh 6-digit code from the account's email is correct
//   3. delete_user_data(): every row of the user's data, in one transaction
//   4. only then, delete the auth user
//
// Each step stops the flow if it fails. Step 3 is all-or-nothing, so a
// failure there leaves everything in place. A failure at step 4 leaves the
// auth user with no data; running the flow again (with a new code) makes
// step 3 a no-op and retries step 4.

export interface DeletionDeps {
  verifyCode: (code: string) => Promise<boolean>
  deleteData: () => Promise<boolean>
  deleteAuthUser: () => Promise<boolean>
}

export type DeletionResult =
  | { ok: true }
  | { ok: false; reason: 'confirmation' | 'code' | 'data' | 'auth' }

export function isDeleteConfirmation(text: unknown): boolean {
  return typeof text === 'string' && text.trim().toLowerCase() === 'delete'
}

export async function runAccountDeletion(
  input: { code: unknown; confirmation: unknown },
  deps: DeletionDeps
): Promise<DeletionResult> {
  if (!isDeleteConfirmation(input.confirmation)) return { ok: false, reason: 'confirmation' }
  if (typeof input.code !== 'string' || !/^\d{6}$/.test(input.code.trim())) return { ok: false, reason: 'code' }
  if (!(await deps.verifyCode(input.code.trim()))) return { ok: false, reason: 'code' }
  if (!(await deps.deleteData())) return { ok: false, reason: 'data' }
  if (!(await deps.deleteAuthUser())) return { ok: false, reason: 'auth' }
  return { ok: true }
}
