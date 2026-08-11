import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo, setSession } from '@/app/api/utils/common'

const PUBLIC_MESSAGES_ERROR_MESSAGE = 'AccessFirst could not load this conversation. Please try again later.'

export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  const { searchParams } = new URL(request.url)
  const conversationId = searchParams.get('conversation_id')
  try {
    const { data }: any = await client.getConversationMessages(user, conversationId as string)
    return NextResponse.json(data, {
      headers: setSession(sessionId),
    })
  }
  catch {
    return NextResponse.json(
      { message: PUBLIC_MESSAGES_ERROR_MESSAGE },
      { status: 502, headers: setSession(sessionId) },
    )
  }
}
