'use client'
import type { FC } from 'react'
import React, { useEffect, useRef } from 'react'
import cn from 'classnames'
import { useTranslation } from 'react-i18next'
import Textarea from 'rc-textarea'
import type { TextAreaRef } from 'rc-textarea'
import { MicrophoneIcon, StopCircleIcon, XMarkIcon } from '@heroicons/react/24/outline'
import s from './style.module.css'
import Answer from './answer'
import Question from './question'
import { useSpeechToText } from './use-speech-to-text'
import { useTextToSpeech } from './use-text-to-speech'
import type { FeedbackFunc } from './type'
import type { ChatItem, SpeechToTextConfig, TextToSpeechConfig, VisionFile, VisionSettings } from '@/types/app'
import { TransferMethod } from '@/types/app'
import Tooltip from '@/app/components/base/tooltip'
import Toast from '@/app/components/base/toast'
import ChatImageUploader from '@/app/components/base/image-uploader/chat-image-uploader'
import ImageList from '@/app/components/base/image-uploader/image-list'
import { useImageFiles } from '@/app/components/base/image-uploader/hooks'
import FileUploaderInAttachmentWrapper from '@/app/components/base/file-uploader-in-attachment'
import type { FileEntity, FileUpload } from '@/app/components/base/file-uploader-in-attachment/types'
import { getProcessedFiles } from '@/app/components/base/file-uploader-in-attachment/utils'
import { SHOW_WORKFLOW_DEBUG } from '@/config'

export interface IChatProps {
  chatList: ChatItem[]
  /**
   * Whether to display the editing area and rating status
   */
  feedbackDisabled?: boolean
  /**
   * Whether to display the input area
   */
  isHideSendInput?: boolean
  onFeedback?: FeedbackFunc
  checkCanSend?: () => boolean
  onSend?: (message: string, files: VisionFile[]) => void
  useCurrentUserAvatar?: boolean
  isResponding?: boolean
  controlClearQuery?: number
  visionConfig?: VisionSettings
  fileConfig?: FileUpload
  draftQuery?: string
  draftQueryMode?: 'example' | 'edit' | null
  onDraftConsumed?: () => void
  onEditAndResend?: (message: string) => void
  speechToTextConfig?: SpeechToTextConfig
  textToSpeechConfig?: TextToSpeechConfig
  audioNavigationKey: string
}

