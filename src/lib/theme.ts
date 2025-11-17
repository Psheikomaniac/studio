export type ThemeMode = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'theme'

export function getStoredTheme(): ThemeMode | null {
  try {
    const t = typeof window !== 'undefined' ? window.localStorage.getItem(THEME_STORAGE_KEY) : null
    if (t === 'light' || t === 'dark' || t === 'system') return t
    return null
  } catch {
    return null
  }
}

export function setStoredTheme(mode: ThemeMode) {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    }
  } catch {
    // ignore
  }
}

export function prefersDark(): boolean {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function resolveEffectiveTheme(mode: ThemeMode | null): 'light' | 'dark' {
  if (mode === 'light' || mode === 'dark') return mode
  return prefersDark() ? 'dark' : 'light'
}

export function applyThemeClass(effective: 'light' | 'dark') {
  if (typeof document === 'undefined') return
  const d = document.documentElement
  if (effective === 'dark') d.classList.add('dark')
  else d.classList.remove('dark')
}

export function syncThemeFromStorage() {
  const mode = getStoredTheme()
  applyThemeClass(resolveEffectiveTheme(mode))
}

export function setTheme(mode: ThemeMode) {
  setStoredTheme(mode)
  applyThemeClass(resolveEffectiveTheme(mode))
}

export function toggleTheme() {
  const current = resolveEffectiveTheme(getStoredTheme())
  const next = current === 'dark' ? 'light' : 'dark'
  setTheme(next)
}

export function subscribeSystemPreference(callback: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined' || !('matchMedia' in window)) return () => {}
  const mql = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent | MediaQueryList) => {
    // Nur reagieren, falls system aktiv ist
    const stored = getStoredTheme()
    if (stored && stored !== 'system') return
    const dark = 'matches' in e ? e.matches : (e as MediaQueryList).matches
    applyThemeClass(dark ? 'dark' : 'light')
    callback?.(dark)
  }
  // initial call for current value when in system mode
  handler(mql)
  mql.addEventListener?.('change', handler as EventListener)
  // Fallback für ältere Browser (legacy API)
  // @ts-ignore - addListener is deprecated in TS definitions
  mql.addListener?.(handler)
  return () => {
    mql.removeEventListener?.('change', handler as EventListener)
    // @ts-ignore - removeListener is deprecated in TS definitions
    mql.removeListener?.(handler)
  }
}
