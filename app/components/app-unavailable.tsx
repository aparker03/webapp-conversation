'use client'
import type { FC } from 'react'
import React from 'react'
import { useTranslation } from 'react-i18next'

interface IAppUnavailableProps {
  isUnknownReason: boolean
  errMessage?: string
}

const AppUnavailable: FC<IAppUnavailableProps> = ({
  isUnknownReason,
  errMessage,
}) => {
  const { t } = useTranslation()
  let message = errMessage
  if (!errMessage) {
    message = isUnknownReason
      ? t('app.accessFirst.unavailable.body')
      : t('app.common.appUnavailable') as string
  }

  return (
    <div className='flex items-center justify-center w-screen h-screen bg-[#F7F4EF] px-4'>
      <div className='max-w-md rounded-xl border border-[#E6DDD1] bg-white p-6 shadow-sm'>
        <div className='text-xs font-semibold uppercase tracking-[0.08em] text-[#725329]'>AccessFirst</div>
        <div className='mt-3 flex items-start'>
          <h1 className='mr-5 h-[50px] leading-[50px] pr-5 text-[24px] font-semibold text-[#1F2937]'
            style={{
              borderRight: '1px solid #E6DDD1',
            }}>{(errMessage || isUnknownReason) ? 500 : 404}</h1>
          <div>
            <div className='text-sm font-semibold text-[#1F2937]'>{t('app.accessFirst.unavailable.title')}</div>
            <div className='mt-1 text-sm leading-5 text-[#475467]'>{message}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
export default React.memo(AppUnavailable)
