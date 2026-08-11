import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo, setSession } from '@/app/api/utils/common'

const PUBLIC_PARAMETERS_ERROR_MESSAGE = 'AccessFirst could not load its application settings. Please try again later.'

export async function GET(request: NextRequest) {
  const { sessionId, user } = getInfo(request)
  try {
    const { data } = await client.getApplicationParameters(user)
    return NextResponse.json(data as object, {
      headers: setSession(sessionId),
    })
  }
  catch {
    return NextResponse.json(
      { message: PUBLIC_PARAMETERS_ERROR_MESSAGE },
      { status: 502, headers: setSession(sessionId) },
    )
  }
}
