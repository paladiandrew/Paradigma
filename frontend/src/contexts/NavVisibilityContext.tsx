import { createContext, useContext, useEffect, useState } from 'react'
import api from '../services/api'

type NavVisibility = {
  showNewsNav: boolean
}

const NavVisibilityContext = createContext<NavVisibility>({ showNewsNav: true })

export function NavVisibilityProvider({ children }: { children: React.ReactNode }) {
  const [showNewsNav, setShowNewsNav] = useState(true)

  useEffect(() => {
    api
      .get('/events', { params: { type: 'news' } })
      .then((r) => setShowNewsNav((r.data?.length ?? 0) > 0))
      .catch(() => setShowNewsNav(true))
  }, [])

  return <NavVisibilityContext.Provider value={{ showNewsNav }}>{children}</NavVisibilityContext.Provider>
}

export function useNavVisibility() {
  return useContext(NavVisibilityContext)
}
