import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import Splash from './components/Splash'
import { ZonedScreen } from './components/ZoneScreen'
import { ProfileProvider } from './data/profile-context'
import { ensureSeed } from './data/repo'
import DeckDetail from './screens/DeckDetail'
import AllVerbs from './screens/AllVerbs'
import Conj from './screens/Conj'
import Decks from './screens/Decks'
import Drill from './screens/Drill'
import Install from './screens/Install'
import TestMode from './screens/TestMode'
import Home from './screens/Home'
import Import from './screens/Import'
import Lesson from './screens/Lesson'
import Profiles from './screens/Profiles'
import Progress from './screens/Progress'
import Settings from './screens/Settings'

const DevScenes = import.meta.env.DEV ? lazy(() => import('./screens/DevScenes')) : null

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
  if (!ready) return <Splash />
  return (
    <HashRouter>
      <ProfileProvider>
        <Routes>
          {DevScenes && <Route path="/dev/scenes" element={<Suspense fallback={null}><DevScenes /></Suspense>} />}
          <Route path="/lesson/:deckId" element={<ZonedScreen><KeyedLesson /></ZonedScreen>} />
          <Route path="/test/:deckId" element={<ZonedScreen><TestMode /></ZonedScreen>} />
          <Route path="/conj/:deckId/all" element={<ZonedScreen><AllVerbs /></ZonedScreen>} />
          <Route path="/conj/:deckId/:wordId" element={<ZonedScreen><Conj /></ZonedScreen>} />
          <Route path="/drill/:deckId" element={<ZonedScreen><Drill /></ZonedScreen>} />
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="decks" element={<Decks />} />
            <Route path="decks/new" element={<Import />} />
            <Route path="decks/:id" element={<DeckDetail />} />
            <Route path="decks/:id/import" element={<Import />} />
            <Route path="progress" element={<Progress />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profiles" element={<Profiles />} />
            <Route path="install" element={<Install />} />
          </Route>
        </Routes>
      </ProfileProvider>
    </HashRouter>
  )
}
