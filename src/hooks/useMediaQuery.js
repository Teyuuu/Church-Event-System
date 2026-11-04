import { useEffect, useState } from 'react'

/**
 * Subscribe to a CSS media query.
 * @param {string} query e.g. '(max-width: 767px)'
 */
export function useMediaQuery(query) {
  const getMatch = () =>
    typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false

  const [matches, setMatches] = useState(getMatch)

  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])

  return matches
}

export const useIsMobile = () => useMediaQuery('(max-width: 767px)')
