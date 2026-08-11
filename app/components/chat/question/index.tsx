'use client'
import type { FC } from 'react'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline'
import type { IChatItem } from '../type'
import s from '../style.module.css'

import StreamdownMarkdown from '@/app/components/base/streamdown-markdown'
import ImageGallery from '@/app/components/base/image-gallery'

type IQuestionProps = Pick<IChatItem, 'id' | 'content' | 'useCurrentUserAvatar'> & {
  imgSrcs?: string[]
  isPreparingResend?: boolean
  onEditAndResend?: (id: string, message: string) => void
}

const Question: FC<IQuestionProps> = ({ id, content, useCurrentUserAvatar, imgSrcs, isPreparingResend, onEditAndResend }) => {
  const { t } = useTranslation()
  const userName = ''
  return (
    <div className='flex items-start justify-end' key={id}>
      <div className='max-w-[calc(100%-3rem)] tablet:max-w-[78%]'>
        <div className={`${s.question} relative text-sm text-gray-900`}>
          {onEditAndResend && content.trim() && (
            <div className='mb-1 mr-2 flex justify-end'>
              <button
                type='button'
                className='inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-[#725329] hover:bg-[#F3E8D6] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30'
                title={t('app.accessFirst.chat.editAndResendHint')}
                aria-label={t('app.accessFirst.chat.editAndResendLabel')}
                onClick={() => onEditAndResend(id, content)}
              >
                <ArrowUturnLeftIcon className='h-3.5 w-3.5' aria-hidden='true' />
                {t('app.accessFirst.chat.editAndResend')}
              </button>
            </div>
          )}
          <div
            className={`${s.messageContent} mr-2 py-3 px-4 tablet:px-5 bg-[#725329] text-white rounded-tl-2xl rounded-b-2xl shadow-sm leading-6 ${isPreparingResend ? 'ring-2 ring-[#BFA783] ring-offset-2 ring-offset-[#FBFAF8]' : ''}`}
          >
            {imgSrcs && imgSrcs.length > 0 && (
              <ImageGallery srcs={imgSrcs} />
            )}
            <StreamdownMarkdown content={content} />
          </div>
        </div>
      </div>
      {useCurrentUserAvatar
        ? (
          <div className='w-10 h-10 shrink-0 leading-10 text-center mr-2 rounded-full bg-primary-600 text-white'>
            {userName?.[0].toLocaleUpperCase()}
          </div>
        )
        : (
          <div className={`${s.questionIcon} w-10 h-10 shrink-0`}>
            {t('app.accessFirst.chat.you')}
          </div>
        )}
    </div>
  )
}

export default React.memo(Question)
