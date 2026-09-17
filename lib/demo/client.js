'use client'

// Équivalent client-side de isDemoMode() (lib/demo/session.js), qui lui
// est réservé aux Server Components. Même cookie, lu directement.
import { DEMO_COOKIE } from './constants'

export { DEMO_COOKIE }

export function isDemoModeClient() {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').includes(`${DEMO_COOKIE}=1`)
}

export function activerModeDemo() {
  document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=86400`
}

export function desactiverModeDemo() {
  document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0`
}
