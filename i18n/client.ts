import Cookies from 'js-cookie'
import type { Locale } from '.'
import { getSafeLocale } from '.'
import { LOCALE_COOKIE_NAME } from '@/config'
import { changeLanguage } from '@/i18n/i18next-config'

// same logic as server
export const getLocaleOnClient = (): Locale => {
  return getSafeLocale(Cookies.get(LOCALE_COOKIE_NAME))
}

export const setLocaleOnClient = (locale: Locale, notReload?: boolean) => {
  const safeLocale = getSafeLocale(locale)
  Cookies.set(LOCALE_COOKIE_NAME, safeLocale)
  changeLanguage(safeLocale)
  if (!notReload) { location.reload() }
}
