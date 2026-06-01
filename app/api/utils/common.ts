import type { NextRequest } from 'next/server'
import { ChatClient } from 'dify-client'
import { v4 } from 'uuid'
import { API_KEY, API_URL, APP_ID, APP_INFO } from '@/config'

const userPrefix = `user_${APP_ID}:`
const anonymousUserHeader = 'x-accessfirst-anonymous-user-id'
const anonymousUserPattern = /^af_[a-zA-Z0-9-]{8,80}$/

const getStableUserId = (request: NextRequest) => {
  const anonymousUserId = request.headers.get(anonymousUserHeader)

  if (anonymousUserId && anonymousUserPattern.test(anonymousUserId)) { return anonymousUserId }

  return request.cookies.get('session_id')?.value || v4()
}

export const getInfo = (request: NextRequest) => {
  const sessionId = getStableUserId(request)
  const user = userPrefix + sessionId
  return {
    sessionId,
    user,
  }
}

export const setSession = (sessionId: string) => {
  if (APP_INFO.disable_session_same_site)
  { return { 'Set-Cookie': `session_id=${sessionId}; SameSite=None; Secure` } }

  return { 'Set-Cookie': `session_id=${sessionId}` }
}

export const client = new ChatClient(API_KEY, API_URL || undefined)
