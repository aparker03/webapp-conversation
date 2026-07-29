import 'server-only'

const DEFAULT_DIFY_API_URL = 'https://api.dify.ai/v1'

export const getDifyConfig = () => {
  const appKey = process.env.DIFY_APP_KEY?.trim()
    || process.env.NEXT_PUBLIC_APP_KEY?.trim()
    || ''
  const apiUrl = (process.env.DIFY_API_URL?.trim()
    || process.env.NEXT_PUBLIC_API_URL?.trim()
    || DEFAULT_DIFY_API_URL).replace(/\/+$/, '')

  if (!appKey) {
    throw new Error('Dify application credentials are not configured.')
  }

  return {
    appKey,
    apiUrl,
  }
}
