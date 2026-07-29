import type { AppInfo } from '@/types/app'
export const APP_ID = `${process.env.NEXT_PUBLIC_APP_ID}`
export const APP_INFO: AppInfo = {
  title: 'AccessFirst',
  description: 'Los Angeles County behavioral health resource navigation',
  copyright: '',
  privacy_policy: '',
  default_language: 'en',
  disable_session_same_site: false, // set it to true if you want to embed the chatbot in an iframe
}

export const isShowPrompt = false
export const promptTemplate = ''
export const SHOW_WORKFLOW_DEBUG = process.env.NEXT_PUBLIC_SHOW_WORKFLOW_DEBUG === 'true'

export const API_PREFIX = '/api'

export const LOCALE_COOKIE_NAME = 'locale'

export const DEFAULT_VALUE_MAX_LEN = 48
