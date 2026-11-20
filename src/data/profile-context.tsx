import { useLiveQuery } from 'dexie-react-hooks'
import { createContext, useContext, type ReactNode } from 'react'
import type { Profile } from '../core/types'
import { db } from './db'
import { getMeta, setMeta } from './repo'

interface Ctx {
  profile: Profile
  profiles: Profile[]
  switchTo: (id: string) => Promise<void>
}

const ProfileCtx = createContext<Ctx | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const state = useLiveQuery(async () => {
    const profiles = (await db.profiles.toArray()).sort((a, b) => a.createdAt - b.createdAt)
    const activeId = await getMeta<string>('activeProfileId')
    return { profiles, activeId }
  }, [])
  if (!state || state.profiles.length === 0) return null
  const profile = state.profiles.find((p) => p.id === state.activeId) ?? (state.profiles[0] as Profile)
  const switchTo = (id: string) => setMeta('activeProfileId', id)
  return <ProfileCtx.Provider value={{ profile, profiles: state.profiles, switchTo }}>{children}</ProfileCtx.Provider>
}

export function useProfile(): Ctx {
  const c = useContext(ProfileCtx)
  if (!c) throw new Error('ProfileProvider missing')
  return c
}
