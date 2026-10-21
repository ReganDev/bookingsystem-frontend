export type ThemePreference = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'booking-theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

export function loadThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') return stored
  } catch {
    // Storage blocked (private mode etc.) — fall back to the system theme.
  }
  return 'system'
}

export function saveThemePreference(preference: ThemePreference) {
  try {
    if (preference === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, preference)
  } catch {
    // Non-fatal: the choice just won't survive a reload.
  }
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  if (preference !== 'system') return preference
  return window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

/** Applies the theme to <html> and keeps it in sync with the OS while on "system". */
export function applyTheme(preference: ThemePreference): () => void {
  const root = document.documentElement
  const update = () => {
    const theme = resolveTheme(preference)
    root.dataset.theme = theme
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#141c2c' : '#047857')
  }
  update()
  if (preference !== 'system' || !window.matchMedia) return () => {}
  const media = window.matchMedia(DARK_QUERY)
  media.addEventListener('change', update)
  return () => media.removeEventListener('change', update)
}
