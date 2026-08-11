import type { IOnCompleted, IOnData, IOnError, IOnFile, IOnMessageEnd, IOnMessageReplace, IOnNodeFinished, IOnNodeStarted, IOnThought, IOnWorkflowFinished, IOnWorkflowStarted } from './base'
import { del, get, getAnonymousUserRequestHeaders, post, ssePost } from './base'
import type { Feedbacktype } from '@/types/app'
import type { AppParameters } from '@/types/app'

export const sendChatMessage = async (
  body: Record<string, any>,
  {
    onData,
    onCompleted,
    onThought,
    onFile,
    onError,
    getAbortController,
    onMessageEnd,
    onMessageReplace,
    onWorkflowStarted,
    onNodeStarted,
    onNodeFinished,
    onWorkflowFinished,
  }: {
    onData: IOnData
    onCompleted: IOnCompleted
    onFile: IOnFile
    onThought: IOnThought
    onMessageEnd: IOnMessageEnd
    onMessageReplace: IOnMessageReplace
    onError: IOnError
    getAbortController?: (abortController: AbortController) => void
    onWorkflowStarted: IOnWorkflowStarted
    onNodeStarted: IOnNodeStarted
    onNodeFinished: IOnNodeFinished
    onWorkflowFinished: IOnWorkflowFinished
  },
) => {
  return ssePost('chat-messages', {
    body: {
      ...body,
      response_mode: 'streaming',
    },
  }, { onData, onCompleted, onThought, onFile, onError, getAbortController, onMessageEnd, onMessageReplace, onNodeStarted, onWorkflowStarted, onWorkflowFinished, onNodeFinished })
}

export const fetchConversations = async () => {
  return get('conversations', { params: { limit: 100, first_id: '' } })
}

export const fetchChatList = async (conversationId: string) => {
  return get('messages', { params: { conversation_id: conversationId, limit: 20, last_id: '' } })
}

// init value. wait for server update
export const fetchAppParams = async () => {
  return get('parameters') as Promise<AppParameters>
}

export const updateFeedback = async ({ url, body }: { url: string, body: Feedbacktype }) => {
  return post(url, { body })
}

export const generationConversationName = async (id: string) => {
  return post(`conversations/${id}/name`, { body: { auto_generate: true } })
}

export const deleteConversation = async (id: string) => {
  return del(`conversations/${id}`)
}

export class AudioRequestError extends Error {
  translationKey: string

  constructor(translationKey: string) {
    super(translationKey)
    this.name = 'AudioRequestError'
    this.translationKey = translationKey
  }
}

export const transcribeAudio = async (file: Blob, signal: AbortSignal) => {
  const formData = new FormData()
  formData.append('file', file, 'recording.wav')

  const response = await fetch('/api/audio-to-text', {
    method: 'POST',
    credentials: 'include',
    headers: getAnonymousUserRequestHeaders(),
    body: formData,
    signal,
  })

  if (!response.ok) {
    throw new AudioRequestError('app.accessFirst.audio.transcriptionFailed')
  }

  const data = await response.json() as { text?: unknown }
  return typeof data.text === 'string' ? data.text.trim() : ''
}

export const createSpeechAudio = async ({
  messageId,
  text,
  voice,
  signal,
}: {
  messageId?: string
  text: string
  voice?: string
  signal: AbortSignal
}) => {
  const response = await fetch('/api/text-to-audio', {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...getAnonymousUserRequestHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...(messageId ? { message_id: messageId } : { text }),
      voice,
    }),
    signal,
  })

  if (!response.ok) {
    throw new AudioRequestError('app.accessFirst.audio.creationFailed')
  }

  return response.blob()
}
