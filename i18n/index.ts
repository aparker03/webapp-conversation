export const i18n = {
  defaultLocale: 'en',
  locales: ['en', 'es', 'zh-Hans', 'ko'],
} as const

export type Locale = typeof i18n['locales'][number]

export const isSupportedLocale = (locale?: string | null): locale is Locale => {
  return !!locale && (i18n.locales as readonly string[]).includes(locale)
}

export const getSafeLocale = (locale?: string | null): Locale => {
  return isSupportedLocale(locale) ? locale : i18n.defaultLocale
}
