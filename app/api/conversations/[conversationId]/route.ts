import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

const PUBLIC_DELETE_ERROR_MESSAGE = 'AccessFirst could not delete this conversation. Please try again later.'

export async function DELETE(request: NextRequest, { params }: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = await params
  const { user } = getInfo(request)

  try {
    await client.deleteConversation(conversationId, user)
    return new NextResponse(null, { status: 204 })
  }
  catch {
    return NextResponse.json({ message: PUBLIC_DELETE_ERROR_MESSAGE }, { status: 502 })
  }
}
