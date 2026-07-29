import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { difyFetch, getInfo, setSession } from '@/app/api/utils/common'

const MAX_AUDIO_BYTES = 30 * 1024 * 1024
const PUBLIC_TRANSCRIPTION_ERROR_MESSAGE = 'AccessFirst could not transcribe that recording. Please try again.'

export async function POST(request: NextRequest) {
  const { sessionId, user } = getInfo(request)

  try {
    const incomingFormData = await request.formData()
    const file = incomingFormData.get('file')

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { message: 'Choose a recording to transcribe.' },
        { status: 400, headers: setSession(sessionId) },
      )
    }

    if (file.size === 0) {
      return NextResponse.json(
        { message: 'The recording was empty.' },
        { status: 400, headers: setSession(sessionId) },
      )
    }

    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json(
        { message: 'The recording exceeds the 30 MB upload limit.' },
        { status: 413, headers: setSession(sessionId) },
      )
    }

    if (file.type !== 'audio/wav' && file.type !== 'audio/x-wav') {
      return NextResponse.json(
        { message: 'The recording could not be converted to WAV.' },
        { status: 415, headers: setSession(sessionId) },
      )
    }

    const difyFormData = new FormData()
    difyFormData.append('file', file, 'recording.wav')
    difyFormData.append('user', user)

    const response = await difyFetch('/audio-to-text', {
      method: 'POST',
      body: difyFormData,
    })

    if (!response.ok) {
      return NextResponse.json(
        { message: PUBLIC_TRANSCRIPTION_ERROR_MESSAGE },
        { status: 502, headers: setSession(sessionId) },
      )
    }

    const data = await response.json() as { text?: unknown }
    const text = typeof data.text === 'string' ? data.text.trim() : ''

    return NextResponse.json({ text }, { headers: setSession(sessionId) })
  }
  catch {
    return NextResponse.json(
      { message: PUBLIC_TRANSCRIPTION_ERROR_MESSAGE },
      { status: 502, headers: setSession(sessionId) },
    )
  }
}
