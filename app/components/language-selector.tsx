'use client'

import { LanguageIcon } from '@heroicons/react/24/outline'
import { useTranslation } from 'react-i18next'
import type { Locale } from '@/i18n'
import { getSafeLocale } from '@/i18n'
import { setLocaleOnClient } from '@/i18n/client'

const interfaceLanguages: Array<{
  locale: Locale
  nativeLabel: string
}> = [
  { locale: 'en', nativeLabel: 'English' },
  { locale: 'es', nativeLabel: 'Español' },
  { locale: 'zh-Hans', nativeLabel: '简体中文' },
  { locale: 'ko', nativeLabel: '한국어' },
]

const LanguageSelector = () => {
  const { t, i18n } = useTranslation()
  const selectedLocale = getSafeLocale(i18n.resolvedLanguage || i18n.language)

  return (
    <div className='rounded-lg border border-[#E6DDD1] bg-white p-3 shadow-sm'>
      <label
        className='mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#5F4A2A]'
        htmlFor='interface-language'
      >
        <LanguageIcon className='h-4 w-4 shrink-0' aria-hidden='true' />
        {t('app.accessFirst.language.label')}
      </label>
      <select
        id='interface-language'
        className='h-9 w-full min-w-0 rounded-md border border-[#D7CDBF] bg-[#FFFDF9] px-2 text-sm text-[#344054] outline-none focus:border-[#BFA783] focus:ring-2 focus:ring-[#8A642F]/25'
        value={selectedLocale}
        onChange={event => setLocaleOnClient(event.target.value as Locale)}
      >
        {interfaceLanguages.map(language => (
          <option key={language.locale} value={language.locale} lang={language.locale}>
            {language.nativeLabel}
          </option>
        ))}
      </select>
    </div>
  )
}

export default LanguageSelector
