import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

const PUBLIC_CHAT_ERROR_MESSAGE = 'AccessFirst could not send that message. Please try again later.'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      inputs,
      query,
      files,
      conversation_id: conversationId,
      response_mode: responseMode,
    } = body
    const { user } = getInfo(request)
    const res = await client.createChatMessage(inputs, query, user, responseMode, conversationId, files)
    return new Response(res.data as any)
  }
  catch {
    return NextResponse.json({ message: PUBLIC_CHAT_ERROR_MESSAGE }, { status: 502 })
  }
}
