import { getLocaleOnServer } from '@/i18n/server'
import { getSafeLocale } from '@/i18n'

import './styles/globals.css'
import './styles/markdown.scss'

const LocaleLayout = async ({
  children,
}: {
  children: React.ReactNode
}) => {
  const locale = getSafeLocale(await getLocaleOnServer())
  return (
    <html lang={locale} className="h-full overflow-hidden" suppressHydrationWarning>
      <body className="h-full overflow-hidden" suppressHydrationWarning>
        <div className="h-dvh min-w-[300px] overflow-hidden">
          {children}
        </div>
      </body>
    </html>
  )
}

export default LocaleLayout
