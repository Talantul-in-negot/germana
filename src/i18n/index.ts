import { ro, type Key } from './ro'

const dict: Record<Key, string> = ro

export type { Key }

/** Translate a UI string; `{name}` placeholders are replaced from `vars`. */
export function t(key: Key, vars?: Record<string, string | number>): string {
  let s: string = dict[key]
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
  return s
}
