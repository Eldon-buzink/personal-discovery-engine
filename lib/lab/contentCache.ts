// Report lab: where a generated Summary or cluster reading is kept. The lab
// uses browser storage behind this interface so a server table can replace
// it later without touching the callers.
//
// A cached entry is reused only while its key matches: the key covers the
// prompt version and every input (each trait's facet, word and direction,
// plus the relationship ids for the Summary), so changed scores give a new
// key and a new text. Attempts are counted per key (at most 2), as
// relationship insights do.

export type ContentKind = 'summary' | 'cluster'

export interface CachedContent {
  key: string
  kind: ContentKind
  text: string
  headline?: string
  drawsOn: string[]
  createdAt: string
}

export interface ContentCache {
  get(key: string): CachedContent | null
  set(entry: CachedContent): void
  attempts(key: string): number
  recordAttempt(key: string): void
}

export const CONTENT_PROMPT_VERSION = 'lab-1'
export const MAX_CONTENT_ATTEMPTS = 2

export function contentKey(
  kind: ContentKind,
  traits: { facet: string; word: string; direction: string }[],
  extra: { cluster?: string; relationshipIds?: string[] } = {},
): string {
  const parts = traits.map((t) => `${t.facet}:${t.word}:${t.direction}`).sort()
  const rel = (extra.relationshipIds ?? []).slice().sort()
  return [CONTENT_PROMPT_VERSION, kind, extra.cluster ?? '-', parts.join(','), rel.join(',')].join('|')
}

const STORAGE_KEY = 'bearing_lab_content'

interface Stored { entries: Record<string, CachedContent>; attempts: Record<string, number> }

function read(storage: Storage | undefined): Stored {
  try {
    const raw = storage?.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? { entries: parsed.entries ?? {}, attempts: parsed.attempts ?? {} } : { entries: {}, attempts: {} }
  } catch {
    return { entries: {}, attempts: {} }
  }
}

function write(storage: Storage | undefined, s: Stored) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
}

/** Browser storage (or any Storage, for tests). Never throws. */
export function browserContentCache(storage: Storage | undefined = typeof window !== 'undefined' ? window.localStorage : undefined): ContentCache {
  return {
    get: (key) => read(storage).entries[key] ?? null,
    set: (entry) => { const s = read(storage); s.entries[entry.key] = entry; write(storage, s) },
    attempts: (key) => read(storage).attempts[key] ?? 0,
    recordAttempt: (key) => { const s = read(storage); s.attempts[key] = (s.attempts[key] ?? 0) + 1; write(storage, s) },
  }
}