const Chat: FC<IChatProps> = ({
  chatList,
  feedbackDisabled = false,
  isHideSendInput = false,
  onFeedback,
  checkCanSend,
  onSend = () => { },
  useCurrentUserAvatar,
  isResponding,
  controlClearQuery,
  visionConfig,
  fileConfig,
  draftQuery,
  draftQueryMode,
  onDraftConsumed,
  onEditAndResend,
  speechToTextConfig,
  textToSpeechConfig,
  audioNavigationKey,
}) => {
  const { t } = useTranslation()
  const { notify } = Toast
  const isUseInputMethod = useRef(false)

  const [query, setQuery] = React.useState('')
  const [activeDraftMode, setActiveDraftMode] = React.useState<'example' | 'edit' | null>(null)
  const [activeResendMessageId, setActiveResendMessageId] = React.useState('')
  const queryRef = useRef('')
  const textareaRef = useRef<TextAreaRef>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const handleTranscript = React.useCallback((transcript: string) => {
    const currentQuery = queryRef.current
    const separator = currentQuery && !/\s$/.test(currentQuery) ? ' ' : ''
    const nextQuery = `${currentQuery}${separator}${transcript}`
    setQuery(nextQuery)
    queryRef.current = nextQuery
    setActiveDraftMode(null)
    setActiveResendMessageId('')
    textareaRef.current?.focus()
  }, [])

  const speechToText = useSpeechToText({
    enabled: !!speechToTextConfig?.enabled,
    navigationKey: audioNavigationKey,
    onTranscript: handleTranscript,
  })
  const textToSpeech = useTextToSpeech({
    enabled: !!textToSpeechConfig?.enabled,
    navigationKey: audioNavigationKey,
    voice: textToSpeechConfig?.voice,
  })

  const handleContentChange = (e: any) => {
    const value = e.target.value
    setQuery(value)
    queryRef.current = value
  }

  const logError = (message: string) => {
    notify({ type: 'error', message, duration: 3000 })
  }

  const valid = () => {
    const query = queryRef.current
    if (!query || query.trim() === '') {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  useEffect(() => {
    if (controlClearQuery) {
      setQuery('')
      queryRef.current = ''
    }
  }, [controlClearQuery])

  useEffect(() => {
    if (!draftQuery) { return }

    setQuery(draftQuery)
    queryRef.current = draftQuery
    setActiveDraftMode(draftQueryMode || null)
    textareaRef.current?.focus()
    onDraftConsumed?.()
  }, [draftQuery, draftQueryMode, onDraftConsumed])

  useEffect(() => {
    if (typeof messagesEndRef.current?.scrollIntoView === 'function') {
      messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' })
    }
  }, [chatList])
  const {
    files,
    onUpload,
    onRemove,
    onReUpload,
    onImageLinkLoadError,
    onImageLinkLoadSuccess,
    onClear,
  } = useImageFiles()

  const [attachmentFiles, setAttachmentFiles] = React.useState<FileEntity[]>([])

  const handleSend = () => {
    if (!valid() || (checkCanSend && !checkCanSend())) { return }
    const hasPendingImageUploads = files.some(file => file.progress !== -1 && file.progress < 100)
    const hasPendingAttachmentUploads = attachmentFiles.some(file => file.progress !== -1 && file.progress < 100)
    if (hasPendingImageUploads || hasPendingAttachmentUploads) {
      logError(t('app.errorMessage.waitForFileUpload'))
      return
    }
    const imageFiles: VisionFile[] = files.filter(file => file.progress !== -1).map(fileItem => ({
      type: 'image',
      transfer_method: fileItem.type,
      url: fileItem.url,
      upload_file_id: fileItem.fileId,
    }))
    const docAndOtherFiles: VisionFile[] = getProcessedFiles(attachmentFiles)
    const combinedFiles: VisionFile[] = [...imageFiles, ...docAndOtherFiles]
    onSend(queryRef.current, combinedFiles)
    setActiveDraftMode(null)
    setActiveResendMessageId('')
    if (!files.find(item => item.type === TransferMethod.local_file && !item.fileId)) {
      if (files.length) { onClear() }
      if (!isResponding) {
        setQuery('')
        queryRef.current = ''
      }
    }
    if (!attachmentFiles.find(item => item.transferMethod === TransferMethod.local_file && !item.uploadedId)) { setAttachmentFiles([]) }
  }

  const handleKeyUp = (e: any) => {
    if (e.code === 'Enter') {
      e.preventDefault()
      // prevent send message when using input method enter
      if (!e.shiftKey && !isUseInputMethod.current) { handleSend() }
    }
  }

  const handleKeyDown = (e: any) => {
    isUseInputMethod.current = e.nativeEvent.isComposing
    if (e.code === 'Enter' && !e.shiftKey) {
      const result = query.replace(/\n$/, '')
      setQuery(result)
      queryRef.current = result
      e.preventDefault()
    }
  }

  const suggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    queryRef.current = suggestion
    setActiveDraftMode(null)
    setActiveResendMessageId('')
    handleSend()
  }

  const handleEditAndResend = (id: string, content: string) => {
    setActiveResendMessageId(id)
    onEditAndResend?.(content)
  }

  const handleCancelDraft = () => {
    setQuery('')
    queryRef.current = ''
    setActiveDraftMode(null)
    setActiveResendMessageId('')
  }

  const hasVisibleAnswerContent = (item: ChatItem) => {
    if (item.content?.trim()) { return true }
    if ((item.message_files || []).length > 0) { return true }
    if ((item.suggestedQuestions || []).length > 0) { return true }

    const visibleThoughts = (item.agent_thoughts || []).some(thought => !!thought.thought?.trim())
    if (visibleThoughts) { return true }

    return !!(SHOW_WORKFLOW_DEBUG && (item.workflowProcess || (item.agent_thoughts || []).length > 0))
  }

  return (
    <div className={cn(!feedbackDisabled && 'px-3.5', 'flex h-full min-h-0 flex-col')}>
      {/* Chat List */}
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pb-6 tablet:space-y-6">
        {chatList.map((item) => {
          if (item.isAnswer) {
            const isLast = item.id === chatList[chatList.length - 1].id
            const isRespondingAnswer = !!isResponding && isLast
            if (!isRespondingAnswer && !hasVisibleAnswerContent(item)) { return null }

            return <Answer
              key={item.id}
              item={item}
              feedbackDisabled={feedbackDisabled}
              onFeedback={onFeedback}
              isResponding={isRespondingAnswer}
              suggestionClick={suggestionClick}
              textToSpeechEnabled={!!textToSpeechConfig?.enabled}
              textToSpeechState={textToSpeech.state}
              onToggleTextToSpeech={textToSpeech.toggle}
            />
          }
          return (
            <Question
              key={item.id}
              id={item.id}
              content={item.content}
              useCurrentUserAvatar={useCurrentUserAvatar}
              imgSrcs={(item.message_files && item.message_files?.length > 0) ? item.message_files.map(item => item.url) : []}
              isPreparingResend={activeResendMessageId === item.id}
              onEditAndResend={handleEditAndResend}
            />
          )
        })}
        <div ref={messagesEndRef} />
      </div>
      {
        !isHideSendInput && (
          <div className='z-10 w-full max-w-[980px] shrink-0 px-0 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 bg-[#FBFAF8]'>
            {activeDraftMode === 'edit' && (
              <div className='mb-2 flex items-center justify-between gap-3 rounded-lg border border-[#DED2C1] bg-[#FFFDF9] px-3 py-2 text-sm text-[#344054] shadow-sm'>
                <div>
                  <span className='font-semibold text-[#725329]'>Editing a copy of a previous message.</span>
                  <span className='ml-1 text-[#667085]'>Past responses will not change.</span>
                </div>
                <button
                  type='button'
                  className='shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-[#725329] hover:bg-[#F3E8D6] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30'
                  onClick={handleCancelDraft}
                >
                  Cancel
                </button>
              </div>
            )}
            <div className='relative p-[5.5px] max-h-[170px] bg-white border border-[#D7CDBF] rounded-2xl overflow-y-auto shadow-[0_18px_44px_-24px_rgba(52,64,84,0.45)] focus-within:ring-2 focus-within:ring-[#8A642F]/25'>
              {
                visionConfig?.enabled && (
                  <>
                    <div className='absolute bottom-2 left-2 flex items-center'>
                      <ChatImageUploader
                        settings={visionConfig}
                        onUpload={onUpload}
                        disabled={files.length >= visionConfig.number_limits}
                      />
                      <div className='mx-1 w-[1px] h-4 bg-black/5' />
                    </div>
                    <div className='pl-[52px]'>
                      <ImageList
                        list={files}
                        onRemove={onRemove}
                        onReUpload={onReUpload}
                        onImageLinkLoadSuccess={onImageLinkLoadSuccess}
                        onImageLinkLoadError={onImageLinkLoadError}
                      />
                    </div>
                  </>
                )
              }
              {
                fileConfig?.enabled && (
                  <div className={`${visionConfig?.enabled ? 'pl-[52px]' : ''} mb-1`}>
                    <FileUploaderInAttachmentWrapper
                      fileConfig={fileConfig}
                      value={attachmentFiles}
                      onChange={setAttachmentFiles}
                    />
                  </div>
                )
              }
              <Textarea
                ref={textareaRef}
                className={`
                  block w-full px-2 pr-[176px] py-[9px] leading-6 max-h-none text-base text-[#1F2937] placeholder:text-[#667085] outline-none appearance-none resize-none
                  ${visionConfig?.enabled && 'pl-12'}
                `}
                value={query}
                onChange={handleContentChange}
                onKeyUp={handleKeyUp}
                onKeyDown={handleKeyDown}
                autoSize
              />
              <div className="absolute bottom-2 right-3 flex items-center h-8">
                <div className={`${s.count} mr-3 h-5 leading-5 text-xs bg-[#F7F4EF] text-[#667085] px-2 rounded`}>{query.trim().length}</div>
                {speechToTextConfig?.enabled && (
                  <div className='mr-1 flex items-center gap-1'>
                    <button
                      type='button'
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-[#725329] hover:bg-[#F3E8D6] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30 disabled:cursor-wait disabled:opacity-60 ${speechToText.status === 'recording' ? 'bg-[#F3E8D6]' : ''}`}
                      aria-label={speechToText.status === 'recording'
                        ? 'Finish microphone recording'
                        : speechToText.status === 'processing'
                          ? 'Processing microphone recording'
                          : speechToText.isSupported
                            ? 'Start microphone recording'
                            : 'Microphone recording is not supported'}
                      aria-pressed={speechToText.status === 'recording'}
                      disabled={speechToText.status === 'processing'}
                      onClick={speechToText.status === 'recording'
                        ? speechToText.finishRecording
                        : speechToText.startRecording}
                    >
                      {speechToText.status === 'recording'
                        ? <StopCircleIcon className='h-5 w-5' aria-hidden='true' />
                        : <MicrophoneIcon className='h-5 w-5' aria-hidden='true' />}
                    </button>
                    {(speechToText.status === 'recording' || speechToText.status === 'processing') && (
                      <button
                        type='button'
                        className='flex h-8 w-8 items-center justify-center rounded-md text-[#667085] hover:bg-[#F3E8D6] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30'
                        aria-label={speechToText.status === 'recording'
                          ? 'Cancel microphone recording'
                          : 'Cancel transcription'}
                        onClick={speechToText.cancel}
                      >
                        <XMarkIcon className='h-5 w-5' aria-hidden='true' />
                      </button>
                    )}
                  </div>
                )}
                <Tooltip
                  selector='send-tip'
                  htmlContent={
                    <div>
                      <div>{t('common.operation.send')} Enter</div>
                      <div>{t('common.operation.lineBreak')} Shift Enter</div>
                    </div>
                  }
                >
                  <button
                    type='button'
                    className={`${s.sendBtn} w-8 h-8 cursor-pointer rounded-md focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30`}
                    aria-label='Send message'
                    onClick={handleSend}
                  />
                </Tooltip>
              </div>
            </div>
            {speechToTextConfig?.enabled && speechToText.message && (
              <div
                className={`mt-1 px-2 text-xs ${speechToText.status === 'error' ? 'text-red-700' : 'text-[#667085]'}`}
                role='status'
                aria-live='polite'
              >
                {speechToText.status === 'recording'
                  ? `Recording… ${speechToText.elapsedSeconds}s of 60s.`
                  : speechToText.message}
              </div>
            )}
          </div>
        )
      }
    </div>
  )
}

export default React.memo(Chat)
