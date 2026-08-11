'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { convertRecordingToWav, MAX_AUDIO_UPLOAD_BYTES, MAX_RECORDING_SECONDS, supportsAudioRecording } from './audio'
import { AudioRequestError, transcribeAudio } from '@/service'

export type SpeechToTextStatus = 'idle' | 'recording' | 'processing' | 'cancelled' | 'empty' | 'error'

const getRecordingMimeType = () => {
  const supportedTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]
  return supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
}

const getMicrophoneErrorKey = (error: unknown) => {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return 'app.accessFirst.audio.permissionDenied'
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'app.accessFirst.audio.noMicrophone'
  }
  return 'app.accessFirst.audio.startMicrophoneFailed'
}

export const useSpeechToText = ({
  enabled,
  navigationKey,
  onTranscript,
}: {
  enabled: boolean
  navigationKey: string
  onTranscript: (transcript: string) => void
}) => {
  const { t } = useTranslation()
  const [status, setStatus] = useState<SpeechToTextStatus>('idle')
  const [messageKey, setMessageKey] = useState('')
  const [messageValues, setMessageValues] = useState<Record<string, number>>({})
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const limitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const operationRef = useRef(0)

  const clearTimers = useCallback(() => {
    if (limitTimerRef.current) {
      clearTimeout(limitTimerRef.current)
      limitTimerRef.current = null
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current)
      elapsedTimerRef.current = null
    }
  }, [])

  const stopTracks = useCallback(() => {
    streamRef.current?.getTracks().forEach(track => track.stop())
    streamRef.current = null
  }, [])

  const discardActiveWork = useCallback((nextStatus: SpeechToTextStatus = 'idle', nextMessageKey = '') => {
    operationRef.current += 1
    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    clearTimers()

    const recorder = recorderRef.current
    if (recorder) {
      recorder.ondataavailable = null
      recorder.onstop = null
      recorder.onerror = null
      if (recorder.state !== 'inactive') {
        recorder.stop()
      }
    }

    recorderRef.current = null
    chunksRef.current = []
    stopTracks()
    setElapsedSeconds(0)
    setStatus(nextStatus)
    setMessageKey(nextMessageKey)
    setMessageValues({})
  }, [clearTimers, stopTracks])

  const processRecording = useCallback(async (recording: Blob, operation: number) => {
    try {
      if (!recording.size) {
        setStatus('empty')
        setMessageKey('app.accessFirst.audio.recordingEmpty')
        return
      }

      const wav = await convertRecordingToWav(recording)
      if (operationRef.current !== operation) { return }

      if (!wav.size) {
        setStatus('empty')
        setMessageKey('app.accessFirst.audio.recordingEmpty')
        return
      }
      if (wav.size > MAX_AUDIO_UPLOAD_BYTES) {
        setStatus('error')
        setMessageKey('app.accessFirst.audio.recordingTooLarge')
        return
      }

      const abortController = new AbortController()
      abortControllerRef.current = abortController
      const transcript = await transcribeAudio(wav, abortController.signal)
      if (operationRef.current !== operation) { return }

      abortControllerRef.current = null
      if (!transcript) {
        setStatus('empty')
        setMessageKey('app.accessFirst.audio.noSpeech')
        return
      }

      onTranscript(transcript)
      setStatus('idle')
      setMessageKey('app.accessFirst.audio.transcriptAdded')
    }
    catch (error) {
      if (operationRef.current !== operation || (error instanceof DOMException && error.name === 'AbortError')) { return }

      setStatus('error')
      setMessageKey(error instanceof AudioRequestError
        ? error.translationKey
        : 'app.accessFirst.audio.processingFailed')
    }
  }, [onTranscript])

  const finishRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') { return }

    setStatus('processing')
    setMessageKey('app.accessFirst.audio.processing')
    clearTimers()
    recorder.stop()
    stopTracks()
  }, [clearTimers, stopTracks])

  const startRecording = useCallback(async () => {
    if (!enabled) { return }
    if (!supportsAudioRecording()) {
      setStatus('error')
      setMessageKey('app.accessFirst.audio.unsupportedBrowser')
      return
    }

    discardActiveWork()
    const operation = operationRef.current

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (operationRef.current !== operation) {
        stream.getTracks().forEach(track => track.stop())
        return
      }

      const mimeType = getRecordingMimeType()
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      streamRef.current = stream
      recorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) { chunksRef.current.push(event.data) }
      }
      recorder.onerror = () => {
        discardActiveWork('error', 'app.accessFirst.audio.recordingFailed')
      }
      recorder.onstop = () => {
        const recording = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType })
        recorderRef.current = null
        chunksRef.current = []
        void processRecording(recording, operation)
      }

      setStatus('recording')
      setMessageKey('app.accessFirst.audio.recordingMaximum')
      setMessageValues({ seconds: MAX_RECORDING_SECONDS })
      setElapsedSeconds(0)
      recorder.start(1000)

      const startedAt = Date.now()
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds(Math.min(MAX_RECORDING_SECONDS, Math.floor((Date.now() - startedAt) / 1000)))
      }, 250)
      limitTimerRef.current = setTimeout(finishRecording, MAX_RECORDING_SECONDS * 1000)
    }
    catch (error) {
      discardActiveWork('error', getMicrophoneErrorKey(error))
    }
  }, [discardActiveWork, enabled, finishRecording, processRecording])

  const cancel = useCallback(() => {
    discardActiveWork('cancelled', 'app.accessFirst.audio.recordingCancelled')
  }, [discardActiveWork])

  useEffect(() => {
    discardActiveWork()
  }, [discardActiveWork, navigationKey])

  useEffect(() => {
    if (enabled) { return }
    discardActiveWork()
  }, [discardActiveWork, enabled])

  useEffect(() => {
    return () => {
      operationRef.current += 1
      abortControllerRef.current?.abort()
      clearTimers()
      const recorder = recorderRef.current
      if (recorder && recorder.state !== 'inactive') {
        recorder.ondataavailable = null
        recorder.onstop = null
        recorder.stop()
      }
      stopTracks()
    }
  }, [clearTimers, stopTracks])

  return {
    status,
    message: messageKey ? t(messageKey, messageValues) : '',
    elapsedSeconds,
    isSupported: supportsAudioRecording(),
    startRecording,
    finishRecording,
    cancel,
  }
}
