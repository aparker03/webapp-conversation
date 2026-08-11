import React, { useState } from 'react'
import type { FC } from 'react'
import {
  ChatBubbleOvalLeftEllipsisIcon,
  TrashIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisSolidIcon } from '@heroicons/react/24/solid'
import Button from '@/app/components/base/button'
import type { ConversationItem } from '@/types/app'
import LanguageSelector from '@/app/components/language-selector'
import { useTranslation } from 'react-i18next'

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const MAX_CONVERSATION_LENTH = 20

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  onDeleteConversation: (id: string) => void
  list: ConversationItem[]
}

const Sidebar: FC<ISidebarProps> = ({
  copyRight,
  currentId,
  onCurrentIdChange,
  onDeleteConversation,
  list,
}) => {
  const { t } = useTranslation()
  const [confirmingDeleteId, setConfirmingDeleteId] = useState('')

  return (
    <div
      className="shrink-0 flex h-full flex-col overflow-y-auto bg-[#FDFBF8] pc:w-[260px] tablet:w-[216px] mobile:w-[260px] border-r border-[#E6DDD1]"
    >
      {list.length < MAX_CONVERSATION_LENTH && (
        <div className="flex flex-shrink-0 p-4 !pb-0">
          <Button
            onClick={() => { onCurrentIdChange('-1') }}
            className="group block w-full flex-shrink-0 !justify-start !h-10 !rounded-lg !border-[#D7CDBF] !bg-white !text-[#725329] items-center text-sm hover:!border-[#BFA783] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/25"
          >
            <PencilSquareIcon className="mr-2 h-4 w-4" /> {t('app.accessFirst.sidebar.newConversation')}
          </Button>
        </div>
      )}

      <nav className="mt-4 flex-1 space-y-1 p-4 !pt-0">
        {list.map((item) => {
          const isCurrent = item.id === currentId
          const ItemIcon
            = isCurrent ? ChatBubbleOvalLeftEllipsisSolidIcon : ChatBubbleOvalLeftEllipsisIcon
          const isSavedConversation = item.id !== '-1'
          const isConfirmingDelete = confirmingDeleteId === item.id
          return (
            <div key={item.id}>
              <div
                onClick={() => onCurrentIdChange(item.id)}
                className={classNames(
                  isCurrent
                    ? 'bg-[#F3E8D6] text-[#725329] shadow-sm'
                    : 'text-[#344054] hover:bg-white hover:text-[#1F2937]',
                  'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8A642F]/25',
                )}
                tabIndex={0}
                role='button'
                aria-label={t('app.accessFirst.sidebar.openConversation', { name: item.name })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    onCurrentIdChange(item.id)
                  }
                }}
              >
                <ItemIcon
                  className={classNames(
                    isCurrent
                      ? 'text-[#725329]'
                      : 'text-[#8A7A66] group-hover:text-[#725329]',
                    'mr-3 h-5 w-5 flex-shrink-0',
                  )}
                  aria-hidden="true"
                />
                <span className='truncate'>
                  {item.id === '-1' ? t('app.accessFirst.sidebar.newConversation') : item.name}
                </span>
                {isSavedConversation && (
                  <button
                    type='button'
                    className={classNames(
                      isCurrent
                        ? 'text-[#725329] hover:bg-[#E8D8C0]'
                        : 'text-[#8A7A66] hover:bg-[#F3E8D6] hover:text-[#725329]',
                      'ml-2 hidden h-7 w-7 shrink-0 items-center justify-center rounded-md focus:inline-flex focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30 group-hover:inline-flex',
                    )}
                    aria-label={t('app.accessFirst.sidebar.deleteConversationLabel', { name: item.name })}
                    aria-expanded={isConfirmingDelete}
                    onClick={(event) => {
                      event.stopPropagation()
                      setConfirmingDeleteId(item.id)
                    }}
                  >
                    <TrashIcon className='h-4 w-4' aria-hidden='true' />
                  </button>
                )}
              </div>
              {isConfirmingDelete && (
                <div className='mt-1 rounded-lg border border-[#E6DDD1] bg-white p-2 text-xs text-[#344054] shadow-sm'>
                  <div className='mb-2 font-medium'>{t('app.accessFirst.sidebar.deleteConfirmation')}</div>
                  <div className='flex gap-2'>
                    <button
                      type='button'
                      className='rounded-md bg-[#725329] px-2.5 py-1.5 font-semibold text-white hover:bg-[#5F4522] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30'
                      onClick={() => {
                        onDeleteConversation(item.id)
                        setConfirmingDeleteId('')
                      }}
                    >
                      {t('app.accessFirst.sidebar.delete')}
                    </button>
                    <button
                      type='button'
                      className='rounded-md border border-[#D7CDBF] px-2.5 py-1.5 font-semibold text-[#344054] hover:bg-[#F7F4EF] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30'
                      onClick={() => setConfirmingDeleteId('')}
                    >
                      {t('app.accessFirst.sidebar.cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className='flex flex-shrink-0 flex-col gap-3 px-4 pb-4'>
        <LanguageSelector />
        <div className="text-[#667085] font-normal text-xs">{copyRight} {(new Date()).getFullYear()}</div>
      </div>
    </div>
  )
}

export default React.memo(Sidebar)
