'use client'
import type { FC } from 'react'
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import produce, { setAutoFreeze } from 'immer'
import { useBoolean, useGetState } from 'ahooks'
import useConversation from '@/hooks/use-conversation'
import Toast from '@/app/components/base/toast'
import Sidebar from '@/app/components/sidebar'
import ConfigSence from '@/app/components/config-scence'
import Header from '@/app/components/header'
import { deleteConversation, fetchAppParams, fetchChatList, fetchConversations, generationConversationName, sendChatMessage, updateFeedback } from '@/service'
import type { AppParameters, ChatItem, ConversationItem, Feedbacktype, PromptConfig, SpeechToTextConfig, TextToSpeechConfig, VisionFile, VisionSettings } from '@/types/app'
import type { FileUpload } from '@/app/components/base/file-uploader-in-attachment/types'
import { Resolution, TransferMethod, WorkflowRunningStatus } from '@/types/app'
import Chat from '@/app/components/chat'
import { changeLanguage } from '@/i18n/i18next-config'
import type { Locale } from '@/i18n'
import useBreakpoints, { MediaType } from '@/hooks/use-breakpoints'
import Loading from '@/app/components/base/loading'
import { replaceVarWithValues, userInputsFormToPromptVariables } from '@/utils/prompt'
import AppUnavailable from '@/app/components/app-unavailable'
import { APP_ID, APP_INFO, isShowPrompt, promptTemplate } from '@/config'
import type { Annotation as AnnotationType } from '@/types/log'
import { addFileInfos, sortAgentSorts } from '@/utils/tools'

export interface IMainProps {
  initialLocale: Locale
}

interface InFlightConversation {
  requestId: string
  sourceConversationId: string
  sourceViewToken: number
  resolvedConversationId?: string
  chatList: ChatItem[]
  completed: boolean
  discarded?: boolean
}

interface PendingGeneratingNavigation {
  type: 'new' | 'conversation'
  conversationId?: string
}

