import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getStoredTheme,
  setStoredTheme,
  resolveEffectiveTheme,
  applyThemeClass,
  setTheme,
  toggleTheme,
  subscribeSystemPreference,
} from '@/lib/theme'

function mockMatchMedia(matches: boolean) {
  // @ts-expect-error override
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const mql: MediaQueryList = {
      media: query,
      matches,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      // legacy API fallbacks
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList
    return mql
  })
}

describe('theme utils', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    mockMatchMedia(false)
  })

  it('getStoredTheme returns null when no value present', () => {
    expect(getStoredTheme()).toBeNull()
  })

  it('resolveEffectiveTheme respects explicit light/dark', () => {
    expect(resolveEffectiveTheme('light')).toBe('light')
    expect(resolveEffectiveTheme('dark')).toBe('dark')
  })

  it('resolveEffectiveTheme uses system preference when mode is system/null', () => {
    mockMatchMedia(true)
    expect(resolveEffectiveTheme('system')).toBe('dark')
    expect(resolveEffectiveTheme(null)).toBe('dark')

    mockMatchMedia(false)
    expect(resolveEffectiveTheme('system')).toBe('light')
    expect(resolveEffectiveTheme(null)).toBe('light')
  })

  it('applyThemeClass toggles html.dark', () => {
    applyThemeClass('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    applyThemeClass('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('setTheme persists and applies class', () => {
    setTheme('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    setTheme('light')
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('toggleTheme flips between light and dark', () => {
    setTheme('light')
    toggleTheme()
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    toggleTheme()
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('getStoredTheme handles localStorage errors gracefully', () => {
    const orig = window.localStorage.getItem
    // @ts-expect-error override
    window.localStorage.getItem = () => { throw new Error('denied') }
    expect(getStoredTheme()).toBeNull()
    window.localStorage.getItem = orig
  })

  it('subscribeSystemPreference reacts only in system mode', () => {
    setStoredTheme('system')
    let last: boolean | null = null
    // start as light
    let matches = false
    // custom mql that we can flip
    const listeners: Function[] = []
    // @ts-expect-error override
    window.matchMedia = vi.fn().mockImplementation(() => {
      const mql: any = {
        matches,
        addEventListener: (_: string, cb: (e: any) => void) => listeners.push(cb),
        removeEventListener: vi.fn(),
        addListener: (cb: (e: any) => void) => listeners.push(cb),
        removeListener: vi.fn(),
      }
      return mql
    })

    const unsubscribe = subscribeSystemPreference((isDark) => {
      last = isDark
    })

    // flip to dark
    matches = true
    listeners.forEach((cb) => cb({ matches }))
    expect(last).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    // flip back to light
    matches = false
    listeners.forEach((cb) => cb({ matches }))
    expect(last).toBe(false)
    expect(document.documentElement.classList.contains('dark')).toBe(false)

    unsubscribe()

    // If user explicitly sets mode, no reaction
    setTheme('light')
    matches = true
    listeners.forEach((cb) => cb({ matches }))
    expect(localStorage.getItem('theme')).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
