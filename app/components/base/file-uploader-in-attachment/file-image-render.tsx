import cn from '@/utils/classnames'
import { useTranslation } from 'react-i18next'

interface FileImageRenderProps {
  imageUrl: string
  className?: string
  alt?: string
  onLoad?: () => void
  onError?: () => void
  showDownloadAction?: boolean
}
const FileImageRender = ({
  imageUrl,
  className,
  alt,
  onLoad,
  onError,
  showDownloadAction,
}: FileImageRenderProps) => {
  const { t } = useTranslation()

  return (
    <div className={cn('border-[2px] border-effects-image-frame shadow-xs', className)}>
      <img
        className={cn('h-full w-full object-cover', showDownloadAction && 'cursor-pointer')}
        alt={alt || t('common.imageUploader.previewAlt')}
        onLoad={onLoad}
        onError={onError}
        src={imageUrl}
      />
    </div>
  )
}

export default FileImageRender
