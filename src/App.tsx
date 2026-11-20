import { useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { ProfileProvider } from './data/profile-context'
import { ensureSeed } from './data/repo'
import { t } from './i18n'
import DeckDetail from './screens/DeckDetail'
import Decks from './screens/Decks'
import Home from './screens/Home'
import Import from './screens/Import'
import Lesson from './screens/Lesson'
import Profiles from './screens/Profiles'
import Progress from './screens/Progress'
import Settings from './screens/Settings'

/** Remount the lesson on every navigation so "another lesson" starts fresh. */
function KeyedLesson() {
  const loc = useLocation()
  return <Lesson key={loc.key} />
}

export default function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    void ensureSeed().then(() => setReady(true))
  }, [])
  if (!ready) return <div className="flex h-full items-center justify-center font-bold">{t('app.loading')}</div>
  return (
    <HashRouter>
      <ProfileProvider>
        <Routes>
          <Route path="/lesson/:deckId" element={<KeyedLesson />} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="decks" element={<Decks />} />
            <Route path="decks/new" element={<Import />} />
            <Route path="decks/:id" element={<DeckDetail />} />
            <Route path="decks/:id/import" element={<Import />} />
            <Route path="progress" element={<Progress />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profiles" element={<Profiles />} />
          </Route>
        </Routes>
      </ProfileProvider>
    </HashRouter>
  )
}
