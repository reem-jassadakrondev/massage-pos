import { useEffect, useState } from 'react'

/** Current time, refreshed on an interval — drives countdowns and "upcoming" alerts. */
export default function useNow(intervalMs = 15000) {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])

  return now
}
