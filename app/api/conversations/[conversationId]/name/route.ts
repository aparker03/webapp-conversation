import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

const PUBLIC_NAME_ERROR_MESSAGE = 'AccessFirst could not update the conversation name. Please try again later.'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ conversationId: string }>
}) {
  try {
    const body = await request.json()
    const {
      auto_generate,
      name,
    } = body
    const { conversationId } = await params
    const { user } = getInfo(request)

    // auto generate name
    const { data } = await client.renameConversation(conversationId, name, user, auto_generate)
    return NextResponse.json(data)
  }
  catch {
    return NextResponse.json({ message: PUBLIC_NAME_ERROR_MESSAGE }, { status: 502 })
  }
}
