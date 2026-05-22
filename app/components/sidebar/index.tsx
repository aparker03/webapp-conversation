import React from 'react'
import type { FC } from 'react'
import {
  ChatBubbleOvalLeftEllipsisIcon,
  PencilSquareIcon,
} from '@heroicons/react/24/outline'
import { ChatBubbleOvalLeftEllipsisIcon as ChatBubbleOvalLeftEllipsisSolidIcon } from '@heroicons/react/24/solid'
import Button from '@/app/components/base/button'
import type { ConversationItem } from '@/types/app'

function classNames(...classes: any[]) {
  return classes.filter(Boolean).join(' ')
}

const MAX_CONVERSATION_LENTH = 20

export interface ISidebarProps {
  copyRight: string
  currentId: string
  onCurrentIdChange: (id: string) => void
  list: ConversationItem[]
}

const Sidebar: FC<ISidebarProps> = ({
  copyRight,
  currentId,
  onCurrentIdChange,
  list,
}) => {
  return (
    <div
      className="shrink-0 flex flex-col overflow-y-auto bg-[#FDFBF8] pc:w-[260px] tablet:w-[216px] mobile:w-[260px] border-r border-[#E6DDD1] tablet:h-[calc(100vh_-_3rem)] mobile:h-screen"
    >
      {list.length < MAX_CONVERSATION_LENTH && (
        <div className="flex flex-shrink-0 p-4 !pb-0">
          <Button
            onClick={() => { onCurrentIdChange('-1') }}
            className="group block w-full flex-shrink-0 !justify-start !h-10 !rounded-lg !border-[#D7CDBF] !bg-white !text-[#725329] items-center text-sm hover:!border-[#BFA783] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/25"
          >
            <PencilSquareIcon className="mr-2 h-4 w-4" /> New search
          </Button>
        </div>
      )}

      <nav className="mt-4 flex-1 space-y-1 p-4 !pt-0">
        {list.map((item) => {
          const isCurrent = item.id === currentId
          const ItemIcon
            = isCurrent ? ChatBubbleOvalLeftEllipsisSolidIcon : ChatBubbleOvalLeftEllipsisIcon
          return (
            <div
              onClick={() => onCurrentIdChange(item.id)}
              key={item.id}
              className={classNames(
                isCurrent
                  ? 'bg-[#F3E8D6] text-[#725329] shadow-sm'
                  : 'text-[#344054] hover:bg-white hover:text-[#1F2937]',
                'group flex items-center rounded-lg px-3 py-2.5 text-sm font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8A642F]/25',
              )}
              tabIndex={0}
              role='button'
              aria-label={`Open search ${item.name}`}
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
              <span className='truncate'>{item.name}</span>
            </div>
          )
        })}
      </nav>

      <div className="flex flex-shrink-0 pr-4 pb-4 pl-4">
        <div className="text-[#667085] font-normal text-xs">{copyRight} {(new Date()).getFullYear()}</div>
      </div>
    </div>
  )
}

export default React.memo(Sidebar)
