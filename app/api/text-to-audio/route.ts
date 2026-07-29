import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { difyFetch, getInfo, setSession } from '@/app/api/utils/common'

const PUBLIC_SPEECH_ERROR_MESSAGE = 'AccessFirst could not create audio for that response. Please try again.'

export async function POST(request: NextRequest) {
  const { sessionId, user } = getInfo(request)

  try {
    const body = await request.json() as {
      message_id?: unknown
      text?: unknown
      voice?: unknown
    }
    const messageId = typeof body.message_id === 'string' ? body.message_id.trim() : ''
    const text = typeof body.text === 'string' ? body.text.trim() : ''
    const voice = typeof body.voice === 'string' ? body.voice.trim() : ''

    if (!messageId && !text) {
      return NextResponse.json(
        { message: 'There is no response text to play.' },
        { status: 400, headers: setSession(sessionId) },
      )
    }

    const response = await difyFetch('/text-to-audio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...(messageId ? { message_id: messageId } : { text }),
        user,
        ...(voice ? { voice } : {}),
        streaming: false,
      }),
    })

    if (!response.ok || !response.body) {
      return NextResponse.json(
        { message: PUBLIC_SPEECH_ERROR_MESSAGE },
        { status: 502, headers: setSession(sessionId) },
      )
    }

    const contentType = response.headers.get('content-type') || 'audio/mpeg'
    return new Response(response.body, {
      headers: {
        ...setSession(sessionId),
        'Cache-Control': 'no-store',
        'Content-Type': contentType,
      },
    })
  }
  catch {
    return NextResponse.json(
      { message: PUBLIC_SPEECH_ERROR_MESSAGE },
      { status: 502, headers: setSession(sessionId) },
    )
  }
}