const Main: FC<IMainProps> = ({ initialLocale }) => {
  const { t, i18n } = useTranslation()
  const media = useBreakpoints()
  const isMobile = media === MediaType.mobile
  const hasSetAppConfig = !!APP_ID

  /*
  * app info
  */
  const [appUnavailable, setAppUnavailable] = useState<boolean>(false)
  const [isUnknownReason, setIsUnknownReason] = useState<boolean>(false)
  const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null)
  const [inited, setInited] = useState<boolean>(false)
  // in mobile, show sidebar by click button
  const [isShowSidebar, { setTrue: showSidebar, setFalse: hideSidebar }] = useBoolean(false)
  const [visionConfig, setVisionConfig] = useState<VisionSettings | undefined>({
    enabled: false,
    number_limits: 2,
    detail: Resolution.low,
    transfer_methods: [TransferMethod.local_file],
  })
  const [fileConfig, setFileConfig] = useState<FileUpload | undefined>()
  const [speechToTextConfig, setSpeechToTextConfig] = useState<SpeechToTextConfig>({ enabled: false })
  const [textToSpeechConfig, setTextToSpeechConfig] = useState<TextToSpeechConfig>({ enabled: false })

  useLayoutEffect(() => {
    void changeLanguage(initialLocale)
    document.documentElement.lang = initialLocale
  }, [initialLocale])

  useEffect(() => {
    if (APP_INFO?.title) {
      document.title = t('app.accessFirst.meta.documentTitle', { title: APP_INFO.title })
    }
  }, [i18n.language, t])

  // onData change thought (the produce obj). https://github.com/immerjs/immer/issues/576
  useEffect(() => {
    setAutoFreeze(false)
    return () => {
      setAutoFreeze(true)
    }
  }, [])

  /*
  * conversation info
  */
  const {
    conversationList,
    setConversationList,
    currConversationId,
    getCurrConversationId,
    setCurrConversationId,
    isNewConversation,
    currConversationInfo,
    currInputs,
    newConversationInputs,
    resetNewConversationInputs,
    setCurrInputs,
    setNewConversationInfo,
    setExistConversationInfo,
  } = useConversation()

  const [_conversationIdChangeBecauseOfNew, setConversationIdChangeBecauseOfNew, _getConversationIdChangeBecauseOfNew] = useGetState(false)
  const [isChatStarted, { setTrue: setChatStarted, setFalse: setChatNotStarted }] = useBoolean(false)
  const [draftExampleQuery, setDraftExampleQuery] = useState('')
  const [draftQueryMode, setDraftQueryMode] = useState<'example' | 'edit' | null>(null)
  const [isLoadingConversation, setIsLoadingConversation] = useState(false)
  const [activeStreamRequestId, setActiveStreamRequestId] = useState('')
  const [pendingGeneratingNavigation, setPendingGeneratingNavigation] = useState<PendingGeneratingNavigation | null>(null)
  const viewTokenRef = useRef(0)
  const fetchConversationTokenRef = useRef(0)
  const activeStreamRequestIdRef = useRef('')
  const inFlightConversationsRef = useRef<Record<string, InFlightConversation>>({})
  const deletedConversationIdsRef = useRef<Set<string>>(new Set())
  const handleStartChat = (inputs: Record<string, any>) => {
    advanceViewToken()
    createNewChat()
    setConversationIdChangeBecauseOfNew(true)
    setCurrInputs(inputs)
    setChatStarted()
    setIsLoadingConversation(false)
    // parse variables in introduction
    setChatList(generateNewChatListWithOpenStatement('', inputs))
  }
  const handleExampleSelect = (example: string, inputs: Record<string, any>) => {
    handleStartChat(inputs)
    setDraftQueryMode('example')
    setDraftExampleQuery(example)
  }
  const handleEditAndResend = (message: string) => {
    setDraftQueryMode('edit')
    setDraftExampleQuery(message)
  }
  const resetToNewSearch = () => {
    advanceViewToken()
    createNewChat()
    setConversationIdChangeBecauseOfNew(true)
    setCurrConversationId('-1', APP_ID, false)
    setChatNotStarted()
    clearDraftState()
    setChatList([])
    setIsLoadingConversation(false)
    resetNewConversationInputs()
    hideSidebar()
  }
  const requestNewConversation = () => {
    if (isResponding) {
      setPendingGeneratingNavigation({ type: 'new' })
      hideSidebar()
      return
    }

    resetToNewSearch()
  }
  const hasSetInputs = (() => {
    if (!isNewConversation) { return true }

    return isChatStarted
  })()

  const conversationName = isNewConversation
    ? t('app.accessFirst.sidebar.newConversation')
    : currConversationInfo?.name || t('app.accessFirst.sidebar.newConversation') as string
  const conversationIntroduction = currConversationInfo?.introduction || ''
  const suggestedQuestions = currConversationInfo?.suggested_questions || []

  const handleConversationSwitch = () => {
    if (!inited) { return }

    // update inputs of current conversation
    let notSyncToStateIntroduction = ''
    let notSyncToStateInputs: Record<string, any> | undefined | null = {}
    if (!isNewConversation) {
      const item = conversationList.find(item => item.id === currConversationId)
      notSyncToStateInputs = item?.inputs || {}
      setCurrInputs(notSyncToStateInputs as any)
      notSyncToStateIntroduction = item?.introduction || ''
      setExistConversationInfo({
        name: item?.name || '',
        introduction: notSyncToStateIntroduction,
        suggested_questions: suggestedQuestions,
      })
    }
    else {
      notSyncToStateInputs = newConversationInputs
      setCurrInputs(notSyncToStateInputs)
    }

    // update chat list of current conversation
    if (!isNewConversation) {
      const selectedConversationId = currConversationId
      const fetchToken = fetchConversationTokenRef.current + 1
      fetchConversationTokenRef.current = fetchToken
      const inFlightConversation = findInFlightConversation(selectedConversationId)

      if (inFlightConversation) {
        setChatList(inFlightConversation.chatList)
        setChatStarted()
        setIsLoadingConversation(false)

        if (!inFlightConversation.completed) { return }
      }
      else {
        setChatList([])
        setIsLoadingConversation(true)
      }

      fetchChatList(selectedConversationId).then((res: any) => {
        if (fetchConversationTokenRef.current !== fetchToken || getCurrConversationId() !== selectedConversationId) { return }

        const { data } = res
        setChatList(buildChatListFromHistory(data || [], notSyncToStateIntroduction, notSyncToStateInputs))
        setChatStarted()
      }).catch(() => {
        if (fetchConversationTokenRef.current !== fetchToken || getCurrConversationId() !== selectedConversationId) { return }

        setChatList([])
        notify({ type: 'error', message: t('app.accessFirst.errors.loadConversation') })
      }).finally(() => {
        if (fetchConversationTokenRef.current === fetchToken && getCurrConversationId() === selectedConversationId) { setIsLoadingConversation(false) }
      })
    }

    if (isNewConversation) {
      setIsLoadingConversation(false)
      if (isChatStarted) { setChatList(generateNewChatListWithOpenStatement()) }
    }
  }
  useEffect(handleConversationSwitch, [currConversationId, inited])

  const openSavedConversation = (id: string) => {
    advanceViewToken()
    setConversationIdChangeBecauseOfNew(false)
    clearDraftState()
    // trigger handleConversationSwitch
    setCurrConversationId(id, APP_ID)
    hideSidebar()
  }

  const handleConversationIdChange = (id: string) => {
    if (id === '-1') {
      requestNewConversation()
      return
    }

    if (isResponding) {
      setPendingGeneratingNavigation({ type: 'conversation', conversationId: id })
      hideSidebar()
      return
    }

    openSavedConversation(id)
  }

  const handleDeleteConversation = async (id: string) => {
    if (id === '-1') { return }

    try {
      await deleteConversation(id)
      deletedConversationIdsRef.current.add(id)
      Object.keys(inFlightConversationsRef.current).forEach((requestId) => {
        const inFlight = inFlightConversationsRef.current[requestId]
        if (inFlight.resolvedConversationId === id || inFlight.sourceConversationId === id) { delete inFlightConversationsRef.current[requestId] }
      })
      const isDeletingCurrentConversation = id === getCurrConversationId()

      setConversationList(produce(conversationList, (draft) => {
        const index = draft.findIndex(item => item.id === id)
        if (index >= 0) { draft.splice(index, 1) }
        if (isDeletingCurrentConversation && !draft.some(item => item.id === '-1')) {
          draft.unshift({
            id: '-1',
            name: t('app.chat.newChatDefaultName'),
            inputs: newConversationInputs,
            introduction: conversationIntroduction,
            suggested_questions: suggestedQuestions,
          })
        }
      }))

      if (isDeletingCurrentConversation) {
        advanceViewToken()
        setConversationIdChangeBecauseOfNew(true)
        setCurrConversationId('-1', APP_ID, false)
        setChatNotStarted()
        clearDraftState()
        setChatList([])
        setIsLoadingConversation(false)
      }

      notify({ type: 'success', message: t('app.accessFirst.errors.conversationDeleted') })
      hideSidebar()
    }
    catch {
      notify({ type: 'error', message: t('app.accessFirst.errors.deleteConversation') })
    }
  }

  /*
  * chat info. chat is under conversation.
  */
  const [chatList, setChatList, getChatList] = useGetState<ChatItem[]>([])

  function advanceViewToken() {
    viewTokenRef.current += 1
    fetchConversationTokenRef.current += 1
  }

  function clearDraftState() {
    setDraftExampleQuery('')
    setDraftQueryMode(null)
  }

  function markActiveStream(requestId: string) {
    activeStreamRequestIdRef.current = requestId
    setActiveStreamRequestId(requestId)
  }

  function clearActiveStream(requestId: string) {
    if (activeStreamRequestIdRef.current !== requestId) { return }
    activeStreamRequestIdRef.current = ''
    setActiveStreamRequestId('')
  }

  function findInFlightConversation(conversationId: string) {
    return Object.values(inFlightConversationsRef.current).find(item =>
      !item.discarded && (item.resolvedConversationId === conversationId || item.sourceConversationId === conversationId),
    )
  }

  function isViewingStream(requestId: string) {
    const inFlight = inFlightConversationsRef.current[requestId]
    if (!inFlight) { return false }
    if (inFlight.discarded) { return false }

    const selectedConversationId = getCurrConversationId()
    if (inFlight.resolvedConversationId) { return selectedConversationId === inFlight.resolvedConversationId }

    return selectedConversationId === inFlight.sourceConversationId && viewTokenRef.current === inFlight.sourceViewToken
  }

  function setCachedChatList(requestId: string, nextChatList: ChatItem[]) {
    const inFlight = inFlightConversationsRef.current[requestId]
    if (!inFlight) { return }
    if (inFlight.discarded) { return }

    inFlight.chatList = nextChatList
    if (isViewingStream(requestId)) {
      setChatStarted()
      setIsLoadingConversation(false)
      setChatList(nextChatList)
    }
  }

  function updateCachedQA({
    requestId,
    responseItem,
    questionId,
    placeholderAnswerId,
    questionItem,
  }: {
    requestId: string
    responseItem: ChatItem
    questionId: string
    placeholderAnswerId: string
    questionItem: ChatItem
  }) {
    const inFlight = inFlightConversationsRef.current[requestId]
    if (!inFlight) { return }
    if (inFlight.discarded) { return }

    const newListWithAnswer = produce(
      inFlight.chatList.filter(item => item.id !== responseItem.id && item.id !== placeholderAnswerId),
      (draft) => {
        if (!draft.find(item => item.id === questionId)) { draft.push({ ...questionItem }) }

        draft.push({ ...responseItem })
      },
    )
    setCachedChatList(requestId, newListWithAnswer)
  }

  function updateCachedMessage(requestId: string, messageId: string, answer: string) {
    const inFlight = inFlightConversationsRef.current[requestId]
    if (!inFlight) { return }
    if (inFlight.discarded) { return }

    const nextChatList = produce(inFlight.chatList, (draft) => {
      const current = draft.find(item => item.id === messageId)
      if (current) { current.content = answer }
    })
    setCachedChatList(requestId, nextChatList)
  }

  function removeCachedPlaceholder(requestId: string, placeholderAnswerId: string) {
    const inFlight = inFlightConversationsRef.current[requestId]
    if (!inFlight) { return }

    setCachedChatList(requestId, inFlight.chatList.filter(item => item.id !== placeholderAnswerId))
  }

  function removeEmptyAssistantPlaceholders(list: ChatItem[]) {
    return list.filter(item => !(item.isAnswer && item.id.startsWith('answer-placeholder-') && !item.content?.trim()))
  }

  function discardActiveLocalStream() {
    const requestId = activeStreamRequestIdRef.current
    if (!requestId) { return }

    const inFlight = inFlightConversationsRef.current[requestId]
    if (inFlight) {
      inFlight.discarded = true
      inFlight.completed = true
      inFlight.chatList = removeEmptyAssistantPlaceholders(inFlight.chatList)
    }

    setChatList(removeEmptyAssistantPlaceholders(getChatList()))
    clearActiveStream(requestId)
    setRespondingFalse()
  }

  function handleStayOnGeneratingConversation() {
    setPendingGeneratingNavigation(null)
  }

  function handleConfirmGeneratingNavigation() {
    if (!pendingGeneratingNavigation) { return }

    const nextNavigation = pendingGeneratingNavigation
    setPendingGeneratingNavigation(null)
    discardActiveLocalStream()

    if (nextNavigation.type === 'conversation' && nextNavigation.conversationId) {
      openSavedConversation(nextNavigation.conversationId)
      return
    }

    resetToNewSearch()
  }

  function getConversationPreviewName(message: string) {
    const compactMessage = message.trim().replace(/\s+/g, ' ')
    if (!compactMessage) { return t('app.chat.newChatDefaultName') as string }

    return compactMessage.length > 48 ? `${compactMessage.slice(0, 45)}...` : compactMessage
  }

  function upsertConversationInSidebar(
    id: string,
    name: string,
    inputs?: Record<string, any> | null,
    options: { replaceName?: boolean, removeNewPlaceholder?: boolean } = {},
  ) {
    if (!id || id === '-1' || deletedConversationIdsRef.current.has(id)) { return }

    setConversationList(currentList => produce(currentList, (draft) => {
      if (options.removeNewPlaceholder) {
        const placeholderIndex = draft.findIndex(item => item.id === '-1')
        if (placeholderIndex >= 0) { draft.splice(placeholderIndex, 1) }
      }

      const existing = draft.find(item => item.id === id)
      if (existing) {
        if (name && options.replaceName !== false) { existing.name = name }
        existing.inputs = inputs === undefined ? existing.inputs : inputs
        existing.introduction = existing.introduction || conversationIntroduction
        existing.suggested_questions = existing.suggested_questions || suggestedQuestions
        return
      }

      draft.unshift({
        id,
        name: name || t('app.chat.newChatDefaultName'),
        inputs: inputs === undefined ? currInputs : inputs,
        introduction: conversationIntroduction,
        suggested_questions: suggestedQuestions,
      })
    }))
  }

  function buildChatListFromHistory(data: any[], introduction?: string, inputs?: Record<string, any> | null) {
    const newChatList: ChatItem[] = generateNewChatListWithOpenStatement(introduction, inputs)

    data.forEach((item: any) => {
      newChatList.push({
        id: `question-${item.id}`,
        content: item.query,
        isAnswer: false,
        message_files: item.message_files?.filter((file: any) => file.belongs_to === 'user') || [],
      })
      newChatList.push({
        id: item.id,
        content: item.answer,
        agent_thoughts: addFileInfos(item.agent_thoughts ? sortAgentSorts(item.agent_thoughts) : item.agent_thoughts, item.message_files),
        feedback: item.feedback,
        isAnswer: true,
        message_files: item.message_files?.filter((file: any) => file.belongs_to === 'assistant') || [],
      })
    })

    return newChatList
  }

  // user can not edit inputs if user had send message
  const canEditInputs = !chatList.some(item => item.isAnswer === false) && isNewConversation
  const createNewChat = () => {
    // if new chat is already exist, do not create new chat
    if (conversationList.some(item => item.id === '-1')) { return }

    setConversationList(produce(conversationList, (draft) => {
      draft.unshift({
        id: '-1',
        name: t('app.chat.newChatDefaultName'),
        inputs: newConversationInputs,
        introduction: conversationIntroduction,
        suggested_questions: suggestedQuestions,
      })
    }))
  }

  // sometime introduction is not applied to state
  const generateNewChatListWithOpenStatement = (introduction?: string, inputs?: Record<string, any> | null) => {
    let calculatedIntroduction = introduction || conversationIntroduction || ''
    const calculatedPromptVariables = inputs || currInputs || null
    if (calculatedIntroduction && calculatedPromptVariables) { calculatedIntroduction = replaceVarWithValues(calculatedIntroduction, promptConfig?.prompt_variables || [], calculatedPromptVariables) }

    const openStatement = {
      id: `${Date.now()}`,
      content: calculatedIntroduction,
      isAnswer: true,
      feedbackDisabled: true,
      isOpeningStatement: isShowPrompt,
      suggestedQuestions,
    }
    if (calculatedIntroduction) { return [openStatement] }

    return []
  }

  // init
  useEffect(() => {
    if (!hasSetAppConfig) {
      setAppUnavailable(true)
      return
    }
    (async () => {
      try {
        const [conversationData, appParams] = await Promise.all([fetchConversations(), fetchAppParams()])
        // handle current conversation id
        const { data: conversations, error } = conversationData as { data: ConversationItem[], error: string }
        if (error) {
          Toast.notify({ type: 'error', message: t('app.accessFirst.errors.serviceUnavailable') })
          throw new Error(error)
        }
        // fetch new conversation info
        const {
          user_input_form,
          opening_statement: introduction = '',
          file_upload,
          system_parameters,
          suggested_questions = [],
          speech_to_text,
          text_to_speech,
        } = appParams as AppParameters
        setNewConversationInfo({
          name: t('app.accessFirst.sidebar.newConversation'),
          introduction,
          suggested_questions,
        })
        const prompt_variables = userInputsFormToPromptVariables(user_input_form || [])
        setPromptConfig({
          prompt_template: promptTemplate,
          prompt_variables,
        } as PromptConfig)
        const outerFileUploadEnabled = !!file_upload?.enabled
        setVisionConfig({
          ...file_upload?.image,
          enabled: !!(outerFileUploadEnabled && file_upload?.image?.enabled),
          image_file_size_limit: system_parameters?.system_parameters || 0,
        })
        setFileConfig({
          enabled: outerFileUploadEnabled,
          allowed_file_types: file_upload?.allowed_file_types,
          allowed_file_extensions: file_upload?.allowed_file_extensions,
          allowed_file_upload_methods: file_upload?.allowed_file_upload_methods,
          number_limits: file_upload?.number_limits,
          fileUploadConfig: file_upload?.fileUploadConfig,
        })
        setSpeechToTextConfig({ enabled: !!speech_to_text?.enabled })
        setTextToSpeechConfig({
          enabled: !!text_to_speech?.enabled,
          voice: text_to_speech?.voice,
          language: text_to_speech?.language,
          autoPlay: text_to_speech?.autoPlay,
        })
        setConversationList(conversations as ConversationItem[])

        setInited(true)
      }
      catch (e: any) {
        if (e.status === 404) {
          setAppUnavailable(true)
        }
        else {
          setIsUnknownReason(true)
          setAppUnavailable(true)
        }
      }
    })()
  }, [])

  const [isResponding, { setTrue: setRespondingTrue, setFalse: setRespondingFalse }] = useBoolean(false)
  const [abortController, setAbortController] = useState<AbortController | null>(null)
  useEffect(() => {
    if (!isResponding) { return }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isResponding])

  const { notify } = Toast
  const logError = (message: string) => {
    notify({ type: 'error', message })
  }

  const checkCanSend = () => {
    if (currConversationId !== '-1') { return true }

    if (!currInputs || !promptConfig?.prompt_variables) { return true }

    let emptyRequiredInput = false
    promptConfig.prompt_variables.forEach((item) => {
      if (item.required && !currInputs[item.key]) {
        emptyRequiredInput = true
      }
    })

    if (emptyRequiredInput) {
      logError(t('app.errorMessage.valueOfVarRequired'))
      return false
    }
    return true
  }

  const [controlFocus, setControlFocus] = useState(0)
  const [openingSuggestedQuestions, setOpeningSuggestedQuestions] = useState<string[]>([])
  const [messageTaskId, setMessageTaskId] = useState('')
  const [hasStopResponded, setHasStopResponded, getHasStopResponded] = useGetState(false)
  const [isRespondingConIsCurrCon, setIsRespondingConCurrCon, getIsRespondingConIsCurrCon] = useGetState(true)
  const [userQuery, setUserQuery] = useState('')

  const transformToServerFile = (fileItem: any) => {
    return {
      type: 'image',
      transfer_method: fileItem.transferMethod,
      url: fileItem.url,
      upload_file_id: fileItem.id,
    }
  }

  const handleSend = async (message: string, files?: VisionFile[]) => {
    if (isResponding) {
      notify({ type: 'info', message: t('app.errorMessage.waitForResponse') })
      return
    }
    const toServerInputs: Record<string, any> = {}
    if (currInputs) {
      Object.keys(currInputs).forEach((key) => {
        const value = currInputs[key]
        if (value.supportFileType) { toServerInputs[key] = transformToServerFile(value) }

        else if (value[0]?.supportFileType) { toServerInputs[key] = value.map((item: any) => transformToServerFile(item)) }

        else { toServerInputs[key] = value }
      })
    }

    const data: Record<string, any> = {
      inputs: toServerInputs,
      query: message,
      conversation_id: isNewConversation ? null : currConversationId,
    }

    if (files && files?.length > 0) {
      data.files = files.map((item) => {
        if (item.transfer_method === TransferMethod.local_file) {
          return {
            ...item,
            url: '',
          }
        }
        return item
      })
    }

    // question
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    const sourceConversationId = getCurrConversationId() || '-1'
    const sourceViewToken = viewTokenRef.current
    const questionId = `question-${Date.now()}`
    const questionItem = {
      id: questionId,
      content: message,
      isAnswer: false,
      message_files: (files || []).filter((f: any) => f.type === 'image'),
    }

    const placeholderAnswerId = `answer-placeholder-${Date.now()}`
    const placeholderAnswerItem = {
      id: placeholderAnswerId,
      content: '',
      isAnswer: true,
    }

    const newList = [...getChatList(), questionItem, placeholderAnswerItem]
    inFlightConversationsRef.current[requestId] = {
      requestId,
      sourceConversationId,
      sourceViewToken,
      chatList: newList,
      completed: false,
    }
    markActiveStream(requestId)
    setChatList(newList)

    let isAgentMode = false

    // answer
    const responseItem: ChatItem = {
      id: placeholderAnswerId,
      content: '',
      agent_thoughts: [],
      message_files: [],
      isAnswer: true,
    }
    let hasSetResponseId = false

    let tempNewConversationId = ''

    setRespondingTrue()
    sendChatMessage(data, {
      getAbortController: (abortController) => {
        setAbortController(abortController)
      },
      onData: (message: string, isFirstMessage: boolean, { conversationId: newConversationId, messageId, taskId }: any) => {
        const inFlight = inFlightConversationsRef.current[requestId]
        if (inFlight?.discarded) { return }

        if (!isAgentMode) {
          responseItem.content = responseItem.content + message
        }
        else {
          const lastThought = responseItem.agent_thoughts?.[responseItem.agent_thoughts?.length - 1]
          if (lastThought) { lastThought.thought = lastThought.thought + message } // need immer setAutoFreeze
        }
        if (messageId && !hasSetResponseId) {
          responseItem.id = messageId
          hasSetResponseId = true
        }

        if (isFirstMessage && newConversationId) {
          tempNewConversationId = newConversationId
          if (inFlight && !inFlight.resolvedConversationId && !deletedConversationIdsRef.current.has(newConversationId)) {
            inFlight.resolvedConversationId = newConversationId
            const isNewConversationStream = inFlight.sourceConversationId === '-1'
            upsertConversationInSidebar(
              newConversationId,
              getConversationPreviewName(questionItem.content),
              currInputs,
              {
                replaceName: isNewConversationStream,
                removeNewPlaceholder: isNewConversationStream,
              },
            )

            if (
              isNewConversationStream
              && getCurrConversationId() === '-1'
              && viewTokenRef.current === inFlight.sourceViewToken
            ) {
              setCurrConversationId(newConversationId, APP_ID, true)
            }
          }
        }

        setMessageTaskId(taskId)
        if (!isViewingStream(requestId)) { setIsRespondingConCurrCon(false) }
        updateCachedQA({
          requestId,
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      async onCompleted(hasError?: boolean) {
        const inFlight = inFlightConversationsRef.current[requestId]
        if (!inFlight) {
          setRespondingFalse()
          clearActiveStream(requestId)
          return
        }
        if (inFlight.discarded) {
          clearActiveStream(requestId)
          return
        }

        if (hasError) {
          removeCachedPlaceholder(requestId, placeholderAnswerId)
          inFlight.completed = true
          setRespondingFalse()
          clearActiveStream(requestId)
          return
        }

        inFlight.completed = true
        const resolvedConversationId = inFlight.resolvedConversationId || tempNewConversationId
        if (resolvedConversationId && !deletedConversationIdsRef.current.has(resolvedConversationId)) {
          try {
            const newItem: any = inFlight.sourceConversationId === '-1'
              ? await generationConversationName(resolvedConversationId)
              : null
            const { data: allConversations }: any = await fetchConversations()
            const visibleConversations = (allConversations || []).filter((item: ConversationItem) => !deletedConversationIdsRef.current.has(item.id))
            const newAllConversations = produce(visibleConversations, (draft: any) => {
              const current = draft.find((item: ConversationItem) => item.id === resolvedConversationId)
              if (current && newItem?.name) { current.name = newItem.name }
            })
            setConversationList(newAllConversations as any)
          }
          catch {
            const isNewConversationStream = inFlight.sourceConversationId === '-1'
            upsertConversationInSidebar(
              resolvedConversationId,
              getConversationPreviewName(questionItem.content),
              currInputs,
              {
                replaceName: isNewConversationStream,
                removeNewPlaceholder: isNewConversationStream,
              },
            )
          }
        }

        if (isViewingStream(requestId)) {
          if (resolvedConversationId && getCurrConversationId() === '-1') { setCurrConversationId(resolvedConversationId, APP_ID, true) }
          resetNewConversationInputs()
          setChatNotStarted()
        }
        setConversationIdChangeBecauseOfNew(false)
        setRespondingFalse()
        clearActiveStream(requestId)
      },
      onFile(file) {
        if (inFlightConversationsRef.current[requestId]?.discarded) { return }

        const lastThought = responseItem.agent_thoughts?.[responseItem.agent_thoughts?.length - 1]
        if (lastThought) { lastThought.message_files = [...(lastThought as any).message_files, { ...file }] }

        updateCachedQA({
          requestId,
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      onThought(thought) {
        if (inFlightConversationsRef.current[requestId]?.discarded) { return }

        isAgentMode = true
        const response = responseItem as any
        if (thought.message_id && !hasSetResponseId) {
          response.id = thought.message_id
          hasSetResponseId = true
        }
        // responseItem.id = thought.message_id;
        if (response.agent_thoughts.length === 0) {
          response.agent_thoughts.push(thought)
        }
        else {
          const lastThought = response.agent_thoughts[response.agent_thoughts.length - 1]
          // thought changed but still the same thought, so update.
          if (lastThought.id === thought.id) {
            thought.thought = lastThought.thought
            thought.message_files = lastThought.message_files
            responseItem.agent_thoughts![response.agent_thoughts.length - 1] = thought
          }
          else {
            responseItem.agent_thoughts!.push(thought)
          }
        }
        if (!isViewingStream(requestId)) { setIsRespondingConCurrCon(false) }

        updateCachedQA({
          requestId,
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      onMessageEnd: (messageEnd) => {
        if (inFlightConversationsRef.current[requestId]?.discarded) { return }

        if (messageEnd.metadata?.annotation_reply) {
          responseItem.id = messageEnd.id
          responseItem.annotation = ({
            id: messageEnd.metadata.annotation_reply.id,
            authorName: messageEnd.metadata.annotation_reply.account.name,
          } as AnnotationType)
          updateCachedQA({
            requestId,
            responseItem,
            questionId,
            placeholderAnswerId,
            questionItem,
          })
          return
        }
        // not support show citation
        // responseItem.citation = messageEnd.retriever_resources
        updateCachedQA({
          requestId,
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      onMessageReplace: (messageReplace) => {
        if (inFlightConversationsRef.current[requestId]?.discarded) { return }

        updateCachedMessage(requestId, messageReplace.id, messageReplace.answer)
      },
      onError() {
        removeCachedPlaceholder(requestId, placeholderAnswerId)
        setRespondingFalse()
        clearActiveStream(requestId)
      },
      onWorkflowStarted: ({ workflow_run_id, task_id }) => {
        if (inFlightConversationsRef.current[requestId]?.discarded) { return }

        // taskIdRef.current = task_id
        responseItem.workflow_run_id = workflow_run_id
        responseItem.workflowProcess = {
          status: WorkflowRunningStatus.Running,
          tracing: [],
        }
        updateCachedQA({
          requestId,
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      onWorkflowFinished: ({ data }) => {
        if (inFlightConversationsRef.current[requestId]?.discarded) { return }
        if (!responseItem.workflowProcess) { return }

        responseItem.workflowProcess!.status = data.status as WorkflowRunningStatus
        updateCachedQA({
          requestId,
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      onNodeStarted: ({ data }) => {
        if (inFlightConversationsRef.current[requestId]?.discarded) { return }
        if (!responseItem.workflowProcess) { return }

        responseItem.workflowProcess!.tracing!.push(data as any)
        updateCachedQA({
          requestId,
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
      onNodeFinished: ({ data }) => {
        if (inFlightConversationsRef.current[requestId]?.discarded) { return }
        if (!responseItem.workflowProcess) { return }

        const currentIndex = responseItem.workflowProcess!.tracing!.findIndex(item => item.node_id === data.node_id)
        if (currentIndex >= 0) { responseItem.workflowProcess!.tracing[currentIndex] = data as any }
        updateCachedQA({
          requestId,
          responseItem,
          questionId,
          placeholderAnswerId,
          questionItem,
        })
      },
    })
  }

  const handleFeedback = async (messageId: string, feedback: Feedbacktype) => {
    await updateFeedback({ url: `/messages/${messageId}/feedbacks`, body: { rating: feedback.rating } })
    const newChatList = chatList.map((item) => {
      if (item.id === messageId) {
        return {
          ...item,
          feedback,
        }
      }
      return item
    })
    setChatList(newChatList)
    notify({ type: 'success', message: t('app.accessFirst.feedback.saved') })
  }

  const renderSidebar = () => {
    if (!APP_ID || !APP_INFO || !promptConfig) { return null }
    return (
      <Sidebar
        list={conversationList}
        onCurrentIdChange={handleConversationIdChange}
        onDeleteConversation={handleDeleteConversation}
        currentId={currConversationId}
        copyRight={APP_INFO.copyright || APP_INFO.title}
      />
    )
  }

  if (appUnavailable) {
    return (
      <AppUnavailable
        isUnknownReason={isUnknownReason}
        errMessage={!hasSetAppConfig ? t('app.accessFirst.unavailable.missingConfiguration') : ''}
      />
    )
  }

  if (!APP_ID || !APP_INFO || !promptConfig) { return <Loading type='app' /> }

  const isVisibleConversationResponding = !!activeStreamRequestId && isViewingStream(activeStreamRequestId)
  const isConversationSwitchGuard = pendingGeneratingNavigation?.type === 'conversation'

  return (
    <div className='flex h-dvh flex-col overflow-hidden bg-[#F7F4EF] text-[#1F2937]'>
      <Header
        title={APP_INFO.title}
        isMobile={isMobile}
        onShowSideBar={showSidebar}
        onCreateNewChat={requestNewConversation}
      />
      <div className="flex min-h-0 flex-1 rounded-t-[24px] bg-[#FBFAF8] overflow-hidden border-t border-[#E5DDD1] shadow-[0_-18px_48px_-36px_rgba(85,64,38,0.55)]">
        {/* sidebar */}
        {!isMobile && renderSidebar()}
        {isMobile && isShowSidebar && (
          <div className='fixed inset-0 z-50' style={{ backgroundColor: 'rgba(35, 56, 118, 0.2)' }} onClick={hideSidebar} >
            <div className='inline-block h-full' onClick={e => e.stopPropagation()}>
              {renderSidebar()}
            </div>
          </div>
        )}
        {/* main */}
        <div className={`flex-grow flex min-h-0 flex-col ${hasSetInputs ? 'overflow-hidden' : 'overflow-y-auto'}`}>
          <ConfigSence
            conversationName={conversationName}
            hasSetInputs={hasSetInputs}
            isPublicVersion={isShowPrompt}
            siteInfo={APP_INFO}
            promptConfig={promptConfig}
            onStartChat={handleStartChat}
            onExampleSelect={handleExampleSelect}
            canEditInputs={canEditInputs}
            savedInputs={currInputs as Record<string, any>}
            onInputsChange={setCurrInputs}
          ></ConfigSence>

          {
            hasSetInputs && (
              <div className='relative flex min-h-0 w-full max-w-[980px] grow flex-col mobile:w-full mx-auto px-0 pc:px-3 tablet:px-3'>
                {isLoadingConversation && chatList.length === 0
                  ? (
                    <div className='flex min-h-0 flex-1 items-center justify-center px-6 text-sm font-medium text-[#667085]'>
                      {t('app.accessFirst.chat.loadingConversation')}
                    </div>
                  )
                  : (
                    <Chat
                      chatList={chatList}
                      onSend={handleSend}
                      onFeedback={handleFeedback}
                      isResponding={isVisibleConversationResponding}
                      checkCanSend={checkCanSend}
                      visionConfig={visionConfig}
                      fileConfig={fileConfig}
                      speechToTextConfig={speechToTextConfig}
                      textToSpeechConfig={textToSpeechConfig}
                      audioNavigationKey={currConversationId}
                      draftQuery={draftExampleQuery}
                      draftQueryMode={draftQueryMode}
                      onDraftConsumed={() => {
                        setDraftExampleQuery('')
                        setDraftQueryMode(null)
                      }}
                      onEditAndResend={handleEditAndResend}
                    />
                  )}
              </div>)
          }
        </div>
      </div>
      {pendingGeneratingNavigation && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-[#1F2937]/30 px-4'>
          <div
            className='w-full max-w-md rounded-xl border border-[#E6DDD1] bg-[#FFFDF9] p-5 shadow-[0_24px_80px_-36px_rgba(31,41,55,0.65)]'
            role='dialog'
            aria-modal='true'
            aria-labelledby='generating-navigation-title'
          >
            <div id='generating-navigation-title' className='text-base font-semibold text-[#1F2937]'>
              {t('app.accessFirst.chat.responseGenerating')}
            </div>
            <p className='mt-2 text-sm leading-6 text-[#4B5563]'>
              {isConversationSwitchGuard
                ? t('app.accessFirst.chat.stayOrOpen')
                : t('app.accessFirst.chat.stayOrNew')}
            </p>
            <div className='mt-5 flex flex-col-reverse gap-2 tablet:flex-row tablet:justify-end'>
              <button
                type='button'
                className='rounded-lg border border-[#D7CDBF] bg-white px-4 py-2 text-sm font-semibold text-[#344054] hover:bg-[#F7F4EF] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30'
                onClick={handleStayOnGeneratingConversation}
              >
                {t('app.accessFirst.chat.stay')}
              </button>
              <button
                type='button'
                className='rounded-lg bg-[#725329] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5F4522] focus:outline-none focus:ring-2 focus:ring-[#8A642F]/30'
                onClick={handleConfirmGeneratingNavigation}
              >
                {isConversationSwitchGuard
                  ? t('app.accessFirst.chat.discardAndOpen')
                  : t('app.accessFirst.chat.discardAndNew')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default React.memo(Main)
