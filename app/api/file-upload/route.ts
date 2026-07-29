import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { client, getInfo } from '@/app/api/utils/common'

const PUBLIC_UPLOAD_ERROR_MESSAGE = 'AccessFirst could not upload that file. Please try again later.'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const { user } = getInfo(request)
    formData.append('user', user)
    const res = await client.fileUpload(formData)
    return new Response(res.data.id as any)
  }
  catch {
    return NextResponse.json({ message: PUBLIC_UPLOAD_ERROR_MESSAGE }, { status: 502 })
  }
}
