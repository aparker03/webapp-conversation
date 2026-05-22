import type { FC } from 'react'
import React from 'react'
import {
  Bars3Icon,
  PencilSquareIcon,
} from '@heroicons/react/24/solid'
import AppIcon from '@/app/components/base/app-icon'
export interface IHeaderProps {
  title: string
  isMobile?: boolean
  onShowSideBar?: () => void
  onCreateNewChat?: () => void
}
const Header: FC<IHeaderProps> = ({
  title,
  isMobile,
  onShowSideBar,
  onCreateNewChat,
}) => {
  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLDivElement>, action?: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      action?.()
    }
  }

  return (
    <div className="shrink-0 flex items-center justify-between h-12 px-3 tablet:px-5 bg-[#F7F4EF] border-b border-[#E5DDD1]">
      {isMobile
        ? (
          <div
            role='button'
            tabIndex={0}
            aria-label='Open conversation history'
            className='flex items-center justify-center h-9 w-9 cursor-pointer rounded-lg text-[#4B5563] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A642F]/40'
            onClick={() => onShowSideBar?.()}
            onKeyDown={event => handleButtonKeyDown(event, onShowSideBar)}
          >
            <Bars3Icon className="h-5 w-5" />
          </div>
        )
        : <div className='w-9'></div>}
      <div className='flex items-center space-x-3 min-w-0'>
        <AppIcon size="small" />
        <div className='min-w-0 leading-tight'>
          <div className="truncate text-sm font-semibold text-[#1F2937]">{title}</div>
          <div className='hidden tablet:block truncate text-[11px] font-medium text-[#6B5A44]'>LA County behavioral health resource navigation</div>
        </div>
      </div>
      {isMobile
        ? (
          <div
            role='button'
            tabIndex={0}
            aria-label='Start a new conversation'
            className='flex items-center justify-center h-9 w-9 cursor-pointer rounded-lg text-[#4B5563] hover:bg-white focus:outline-none focus:ring-2 focus:ring-[#8A642F]/40'
            onClick={() => onCreateNewChat?.()}
            onKeyDown={event => handleButtonKeyDown(event, onCreateNewChat)}
          >
            <PencilSquareIcon className="h-5 w-5" />
          </div>)
        : <div className='w-9'></div>}
    </div>
  )
}

export default React.memo(Header)
