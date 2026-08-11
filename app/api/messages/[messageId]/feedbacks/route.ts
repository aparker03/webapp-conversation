import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

const PUBLIC_FEEDBACK_ERROR_MESSAGE = 'AccessFirst could not save that feedback. Please try again later.'

export async function POST(request: NextRequest, { params }: {
  params: Promise<{ messageId: string }>
}) {
  try {
    const body = await request.json()
    const {
      rating,
    } = body
    const { messageId } = await params
    const { user } = getInfo(request)
    const { data } = await client.messageFeedback(messageId, rating, user)
    return NextResponse.json(data)
  }
  catch {
    return NextResponse.json({ message: PUBLIC_FEEDBACK_ERROR_MESSAGE }, { status: 502 })
  }
}
