'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ChatItem } from '@/types/app'
import { AudioRequestError, createSpeechAudio } from '@/service'

export type TextToSpeechStatus = 'idle' | 'loading' | 'playing' | 'error'

export interface TextToSpeechState {
  messageId: string
  status: TextToSpeechStatus
  messageKey: string
  message?: string
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const useTextToSpeech = ({
  enabled,
  navigationKey,
  voice,
}: {
  enabled: boolean
  navigationKey: string
  voice?: string
}) => {
  const { t } = useTranslation()
  const [state, setState] = useState<TextToSpeechState>({
    messageId: '',
    status: 'idle',
    messageKey: '',
  })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const objectUrlRef = useRef('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)

  const releaseAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current.removeAttribute('src')
      audioRef.current.load()
      audioRef.current = null
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = ''
    }
  }, [])

  const stop = useCallback(() => {
    operationRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    releaseAudio()
    setState({ messageId: '', status: 'idle', messageKey: '' })
  }, [releaseAudio])

  const toggle = useCallback(async (item: ChatItem) => {
    if (!enabled || !item.content?.trim()) { return }
    if (state.messageId === item.id && (state.status === 'loading' || state.status === 'playing')) {
      stop()
      return
    }

    operationRef.current += 1
    const operation = operationRef.current
    abortControllerRef.current?.abort()
    releaseAudio()

    const abortController = new AbortController()
    abortControllerRef.current = abortController
    setState({ messageId: item.id, status: 'loading', messageKey: 'app.accessFirst.audio.preparing' })

    try {
      const blob = await createSpeechAudio({
        messageId: UUID_PATTERN.test(item.id) ? item.id : undefined,
        text: item.content,
        voice,
        signal: abortController.signal,
      })
      if (operationRef.current !== operation) { return }
      if (!blob.size) { throw new AudioRequestError('app.accessFirst.audio.emptyResponse') }

      const objectUrl = URL.createObjectURL(blob)
      objectUrlRef.current = objectUrl
      const audio = new Audio(objectUrl)
      audioRef.current = audio
      audio.onended = () => {
        if (operationRef.current !== operation) { return }
        releaseAudio()
        setState({ messageId: '', status: 'idle', messageKey: '' })
      }
      audio.onerror = () => {
        if (operationRef.current !== operation) { return }
        releaseAudio()
        setState({
          messageId: item.id,
          status: 'error',
          messageKey: 'app.accessFirst.audio.playbackFailed',
        })
      }

      await audio.play()
      if (operationRef.current !== operation) {
        releaseAudio()
        return
      }

      abortControllerRef.current = null
      setState({ messageId: item.id, status: 'playing', messageKey: 'app.accessFirst.audio.playing' })
    }
    catch (error) {
      if (operationRef.current !== operation || (error instanceof DOMException && error.name === 'AbortError')) { return }

      abortControllerRef.current = null
      releaseAudio()
      setState({
        messageId: item.id,
        status: 'error',
        messageKey: error instanceof AudioRequestError
          ? error.translationKey
          : 'app.accessFirst.audio.playbackFailed',
      })
    }
  }, [enabled, releaseAudio, state.messageId, state.status, stop, voice])

  useEffect(() => {
    stop()
  }, [navigationKey, stop])

  useEffect(() => {
    if (enabled) { return }
    stop()
  }, [enabled, stop])

  useEffect(() => stop, [stop])

  return {
    state: {
      ...state,
      message: state.messageKey ? t(state.messageKey) : '',
    },
    toggle,
    stop,
  }
}
