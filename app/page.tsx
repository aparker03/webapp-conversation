import React from 'react'

import Main from '@/app/components'
import { getLocaleOnServer } from '@/i18n/server'

const App = async () => {
  const initialLocale = await getLocaleOnServer()

  return (
    <Main initialLocale={initialLocale} />
  )
}

export default App
