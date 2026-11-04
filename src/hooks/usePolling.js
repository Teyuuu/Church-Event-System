import { useEffect, useRef, useState } from 'react'

/**
 * Calls `callback` every `intervalMs` while the tab is visible.
 * Also refreshes immediately when the tab becomes visible again.
 * @param {() => any} callback
 * @param {number} intervalMs
 * @param {boolean} [enabled]
 */
export function usePolling(callback, intervalMs, enabled = true) {
  const savedCallback = useRef(callback)
  savedCallback.current = callback

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined
    const tick = () => {
      if (document.visibilityState === 'visible') savedCallback.current()
    }
    const id = setInterval(tick, intervalMs)
    const onVisible = () => {
      if (document.visibilityState === 'visible') savedCallback.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [intervalMs, enabled])
}

/**
 * Re-renders every `intervalMs` so "updated 12s ago" labels stay current.
 */
export function useNow(intervalMs = 5000) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}
