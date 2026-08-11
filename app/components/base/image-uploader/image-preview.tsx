import type { FC } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import XClose from '@/app/components/base/icons/line/x-close'

interface ImagePreviewProps {
  title?: string
  url: string
  onCancel: () => void
}
const ImagePreview: FC<ImagePreviewProps> = ({
  title,
  url,
  onCancel,
}) => {
  const { t } = useTranslation()

  return createPortal(
    <div className='fixed inset-0 p-8 flex items-center justify-center bg-black/80 z-[1000]' onClick={e => e.stopPropagation()}>
      <img
        alt={title || t('common.imageUploader.previewAlt')}
        src={url}
        className='max-w-full max-h-full'
      />
      <button
        type='button'
        aria-label={t('common.imageUploader.closePreview')}
        className='absolute top-6 right-6 flex items-center justify-center w-8 h-8 bg-white/[0.08] rounded-lg backdrop-blur-[2px] cursor-pointer'
        onClick={onCancel}
      >
        <XClose className='w-4 h-4 text-white' />
      </button>
    </div>,
    document.body,
  )
}

export default ImagePreview
