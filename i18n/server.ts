import 'server-only'

import { cookies, headers } from 'next/headers'
import Negotiator from 'negotiator'
import { match } from '@formatjs/intl-localematcher'
import type { Locale } from '.'
import { getSafeLocale, i18n, isSupportedLocale } from '.'

const getCanonicalLanguage = (language: string) => {
  try {
    return Intl.getCanonicalLocales(language)[0]
  }
  catch {
    return null
  }
}

const getSafeLanguages = (languages: string[] = []) => {
  return languages
    .map(language => getCanonicalLanguage(language))
    .filter((language): language is string => !!language)
}

const matchSafeLocale = (languages: string[], locales: string[]) => {
  try {
    const matchedLocale = match(languages, locales, i18n.defaultLocale)
    return getSafeLocale(matchedLocale)
  }
  catch {
    return i18n.defaultLocale
  }
}

export const getLocaleOnServer = async (): Promise<Locale> => {
  // @ts-expect-error locales are readonly
  const locales: string[] = i18n.locales

  let languages: string[] | undefined
  // get locale from cookie
  const localeCookie = (await cookies()).get('locale')
  const localeFromCookie = getSafeLocale(localeCookie?.value)
  if (isSupportedLocale(localeCookie?.value)) { return localeFromCookie }
  languages = localeCookie?.value ? getSafeLanguages([localeCookie.value]) : []

  if (!languages.length) {
    // Negotiator expects plain object so we need to transform headers
    const negotiatorHeaders: Record<string, string> = {}
    const headersList = await headers()
    headersList.forEach((value, key) => (negotiatorHeaders[key] = value))
    // Use negotiator and intl-localematcher to get best locale
    languages = getSafeLanguages(new Negotiator({ headers: negotiatorHeaders }).languages())
  }

  // match locale
  return matchSafeLocale(languages, locales)
}
