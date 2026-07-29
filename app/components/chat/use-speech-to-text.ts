'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { convertRecordingToWav, MAX_AUDIO_UPLOAD_BYTES, MAX_RECORDING_SECONDS, supportsAudioRecording } from './audio'
import { transcribeAudio } from '@/service'

export type SpeechToTextStatus = 'idle' | 'recording' | 'processing' | 'cancelled' | 'empty' | 'error'

const getRecordingMimeType = () => {
  const supportedTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
  ]
  return supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
}

const getMicrophoneErrorMessage = (error: unknown) => {
  if (error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError')) {
    return 'Microphone permission was denied. Allow microphone access and try again.'
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No microphone was found.'
  }
  return 'AccessFirst could not start the microphone. Please try again.'
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
  const [status, setStatus] = useState<SpeechToTextStatus>('idle')
  const [message, setMessage] = useState('')
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

  const discardActiveWork = useCallback((nextStatus: SpeechToTextStatus = 'idle', nextMessage = '') => {
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
    setMessage(nextMessage)
  }, [clearTimers, stopTracks])

  const processRecording = useCallback(async (recording: Blob, operation: number) => {
    try {
      if (!recording.size) {
        setStatus('empty')
        setMessage('The recording was empty. Please try again.')
        return
      }

      const wav = await convertRecordingToWav(recording)
      if (operationRef.current !== operation) { return }

      if (!wav.size) {
        setStatus('empty')
        setMessage('The recording was empty. Please try again.')
        return
      }
      if (wav.size > MAX_AUDIO_UPLOAD_BYTES) {
        setStatus('error')
        setMessage('The recording exceeds the 30 MB upload limit.')
        return
      }

      const abortController = new AbortController()
      abortControllerRef.current = abortController
      const transcript = await transcribeAudio(wav, abortController.signal)
      if (operationRef.current !== operation) { return }

      abortControllerRef.current = null
      if (!transcript) {
        setStatus('empty')
        setMessage('No speech was detected. Please try again.')
        return
      }

      onTranscript(transcript)
      setStatus('idle')
      setMessage('Transcript added. Review or edit it before sending.')
    }
    catch (error) {
      if (operationRef.current !== operation || (error instanceof DOMException && error.name === 'AbortError')) { return }

      setStatus('error')
      setMessage(error instanceof Error && error.message
        ? error.message
        : 'AccessFirst could not process that recording. Please try again.')
    }
  }, [onTranscript])

  const finishRecording = useCallback(() => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') { return }

    setStatus('processing')
    setMessage('Converting and transcribing your recording…')
    clearTimers()
    recorder.stop()
    stopTracks()
  }, [clearTimers, stopTracks])

  const startRecording = useCallback(async () => {
    if (!enabled) { return }
    if (!supportsAudioRecording()) {
      setStatus('error')
      setMessage('Microphone recording is not supported in this browser.')
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
        discardActiveWork('error', 'The microphone recording failed. Please try again.')
      }
      recorder.onstop = () => {
        const recording = new Blob(chunksRef.current, { type: recorder.mimeType || mimeType })
        recorderRef.current = null
        chunksRef.current = []
        void processRecording(recording, operation)
      }

      setStatus('recording')
      setMessage(`Recording… maximum ${MAX_RECORDING_SECONDS} seconds.`)
      setElapsedSeconds(0)
      recorder.start(1000)

      const startedAt = Date.now()
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds(Math.min(MAX_RECORDING_SECONDS, Math.floor((Date.now() - startedAt) / 1000)))
      }, 250)
      limitTimerRef.current = setTimeout(finishRecording, MAX_RECORDING_SECONDS * 1000)
    }
    catch (error) {
      discardActiveWork('error', getMicrophoneErrorMessage(error))
    }
  }, [discardActiveWork, enabled, finishRecording, processRecording])

  const cancel = useCallback(() => {
    discardActiveWork('cancelled', 'Recording cancelled.')
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
    message,
    elapsedSeconds,
    isSupported: supportsAudioRecording(),
    startRecording,
    finishRecording,
    cancel,
  }
}
