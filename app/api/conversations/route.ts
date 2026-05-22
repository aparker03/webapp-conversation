import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo, setSession } from '@/app/api/utils/common'

const PUBLIC_SERVICE_ERROR_MESSAGE = 'AccessFirst could not connect to its resource service. Please check the app configuration or try again later.'

export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  try {
    const { data }: any = await client.getConversations(user)
    return NextResponse.json(data, {
      headers: setSession(sessionId),
    })
  }
  catch {
    return NextResponse.json({
      data: [],
      error: PUBLIC_SERVICE_ERROR_MESSAGE,
    })
  }
}
