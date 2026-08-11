import Cookies from 'js-cookie'
import type { Locale } from '.'
import { getSafeLocale } from '.'
import { LOCALE_COOKIE_NAME } from '@/config'
import { changeLanguage } from '@/i18n/i18next-config'

export const getLocaleOnClient = (): Locale => {
  const cookieLocale = Cookies.get(LOCALE_COOKIE_NAME)
  if (cookieLocale) { return getSafeLocale(cookieLocale) }

  return getSafeLocale(typeof document === 'undefined' ? undefined : document.documentElement.lang)
}

export const setLocaleOnClient = (locale: Locale) => {
  const safeLocale = getSafeLocale(locale)
  Cookies.set(LOCALE_COOKIE_NAME, safeLocale, {
    expires: 365,
    path: '/',
    sameSite: 'lax',
  })
  void changeLanguage(safeLocale)
  document.documentElement.lang = safeLocale
}
