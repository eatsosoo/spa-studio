export type AdminFontSize = 'small' | 'standard' | 'large' | 'extra-large'
export type AdminDensity = 'comfortable' | 'compact'

export interface AdminPreferences {
  fontSize: AdminFontSize
  density: AdminDensity
  highContrast: boolean
  reduceMotion: boolean
}

const defaults: AdminPreferences = {
  fontSize: 'standard',
  density: 'comfortable',
  highContrast: false,
  reduceMotion: false,
}

export function useAdminPreferences() {
  const cookie = useCookie<AdminPreferences>('mien-admin-preferences', {
    default: () => ({ ...defaults }),
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })
  const preferences = useState<AdminPreferences>('mien-admin-preferences', () => ({
    ...defaults,
    ...cookie.value,
  }))

  watch(preferences, (value) => {
    cookie.value = { ...value }
  }, { deep: true })

  const fontScale = computed(() => ({
    small: 0.9375,
    standard: 1,
    large: 1.125,
    'extra-large': 1.25,
  })[preferences.value.fontSize] ?? 1)

  function reset() {
    preferences.value = { ...defaults }
  }

  return { preferences, fontScale, reset }
}
