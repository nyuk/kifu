'use client'

import axios from 'axios'
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ClipboardEvent } from 'react'
import { AccentHeroCard } from '../common/AccentHeroCard'
import {
  createMarketingIdea,
  fetchMarketingWorkspace,
  generateMarketingDraft,
  saveMarketingChannelSetting,
  saveMarketingPublication,
  updateMarketingDraft,
} from '../../lib/marketing'
import {
  defaultMarketingProductKey,
  getMarketingProductConfig,
  visibleMarketingProductOptions,
  type MarketingProductKey,
} from '../../lib/marketingProducts'
import type {
  CreateMarketingIdeaPayload,
  MarketingAngleType,
  MarketingChannel,
  MarketingContentIntent,
  MarketingIdeaAttachment,
  MarketingPublication,
  MarketingChannelSetting,
  MarketingDraftStatus,
  MarketingEvidenceSource,
  MarketingFormatStyle,
  MarketingWorkspaceResponse,
} from '../../types/marketing'
import {
  marketingAngleLabels,
  marketingChannelLabels,
  marketingContentIntentLabels,
  marketingDraftStatusLabels,
  marketingEvidenceSourceLabels,
  marketingFormatStyleLabels,
} from '../../types/marketing'
import { useAuthStore } from '../../stores/auth'

type IdeaFormState = {
  title: string
  raw_note: string
  angle_type: MarketingAngleType
  message_pillar: string
  channels: MarketingChannel[]
  content_intent: MarketingContentIntent
  evidence_source: MarketingEvidenceSource
  format_style: MarketingFormatStyle
  source_link: string
  attachments: MarketingIdeaAttachment[]
}

type DraftEditorState = {
  title: string
  content: string
  tone: string
  risk_flags_text: string
  status: MarketingDraftStatus
}

type ChannelSettingFormState = {
  publication_name: string
  publication_url: string
  default_category: string
  primary_audience: string
  tone_guide: string
  default_cta: string
  proof_points: string
  reference_notes: string
}

type BlogPreviewSection = {
  heading: string
  body: string
}

type BlogDraftPreview = {
  titleCandidates: string[]
  sections: BlogPreviewSection[]
}

type WorkspaceTab = 'capture' | 'review'

type DraftPrepInput = Pick<
  CreateMarketingIdeaPayload,
  'raw_note' | 'content_intent' | 'evidence_source' | 'format_style' | 'source_link' | 'message_pillar' | 'attachments'
>

type IdeaDraftPrepStatus = {
  blocking: string[]
  warnings: string[]
}

const runeLength = (value: string) => Array.from(value.trim()).length
const hasDigit = (value: string) => /\d/.test(value)
const hasAnyCue = (value: string, cues: string[]) => cues.some((cue) => value.includes(cue))

const recordCues = ['기록', '복기', '메모', '이유', '기준', '진입', '청산']
const screenCues = ['화면', '스크린', '캡처', '카드', '메모', '복기', '기록', '플로우', '차트', '캔들', '15분봉', '15m']

const getIdeaDraftPrepStatus = (input: DraftPrepInput): IdeaDraftPrepStatus => {
  const rawNote = input.raw_note.trim()
  const sourceLink = input.source_link?.trim() ?? ''
  const combined = `${rawNote} ${input.message_pillar ?? ''}`.trim()
  const attachments = input.attachments ?? []
  const blocking: string[] = []
  const warnings: string[] = []

  if (runeLength(rawNote) < 60) {
    blocking.push('원본 메모에 당시 장면, 왜 중요했는지, 무엇을 다시 확인하고 싶은지까지 조금 더 적어주세요.')
  }

  if ((input.evidence_source === 'news' || input.evidence_source === 'quote') && !sourceLink) {
    blocking.push('뉴스/인용 기반 초안은 출처 링크를 함께 넣어주세요.')
  }

  if (input.evidence_source === 'screenshot' && !hasAnyCue(rawNote, screenCues) && attachments.length === 0) {
    blocking.push('스크린샷 근거라면 raw note에 어떤 화면이나 카드가 보이는지 적어주세요.')
  }

  if ((input.evidence_source === 'screenshot' || input.evidence_source === 'generated_image') && attachments.length === 0) {
    blocking.push('이미지 근거 초안은 실제 이미지 첨부가 필요합니다.')
  }

  if (input.format_style === 'news_reaction' && !hasDigit(rawNote) && !sourceLink) {
    blocking.push('뉴스 반응형 초안은 숫자나 사건명 같은 구체 포인트를 raw note에 더 적어주세요.')
  }

  if (input.content_intent !== 'non_promo' && !hasAnyCue(combined, recordCues)) {
    warnings.push('지금 입력이면 두 번째 문단의 제품 연결이 약해질 수 있습니다. 기록/복기/메모/기준 같은 단어를 한 번 더 넣어주세요.')
  }

  if (attachments.length > 0 && attachments.every((attachment) => !(attachment.note ?? '').trim()) && rawNote.length < 120) {
    warnings.push('이미지를 붙였다면 무엇을 보여주는지 한 줄 메모를 함께 남기면 초안 품질이 더 좋아집니다.')
  }

  return { blocking, warnings }
}

const splitBlogTitleCandidates = (raw: string) =>
  raw
    .split(' - ')
    .map((item) => item.replace(/^- /, '').trim())
    .filter(Boolean)

const messagePillars = [
  'Kifu는 트레이더가 왜 진입했고 왜 청산했는지 잊지 않게 돕습니다.',
  'Kifu는 거래 기록, 메모, 복기를 한 흐름으로 묶어 반복 실수를 줄입니다.',
  'Kifu는 매수와 매도 이유를 남겨 다음 판단이 더 나아지도록 돕습니다.',
]

const angleOptions = Object.entries(marketingAngleLabels) as Array<[MarketingAngleType, string]>
const channelOptions = Object.entries(marketingChannelLabels) as Array<[MarketingChannel, string]>
const contentIntentOptions = Object.entries(marketingContentIntentLabels) as Array<[MarketingContentIntent, string]>
const evidenceSourceOptions = Object.entries(marketingEvidenceSourceLabels) as Array<[MarketingEvidenceSource, string]>
const formatStyleOptions = Object.entries(marketingFormatStyleLabels) as Array<[MarketingFormatStyle, string]>
const draftStatusOptions = Object.entries(marketingDraftStatusLabels) as Array<[MarketingDraftStatus, string]>

const defaultIdeaForm = (productKey: MarketingProductKey): IdeaFormState => ({
  title: '',
  raw_note: '',
  angle_type: 'feature',
  message_pillar: getMarketingProductConfig(productKey).messagePillars[0],
  channels: ['x'],
  content_intent: 'soft_promo',
  evidence_source: 'personal_note',
  format_style: 'reflection',
  source_link: '',
  attachments: [],
})

const emptyDraftEditor = (): DraftEditorState => ({
  title: '',
  content: '',
  tone: '',
  risk_flags_text: '',
  status: 'approval_pending',
})

const emptyChannelSettingForm = (): ChannelSettingFormState => ({
  publication_name: '',
  publication_url: '',
  default_category: '',
  primary_audience: '',
  tone_guide: '',
  default_cta: '',
  proof_points: '',
  reference_notes: '',
})

const formatDateTime = (value: string) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const statusToneClass: Record<MarketingDraftStatus, string> = {
  approval_pending: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  approved: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  on_hold: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  discarded: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
}

const toneLabels: Record<string, string> = {
  build_in_public: '빌드 인 퍼블릭',
  educational: '교육형',
  demo_script: '데모 대본',
  '빌드 인 퍼블릭': '빌드 인 퍼블릭',
  교육형: '교육형',
  '데모 대본': '데모 대본',
}

const displayTone = (tone: string) => toneLabels[tone] ?? tone

const summarizeChannelSetting = (setting: MarketingChannelSetting | null) =>
  [
    setting?.publication_name,
    setting?.default_category,
    setting?.primary_audience,
  ]
    .map((item) => item?.trim())
    .filter(Boolean)
    .join(' · ')

const parseBlogDraftPreview = (content: string): BlogDraftPreview => {
  const normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/\s*(# 제목 후보|## 도입|## 문제 맥락|## Kifu가 연결되는 지점|## 이미지\/화면 포인트|## 마무리)\s*/g, '\n$1\n')
    .replace(/\n{3,}/g, '\n\n')

  const lines = normalized.split('\n')
  const titleCandidates: string[] = []
  const sections: BlogPreviewSection[] = []
  let currentHeading = ''
  let currentLines: string[] = []
  let inTitleSection = false

  const flushSection = () => {
    const body = currentLines.join('\n').trim()
    if (currentHeading && body) {
      sections.push({
        heading: currentHeading,
        body,
      })
    }
    currentHeading = ''
    currentLines = []
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) {
      if (!inTitleSection && currentLines.length > 0) {
        currentLines.push('')
      }
      continue
    }

    if (line.startsWith('# ')) {
      flushSection()
      inTitleSection = line.includes('제목 후보')
      const trailing = line.replace(/^#\s+제목 후보/, '').trim()
      if (inTitleSection && trailing) {
        splitBlogTitleCandidates(trailing).forEach((item) => titleCandidates.push(item))
      }
      continue
    }

    if (line.startsWith('## ')) {
      flushSection()
      inTitleSection = false
      currentHeading = line.replace(/^##\s+/, '').trim()
      continue
    }

    if (inTitleSection && line.startsWith('- ')) {
      splitBlogTitleCandidates(line).forEach((item) => titleCandidates.push(item))
      continue
    }

    currentLines.push(line)
  }

  flushSection()

  if (titleCandidates.length === 0 && sections.length === 0) {
    return {
      titleCandidates: [],
      sections: [{ heading: '본문 초안', body: content.trim() }],
    }
  }

  return { titleCandidates, sections }
}

const buildBlogPublishText = (title: string, preview: BlogDraftPreview | null) => {
  if (!preview) {
    return title.trim()
  }

  const sections = preview.sections
    .map((section, index) => {
      const heading = section.heading.trim()
      const body = section.body.trim()
      if (!body) return ''

      if (index === 0 && heading === '도입') {
        return body
      }

      return `${heading}\n${body}`
    })
    .filter(Boolean)

  return [title.trim(), ...sections].filter(Boolean).join('\n\n')
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) {
      return message
    }
  }
  return error instanceof Error ? error.message : fallback
}

const allowedMarketingImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

const readFileAsDataURL = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : ''
      if (!value) {
        reject(new Error('이미지 데이터를 읽지 못했습니다.'))
        return
      }
      resolve(value)
    }
    reader.onerror = () => reject(new Error('이미지 파일을 읽는 중 오류가 발생했습니다.'))
    reader.readAsDataURL(file)
  })

const createIdeaAttachmentFromFile = async (file: File): Promise<MarketingIdeaAttachment> => {
  const mimeType = file.type.toLowerCase()
  if (!allowedMarketingImageTypes.includes(mimeType)) {
    throw new Error('PNG, JPG, WEBP 이미지만 첨부할 수 있습니다.')
  }
  if (file.size > 1_800_000) {
    throw new Error('이미지 크기는 1.8MB 이하여야 합니다.')
  }

  const dataURL = await readFileAsDataURL(file)
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name?.trim() || `image-${Date.now()}`,
    mime_type: mimeType,
    data_url: dataURL,
    note: '',
  }
}

const normalizeBlogPublishText = (text: string) =>
  text
    .replace(/\n\n도입\n/g, '\n\n')
    .replace(/\n\n문제 맥락\n/g, '\n\n왜 기준이 흔들릴까\n')
    .replace(/\n\nKifu가 연결되는 지점\n/g, '\n\n기록이 필요한 이유\n')
    .replace(/\n\n이미지\/화면 포인트\n/g, '\n\n함께 보여주면 좋은 화면\n')

const isAuthError = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return false
  }
  const status = error.response?.status ?? 0
  return status === 401 || status === 403
}

export function MarketingWorkspace() {
  const hasHydrated = useAuthStore((state) => state._hasHydrated)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const [activeProductKey, setActiveProductKey] = useState<MarketingProductKey>(defaultMarketingProductKey)
  const [workspace, setWorkspace] = useState<MarketingWorkspaceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [ideaForm, setIdeaForm] = useState<IdeaFormState>(() => defaultIdeaForm(defaultMarketingProductKey))
  const [draftEditor, setDraftEditor] = useState<DraftEditorState>(emptyDraftEditor)
  const [publicationUrl, setPublicationUrl] = useState('')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkspaceTab>('capture')
  const [blogSettingsExpanded, setBlogSettingsExpanded] = useState(false)
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [savingIdea, setSavingIdea] = useState(false)
  const [starterDraftingIndex, setStarterDraftingIndex] = useState<number | null>(null)
  const [generatingDraftId, setGeneratingDraftId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [savingPublication, setSavingPublication] = useState(false)
  const [savingChannelSettings, setSavingChannelSettings] = useState(false)
  const [channelSettingForm, setChannelSettingForm] = useState<ChannelSettingFormState>(emptyChannelSettingForm)
  const workspaceFlowRef = useRef<HTMLDivElement | null>(null)
  const attachmentInputRef = useRef<HTMLInputElement | null>(null)
  const activeProduct = getMarketingProductConfig(activeProductKey)
  const availableMessagePillars = activeProduct.messagePillars.length > 0 ? activeProduct.messagePillars : messagePillars

  const handleAuthFailure = (message: string) => {
    setWorkspace(null)
    setSelectedIdeaId(null)
    setSelectedDraftId(null)
    setDraftEditor(emptyDraftEditor())
    setPublicationUrl('')
    setSuccessMessage(null)
    setError(message)
  }

  const focusWorkspaceTab = (nextTab: WorkspaceTab) => {
    setActiveWorkspaceTab(nextTab)
    window.requestAnimationFrame(() => {
      workspaceFlowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const loadWorkspace = useCallback(async () => {
    if (!hasHydrated) {
      return
    }
    if (!isAuthenticated) {
      handleAuthFailure('로그인이 필요합니다. 다시 로그인해주세요.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const nextWorkspace = await fetchMarketingWorkspace(activeProductKey)
      setWorkspace(nextWorkspace)
    } catch (loadError) {
      if (isAuthError(loadError)) {
        handleAuthFailure('세션이 만료되었습니다. 다시 로그인해주세요.')
        return
      }
      setWorkspace(null)
      setError(getErrorMessage(loadError, '마케팅 워크스페이스를 불러오지 못했습니다.'))
    } finally {
      setLoading(false)
    }
  }, [activeProductKey, hasHydrated, isAuthenticated])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  useEffect(() => {
    setIdeaForm(defaultIdeaForm(activeProductKey))
    setActiveWorkspaceTab('capture')
    setBlogSettingsExpanded(false)
    setSelectedIdeaId(null)
    setSelectedDraftId(null)
    setDraftEditor(emptyDraftEditor())
    setPublicationUrl('')
    setSuccessMessage(null)
    setError(null)
  }, [activeProductKey])

  useEffect(() => {
    if (!workspace) return

    const hasSelectedIdea = workspace.ideas.some((idea) => idea.id === selectedIdeaId)
    if (!hasSelectedIdea) {
      setSelectedIdeaId(workspace.ideas[0]?.id ?? null)
    }

    const hasSelectedDraft = workspace.drafts.some((draft) => draft.id === selectedDraftId)
    if (!hasSelectedDraft) {
      setSelectedDraftId(workspace.drafts[0]?.id ?? null)
    }
  }, [workspace, selectedDraftId, selectedIdeaId])

  const selectedIdea = useMemo(
    () => workspace?.ideas.find((idea) => idea.id === selectedIdeaId) ?? null,
    [selectedIdeaId, workspace]
  )

  const selectedDraft = useMemo(
    () => workspace?.drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [selectedDraftId, workspace]
  )

  const publicationByDraftId = useMemo(() => {
    const entries = (workspace?.publications ?? []).map((publication) => [publication.draft_id, publication] as const)
    return new Map<string, MarketingPublication>(entries)
  }, [workspace])

  const selectedPublication = useMemo(
    () => (selectedDraft ? publicationByDraftId.get(selectedDraft.id) ?? null : null),
    [publicationByDraftId, selectedDraft]
  )

  const naverBlogSetting = useMemo(
    () => workspace?.channel_settings.find((setting) => setting.channel === 'naver_blog') ?? null,
    [workspace]
  )

  const selectedBlogPreview = useMemo(() => {
    if (selectedDraft?.channel !== 'naver_blog') {
      return null
    }
    return parseBlogDraftPreview(draftEditor.content)
  }, [draftEditor.content, selectedDraft])

  const selectedBlogPublishText = useMemo(() => {
    if (selectedDraft?.channel !== 'naver_blog') {
      return ''
    }
    return normalizeBlogPublishText(buildBlogPublishText(draftEditor.title, selectedBlogPreview))
  }, [draftEditor.title, selectedBlogPreview, selectedDraft])

  const ideaFormPrepStatus = useMemo(() => getIdeaDraftPrepStatus(ideaForm), [ideaForm])

  const ideaPrepById = useMemo(() => {
    const entries = (workspace?.ideas ?? []).map(
      (idea) =>
        [
          idea.id,
          getIdeaDraftPrepStatus({
            ...idea,
            source_link: idea.source_link ?? undefined,
          }),
        ] as const
    )
    return new Map<string, IdeaDraftPrepStatus>(entries)
  }, [workspace])

  const selectedIdeaPrepStatus = useMemo(
    () => (selectedIdea ? ideaPrepById.get(selectedIdea.id) ?? null : null),
    [ideaPrepById, selectedIdea]
  )

  useEffect(() => {
    if (!selectedDraft) {
      setDraftEditor(emptyDraftEditor())
      setPublicationUrl('')
      return
    }
    setDraftEditor({
      title: selectedDraft.title,
      content: selectedDraft.content,
      tone: displayTone(selectedDraft.tone),
      risk_flags_text: selectedDraft.risk_flags.join('\n'),
      status: selectedDraft.status,
    })
  }, [selectedDraft])

  useEffect(() => {
    setPublicationUrl(selectedPublication?.external_url ?? '')
  }, [selectedPublication])

  useEffect(() => {
    if (!naverBlogSetting) {
      setChannelSettingForm(emptyChannelSettingForm())
      return
    }

    setChannelSettingForm({
      publication_name: naverBlogSetting.publication_name ?? '',
      publication_url: naverBlogSetting.publication_url ?? '',
      default_category: naverBlogSetting.default_category ?? '',
      primary_audience: naverBlogSetting.primary_audience ?? '',
      tone_guide: naverBlogSetting.tone_guide ?? '',
      default_cta: naverBlogSetting.default_cta ?? '',
      proof_points: naverBlogSetting.proof_points ?? '',
      reference_notes: naverBlogSetting.reference_notes ?? '',
    })
  }, [naverBlogSetting])

  const handleIdeaFieldChange = <K extends keyof IdeaFormState>(field: K, value: IdeaFormState[K]) => {
    setIdeaForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleIdeaAttachmentFiles = async (files: FileList | File[]) => {
    const nextFiles = Array.from(files)
    if (nextFiles.length === 0) {
      return
    }
    if ((ideaForm.attachments?.length ?? 0) + nextFiles.length > 3) {
      setError('이미지는 최대 3개까지 첨부할 수 있습니다.')
      setSuccessMessage(null)
      return
    }

    setError(null)
    setSuccessMessage(null)
    try {
      const created = await Promise.all(nextFiles.map((file) => createIdeaAttachmentFromFile(file)))
      setIdeaForm((current) => ({
        ...current,
        attachments: [...current.attachments, ...created],
      }))
      setSuccessMessage(`${created.length}개의 이미지를 첨부했습니다.`)
    } catch (attachmentError) {
      setError(getErrorMessage(attachmentError, '이미지를 첨부하지 못했습니다.'))
    }
  }

  const handleIdeaAttachmentPaste = async (event: ClipboardEvent<HTMLDivElement>) => {
    const items = Array.from(event.clipboardData?.items ?? [])
    const files = items
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file))

    if (files.length === 0) {
      return
    }
    event.preventDefault()
    await handleIdeaAttachmentFiles(files)
  }

  const handleAttachmentInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      await handleIdeaAttachmentFiles(files)
    }
    event.target.value = ''
  }

  const updateIdeaAttachmentNote = (attachmentId: string, note: string) => {
    setIdeaForm((current) => ({
      ...current,
      attachments: current.attachments.map((attachment) =>
        attachment.id === attachmentId ? { ...attachment, note } : attachment
      ),
    }))
  }

  const removeIdeaAttachment = (attachmentId: string) => {
    setIdeaForm((current) => ({
      ...current,
      attachments: current.attachments.filter((attachment) => attachment.id !== attachmentId),
    }))
  }

  const handleChannelSettingFieldChange = <K extends keyof ChannelSettingFormState>(
    field: K,
    value: ChannelSettingFormState[K]
  ) => {
    setChannelSettingForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const applyStarterIdea = (starterIndex: number) => {
    const starter = activeProduct.starterIdeas[starterIndex]
    if (!starter) return

    setIdeaForm({
      title: starter.title,
      raw_note: starter.rawNote,
      angle_type: starter.angleType,
      message_pillar: starter.messagePillar,
      channels: starter.channels,
      content_intent: starter.contentIntent,
      evidence_source: starter.evidenceSource,
      format_style: starter.formatStyle,
      source_link: '',
      attachments: [],
    })
    focusWorkspaceTab('capture')
    setSuccessMessage('추천 아이디어 템플릿을 불러왔습니다.')
    setError(null)
  }

  const createDraftFromStarterIdea = async (starterIndex: number) => {
    const starter = activeProduct.starterIdeas[starterIndex]
    if (!starter) return

    setStarterDraftingIndex(starterIndex)
    setError(null)
    setSuccessMessage(null)

    try {
      const idea = await createMarketingIdea({
        product_key: activeProductKey,
        title: starter.title,
        raw_note: starter.rawNote,
        angle_type: starter.angleType,
        message_pillar: starter.messagePillar,
        channels: starter.channels,
        content_intent: starter.contentIntent,
        evidence_source: starter.evidenceSource,
        format_style: starter.formatStyle,
      })
      const draft = await generateMarketingDraft(idea.id, {
        product_key: activeProductKey,
        channel: starter.channels[0] ?? 'x',
      })

      await loadWorkspace()
      setSelectedIdeaId(idea.id)
      setSelectedDraftId(draft.id)
      focusWorkspaceTab('review')
      setSuccessMessage('추천 원재료로 X 초안을 바로 생성했습니다.')
    } catch (starterError) {
      if (isAuthError(starterError)) {
        handleAuthFailure('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      setError(getErrorMessage(starterError, '추천 원재료로 초안을 생성하지 못했습니다.'))
    } finally {
      setStarterDraftingIndex(null)
    }
  }

  const toggleIdeaChannel = (channel: MarketingChannel) => {
    setIdeaForm((current) => {
      const exists = current.channels.includes(channel)
      return {
        ...current,
        channels: exists ? current.channels.filter((item) => item !== channel) : [...current.channels, channel],
      }
    })
  }

  const submitIdea = async () => {
    const payload: CreateMarketingIdeaPayload = {
      product_key: activeProductKey,
      title: ideaForm.title,
      raw_note: ideaForm.raw_note,
      angle_type: ideaForm.angle_type,
      message_pillar: ideaForm.message_pillar,
      channels: ideaForm.channels,
      content_intent: ideaForm.content_intent,
      evidence_source: ideaForm.evidence_source,
      format_style: ideaForm.format_style,
      source_link: ideaForm.source_link.trim() || undefined,
      attachments: ideaForm.attachments.map((attachment) => ({
        ...attachment,
        note: attachment.note?.trim() || undefined,
      })),
    }

    setSavingIdea(true)
    setError(null)
    setSuccessMessage(null)
    try {
      const idea = await createMarketingIdea(payload)
      setIdeaForm(defaultIdeaForm(activeProductKey))
      await loadWorkspace()
      setSelectedIdeaId(idea.id)
      setSuccessMessage('아이디어를 저장했습니다.')
    } catch (submitError) {
      if (isAuthError(submitError)) {
        handleAuthFailure('세션이 만료되었습니다. 다시 로그인해주세요.')
        return
      }
      setError(getErrorMessage(submitError, '아이디어를 저장하지 못했습니다.'))
    } finally {
      setSavingIdea(false)
    }
  }

  const handleGenerateDraft = async (ideaId: string, channel: MarketingChannel) => {
    const idea = workspace?.ideas.find((item) => item.id === ideaId) ?? null
    const prepStatus = idea
      ? getIdeaDraftPrepStatus({
          ...idea,
          source_link: idea.source_link ?? undefined,
        })
      : null
    if (prepStatus && prepStatus.blocking.length > 0) {
      setSelectedIdeaId(ideaId)
      focusWorkspaceTab('capture')
      setError(`초안 생성 전에 이 아이디어를 조금만 더 적어주세요: ${prepStatus.blocking.join(' / ')}`)
      setSuccessMessage(null)
      return
    }

    setGeneratingDraftId(`${ideaId}:${channel}`)
    setError(null)
    setSuccessMessage(null)
    try {
      const draft = await generateMarketingDraft(ideaId, {
        product_key: activeProductKey,
        channel,
      })
      await loadWorkspace()
      setSelectedIdeaId(ideaId)
      setSelectedDraftId(draft.id)
      focusWorkspaceTab('review')
      setSuccessMessage(`${marketingChannelLabels[channel]} 초안을 생성했습니다.`)
    } catch (draftError) {
      if (isAuthError(draftError)) {
        handleAuthFailure('세션이 만료되었습니다. 다시 로그인해주세요.')
        return
      }
      setError(getErrorMessage(draftError, '초안을 생성하지 못했습니다.'))
    } finally {
      setGeneratingDraftId(null)
    }
  }

  const saveDraft = async (statusOverride?: MarketingDraftStatus) => {
    if (!selectedDraft) return

    setSavingDraft(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await updateMarketingDraft(selectedDraft.id, {
        product_key: activeProductKey,
        title: draftEditor.title,
        content: draftEditor.content,
        tone: draftEditor.tone,
        risk_flags: draftEditor.risk_flags_text
          .split('\n')
          .map((item) => item.trim())
          .filter(Boolean),
        status: statusOverride ?? draftEditor.status,
      })
      await loadWorkspace()
      if (statusOverride === 'approved') {
        setSuccessMessage('초안을 승인했습니다.')
      } else if (statusOverride === 'on_hold') {
        setSuccessMessage('초안을 보류했습니다.')
      } else if (statusOverride === 'discarded') {
        setSuccessMessage('초안을 폐기했습니다.')
      } else {
        setSuccessMessage('초안을 저장했습니다.')
      }
    } catch (draftError) {
      setError(getErrorMessage(draftError, '초안을 저장하지 못했습니다.'))
    } finally {
      setSavingDraft(false)
    }
  }

  const savePublicationRecord = async () => {
    if (!selectedDraft) return

    setSavingPublication(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await saveMarketingPublication(selectedDraft.id, {
        product_key: activeProductKey,
        external_url: publicationUrl,
      })
      await loadWorkspace()
      setSuccessMessage('발행 URL을 저장했습니다.')
    } catch (publicationError) {
      if (isAuthError(publicationError)) {
        handleAuthFailure('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      setError(getErrorMessage(publicationError, '발행 URL을 저장하지 못했습니다.'))
    } finally {
      setSavingPublication(false)
    }
  }

  const saveNaverBlogSettings = async () => {
    setSavingChannelSettings(true)
    setError(null)
    setSuccessMessage(null)
    try {
      await saveMarketingChannelSetting('naver_blog', {
        product_key: activeProductKey,
        channel: 'naver_blog',
        publication_name: channelSettingForm.publication_name,
        publication_url: channelSettingForm.publication_url.trim() || undefined,
        default_category: channelSettingForm.default_category,
        primary_audience: channelSettingForm.primary_audience,
        tone_guide: channelSettingForm.tone_guide,
        default_cta: channelSettingForm.default_cta,
        proof_points: channelSettingForm.proof_points,
        reference_notes: channelSettingForm.reference_notes,
      })
      await loadWorkspace()
      setSuccessMessage('네이버 블로그 설정을 저장했습니다.')
    } catch (settingsError) {
      if (isAuthError(settingsError)) {
        handleAuthFailure('세션이 만료되었습니다. 다시 로그인해 주세요.')
        return
      }
      setError(getErrorMessage(settingsError, '네이버 블로그 설정을 저장하지 못했습니다.'))
    } finally {
      setSavingChannelSettings(false)
    }
  }

  const copyBlogPublishText = async () => {
    if (!selectedBlogPublishText) return

    try {
      await navigator.clipboard.writeText(selectedBlogPublishText)
      setSuccessMessage('네이버 붙여넣기용 본문을 복사했습니다.')
      setError(null)
    } catch {
      setError('복사에 실패했습니다. 발행용 미리보기에서 직접 복사해 주세요.')
    }
  }

  if (loading && !workspace) {
    return (
      <div className="min-h-screen rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-6 text-sm text-neutral-300">
        마케팅 OS를 불러오는 중입니다...
      </div>
    )
  }

  const summary = workspace?.summary

  return (
    <div className="min-h-screen space-y-6 text-neutral-100">
      <AccentHeroCard
        compact
        eyebrow="마케팅 OS"
        title="Kifu 안에서 시작하고, 다른 제품까지 확장할 수 있게 설계합니다."
        description={
          <>
            지금은 <span className="font-semibold text-amber-200">product_key=kifu</span>로 고정되어 있지만, 데이터 모델과 API는
            나중에 다른 제품도 붙일 수 있게 분리되어 있습니다.
          </>
        }
        aside={
          <div className="rounded-2xl border border-amber-300/20 bg-black/20 px-4 py-3 text-sm text-neutral-200">
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">현재 워크스페이스</p>
            <p className="mt-2 text-lg font-semibold text-amber-100">{activeProduct.label}</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">백테스트와 판단 검증도 Kifu 안의 기능과 메시지로 연결해 운영합니다.</p>
          </div>
        }
      >
        {visibleMarketingProductOptions.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {visibleMarketingProductOptions.map((product) => {
              const active = product.key === activeProductKey

              return (
                <button
                  key={product.key}
                  type="button"
                  onClick={() => setActiveProductKey(product.key)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? 'border-amber-300/40 bg-amber-500/15 text-amber-100'
                      : 'border-white/[0.08] bg-black/20 text-neutral-300 hover:border-white/[0.16]'
                  }`}
                >
                  {product.label}
                </button>
              )
            })}
          </div>
        )}
      </AccentHeroCard>

      {activeProduct.starterIdeas.length > 0 && (
        <section className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">추천 원재료</p>
          <h2 className="mt-2 text-lg font-semibold text-white">Kifu 안에서 바로 써볼 수 있는 백테스트/검증 메시지</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {activeProduct.starterIdeas.map((starter, index) => (
              <div
                key={starter.title}
                className="rounded-2xl border border-white/[0.08] bg-black/20 p-4 text-left transition hover:border-amber-300/40 hover:bg-amber-500/10"
              >
                <p className="text-sm font-semibold text-white">{starter.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-neutral-400">{starter.rawNote}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => applyStarterIdea(index)}
                    className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-white/[0.16]"
                  >
                    인박스 채우기
                  </button>
                  <button
                    type="button"
                    onClick={() => createDraftFromStarterIdea(index)}
                    disabled={starterDraftingIndex === index}
                    className="rounded-full border border-amber-300/30 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-100 transition hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {starterDraftingIndex === index ? '초안 생성 중...' : '바로 X 초안'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
          {successMessage}
        </div>
      )}

      <section className="grid gap-3 md:grid-cols-4">
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">아이디어</p>
          <p className="text-2xl font-semibold text-white">{summary?.idea_count ?? 0}</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.05] px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">초안</p>
          <p className="text-2xl font-semibold text-white">{summary?.draft_count ?? 0}</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-amber-100/70">승인 대기</p>
          <p className="text-2xl font-semibold text-amber-50">{summary?.approval_pending_count ?? 0}</p>
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/70">승인 완료</p>
          <p className="text-2xl font-semibold text-emerald-50">{summary?.approved_count ?? 0}</p>
        </div>
      </section>

      <div ref={workspaceFlowRef} className="space-y-4">
        <div className="sticky top-3 z-10 space-y-3 rounded-2xl border border-white/[0.08] bg-black/45 p-3 backdrop-blur">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => focusWorkspaceTab('capture')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeWorkspaceTab === 'capture'
                  ? 'bg-amber-300 text-black'
                  : 'bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]'
              }`}
            >
              아이디어 작성
            </button>
            <button
              type="button"
              onClick={() => focusWorkspaceTab('review')}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeWorkspaceTab === 'review'
                  ? 'bg-amber-300 text-black'
                  : 'bg-white/[0.04] text-neutral-300 hover:bg-white/[0.08]'
              }`}
            >
              초안 검토
            </button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-400">
            <p>초안을 생성하면 자동으로 검토 탭으로 이동합니다.</p>
            <p>
              아이디어 {summary?.idea_count ?? 0}개 · 초안 {summary?.draft_count ?? 0}개
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {activeWorkspaceTab === 'capture' && (
            <section className="space-y-6">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">아이디어 인박스</p>
                <h2 className="mt-2 text-xl font-semibold text-white">실제 콘텐츠 씨앗 하나를 바로 저장하세요.</h2>
              </div>
              <span className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 text-[11px] text-neutral-300">
                승인형 운영 우선
              </span>
            </div>

            <div className="grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-neutral-300">제목</span>
                <input
                  value={ideaForm.title}
                  onChange={(event) => handleIdeaFieldChange('title', event.target.value)}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  placeholder="왜 거래 복기에 기억 장치가 필요한가"
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-neutral-300">원본 메모</span>
                <textarea
                  value={ideaForm.raw_note}
                  onChange={(event) => handleIdeaFieldChange('raw_note', event.target.value)}
                  className="min-h-32 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  placeholder="무슨 일이 있었는지, 왜 중요했는지, 어떤 화면이나 근거를 보여줄 수 있는지 적어주세요."
                />
              </label>

              <div className="grid gap-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-neutral-300">이미지 첨부</p>
                    <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                      차트나 화면 캡처를 붙여넣거나 업로드하면 초안 생성 때 함께 참고합니다.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => attachmentInputRef.current?.click()}
                    className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-amber-300/40 hover:text-amber-100"
                  >
                    이미지 추가
                  </button>
                </div>

                <input
                  ref={attachmentInputRef}
                  type="file"
                  accept={allowedMarketingImageTypes.join(',')}
                  multiple
                  onChange={handleAttachmentInputChange}
                  className="hidden"
                />

                <div
                  onPaste={handleIdeaAttachmentPaste}
                  className="rounded-2xl border border-dashed border-white/[0.14] bg-black/20 px-4 py-4 text-sm text-neutral-400"
                >
                  이미지를 붙여넣거나 업로드하세요. 최대 3장, PNG/JPG/WEBP, 각 1.8MB 이하
                </div>

                {ideaForm.attachments.length > 0 && (
                  <div className="grid gap-3 md:grid-cols-2">
                    {ideaForm.attachments.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="grid gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-3"
                      >
                        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
                          <img
                            src={attachment.data_url}
                            alt={attachment.name}
                            className="h-40 w-full object-cover"
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="truncate text-sm text-white">{attachment.name}</p>
                          <button
                            type="button"
                            onClick={() => removeIdeaAttachment(attachment.id)}
                            className="rounded-full border border-rose-300/20 bg-rose-500/10 px-2.5 py-1 text-[11px] text-rose-100 transition hover:bg-rose-500/15"
                          >
                            제거
                          </button>
                        </div>
                        <textarea
                          value={attachment.note ?? ''}
                          onChange={(event) => updateIdeaAttachmentNote(attachment.id, event.target.value)}
                          className="min-h-24 rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-2 text-sm leading-relaxed text-white outline-none transition focus:border-amber-300/50"
                          placeholder="이 이미지에서 무엇을 보여주고 싶은지 한두 줄로 적어주세요"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">콘텐츠 각도</span>
                  <select
                    value={ideaForm.angle_type}
                    onChange={(event) => handleIdeaFieldChange('angle_type', event.target.value as MarketingAngleType)}
                    className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  >
                    {angleOptions.map(([value, label]) => (
                      <option key={value} value={value} className="bg-neutral-950">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">참고 링크</span>
                  <input
                    value={ideaForm.source_link}
                    onChange={(event) => handleIdeaFieldChange('source_link', event.target.value)}
                    className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                    placeholder="https://..."
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">콘텐츠 성격</span>
                  <select
                    value={ideaForm.content_intent}
                    onChange={(event) =>
                      handleIdeaFieldChange('content_intent', event.target.value as MarketingContentIntent)
                    }
                    className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  >
                    {contentIntentOptions.map(([value, label]) => (
                      <option key={value} value={value} className="bg-neutral-950">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">근거 출처</span>
                  <select
                    value={ideaForm.evidence_source}
                    onChange={(event) =>
                      handleIdeaFieldChange('evidence_source', event.target.value as MarketingEvidenceSource)
                    }
                    className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  >
                    {evidenceSourceOptions.map(([value, label]) => (
                      <option key={value} value={value} className="bg-neutral-950">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">표현 형식</span>
                  <select
                    value={ideaForm.format_style}
                    onChange={(event) =>
                      handleIdeaFieldChange('format_style', event.target.value as MarketingFormatStyle)
                    }
                    className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  >
                    {formatStyleOptions.map(([value, label]) => (
                      <option key={value} value={value} className="bg-neutral-950">
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2">
                <span className="text-sm text-neutral-300">핵심 메시지</span>
                <select
                  value={ideaForm.message_pillar}
                  onChange={(event) => handleIdeaFieldChange('message_pillar', event.target.value)}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                >
                  {availableMessagePillars.map((pillar) => (
                    <option key={pillar} value={pillar} className="bg-neutral-950">
                      {pillar}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-2">
                <span className="text-sm text-neutral-300">채널</span>
                <div className="flex flex-wrap gap-2">
                  {channelOptions.map(([channel, label]) => {
                    const active = ideaForm.channels.includes(channel)
                    return (
                      <button
                        key={channel}
                        type="button"
                        onClick={() => toggleIdeaChannel(channel)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition ${
                          active
                            ? 'border-amber-300/40 bg-amber-500/15 text-amber-100'
                            : 'border-white/[0.08] bg-black/20 text-neutral-300 hover:border-white/[0.16]'
                        }`}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {(ideaFormPrepStatus.blocking.length > 0 || ideaFormPrepStatus.warnings.length > 0) && (
                <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 px-4 py-3 text-xs leading-relaxed text-amber-50">
                  <p className="font-semibold text-amber-100">초안 품질 메모</p>
                  {ideaFormPrepStatus.blocking.map((message) => (
                    <p key={`blocking:${message}`} className="mt-2">
                      보강 필요: {message}
                    </p>
                  ))}
                  {ideaFormPrepStatus.warnings.map((message) => (
                    <p key={`warning:${message}`} className="mt-2 text-amber-100/80">
                      참고: {message}
                    </p>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <p className="text-xs leading-relaxed text-neutral-500">
                  이미 만든 기능, 실제 사용자 문제, 실제 화면 근거에 가까울수록 초안이 덜 평범하고 승인도 빨라집니다.
                </p>
                <button
                  type="button"
                  onClick={submitIdea}
                  disabled={savingIdea}
                  className="rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingIdea ? '저장 중...' : '인박스에 저장'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">네이버 블로그 설정</p>
                <h2 className="mt-2 text-xl font-semibold text-white">블로그 기본값을 먼저 정리하세요</h2>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  독자, 카테고리, 말투, 마무리 문구를 저장해두면 네이버 블로그 초안 생성 시 그 설정을 우선 반영합니다.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBlogSettingsExpanded((current) => !current)}
                className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-lime-300/30 hover:text-lime-100"
              >
                {blogSettingsExpanded ? '접기' : naverBlogSetting ? '설정 보기' : '설정 열기'}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1">
                {naverBlogSetting ? '설정 저장됨' : '아직 미설정'}
              </span>
              {summarizeChannelSetting(naverBlogSetting) && (
                <span className="rounded-full border border-lime-300/20 bg-lime-500/10 px-3 py-1 text-lime-100">
                  {summarizeChannelSetting(naverBlogSetting)}
                </span>
              )}
            </div>

            {blogSettingsExpanded && (
              <div className="mt-5 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm text-neutral-300">블로그 이름</span>
                    <input
                      value={channelSettingForm.publication_name}
                      onChange={(event) => handleChannelSettingFieldChange('publication_name', event.target.value)}
                      className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-lime-300/40"
                      placeholder="예: Kifu 트레이딩 복기 노트"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm text-neutral-300">블로그 주소</span>
                    <input
                      value={channelSettingForm.publication_url}
                      onChange={(event) => handleChannelSettingFieldChange('publication_url', event.target.value)}
                      className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-lime-300/40"
                      placeholder="https://blog.naver.com/..."
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm text-neutral-300">기본 카테고리</span>
                    <input
                      value={channelSettingForm.default_category}
                      onChange={(event) => handleChannelSettingFieldChange('default_category', event.target.value)}
                      className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-lime-300/40"
                      placeholder="예: 트레이딩 복기 / 빌드 로그"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm text-neutral-300">주요 독자</span>
                    <input
                      value={channelSettingForm.primary_audience}
                      onChange={(event) => handleChannelSettingFieldChange('primary_audience', event.target.value)}
                      className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-lime-300/40"
                      placeholder="예: 거래 복기를 막 시작한 개인 트레이더"
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">말투 가이드</span>
                  <textarea
                    value={channelSettingForm.tone_guide}
                    onChange={(event) => handleChannelSettingFieldChange('tone_guide', event.target.value)}
                    className="min-h-24 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-lime-300/40"
                    placeholder="예: 차분하고 설명형으로, 단정적인 표현보다 관찰형 문장 위주"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="grid gap-2">
                    <span className="text-sm text-neutral-300">마무리 문구 / CTA</span>
                    <textarea
                      value={channelSettingForm.default_cta}
                      onChange={(event) => handleChannelSettingFieldChange('default_cta', event.target.value)}
                      className="min-h-24 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-lime-300/40"
                      placeholder="예: 기록으로 남기고, 비슷한 상황에서 다시 돌아보는 흐름으로 마무리"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm text-neutral-300">화면 포인트 / 근거</span>
                    <textarea
                      value={channelSettingForm.proof_points}
                      onChange={(event) => handleChannelSettingFieldChange('proof_points', event.target.value)}
                      className="min-h-24 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-lime-300/40"
                      placeholder={`예:\n- 거래 기록과 메모가 함께 보이는 화면\n- 판단 이유를 다시 확인하는 복기 흐름`}
                    />
                  </label>
                </div>

                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">참고 메모 / 금지 표현</span>
                  <textarea
                    value={channelSettingForm.reference_notes}
                    onChange={(event) => handleChannelSettingFieldChange('reference_notes', event.target.value)}
                    className="min-h-24 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-lime-300/40"
                    placeholder="예: 수익 보장처럼 보이는 표현 금지, 전략 우월성 강조 금지"
                  />
                </label>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs leading-relaxed text-neutral-500">
                    이 설정은 네이버 블로그 초안의 제목 후보, 독자 톤, 이미지 포인트, 마무리 문장에 반영됩니다.
                  </p>
                  <button
                    type="button"
                    onClick={saveNaverBlogSettings}
                    disabled={savingChannelSettings}
                    className="rounded-2xl border border-lime-300/30 bg-lime-500/10 px-4 py-3 text-sm font-semibold text-lime-100 transition hover:bg-lime-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingChannelSettings ? '저장 중...' : '블로그 설정 저장'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-5">
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">아이디어 목록</p>
              <h2 className="mt-2 text-xl font-semibold text-white">최근 저장한 콘텐츠 원재료</h2>
            </div>
            <div className="grid gap-3">
              {(workspace?.ideas ?? []).map((idea) => (
                <div
                  key={idea.id}
                  className={`rounded-2xl border px-4 py-4 transition ${
                    selectedIdeaId === idea.id
                      ? 'border-amber-300/40 bg-amber-500/10'
                      : 'border-white/[0.08] bg-black/20 hover:border-white/[0.16]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIdeaId(idea.id)
                    }}
                    className="w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{idea.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-neutral-400">{idea.raw_note}</p>
                      </div>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-300">
                        {idea.status === 'inbox' ? '신규' : '초안 완료'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                      <span>{marketingAngleLabels[idea.angle_type]}</span>
                      <span>·</span>
                      <span>{marketingContentIntentLabels[idea.content_intent]}</span>
                      <span>·</span>
                      <span>{marketingEvidenceSourceLabels[idea.evidence_source]}</span>
                      <span>·</span>
                      <span>{marketingFormatStyleLabels[idea.format_style]}</span>
                      <span>•</span>
                      <span>{formatDateTime(idea.updated_at)}</span>
                      {idea.channels.map((channel) => (
                        <span key={channel} className="rounded-full border border-white/[0.08] px-2 py-0.5 text-neutral-300">
                          {marketingChannelLabels[channel]}
                        </span>
                      ))}
                    </div>
                  </button>

                  {selectedIdeaId === idea.id && (
                    <div className="mt-4 grid gap-4 rounded-2xl border border-amber-300/20 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-white">선택한 아이디어 상세</p>
                          <p className="mt-1 text-xs text-neutral-400">
                            어떤 메모를 저장했고 어떤 옵션으로 초안을 만들지 여기서 바로 다시 확인할 수 있습니다.
                          </p>
                        </div>
                        <span className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
                          현재 선택됨
                        </span>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(260px,0.9fr)]">
                        <div className="grid gap-3">
                          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">원본 메모</p>
                            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-200">{idea.raw_note}</p>
                          </div>

                          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">핵심 메시지</p>
                            <p className="mt-3 text-sm leading-relaxed text-neutral-200">{idea.message_pillar}</p>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">선택 옵션</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-neutral-200">
                                {marketingAngleLabels[idea.angle_type]}
                              </span>
                              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-neutral-200">
                                {marketingContentIntentLabels[idea.content_intent]}
                              </span>
                              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-neutral-200">
                                {marketingEvidenceSourceLabels[idea.evidence_source]}
                              </span>
                              <span className="rounded-full border border-white/[0.08] px-2.5 py-1 text-xs text-neutral-200">
                                {marketingFormatStyleLabels[idea.format_style]}
                              </span>
                              {idea.channels.map((channel) => (
                                <span
                                  key={`${idea.id}:${channel}:detail`}
                                  className="rounded-full border border-amber-300/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100"
                                >
                                  채널 · {marketingChannelLabels[channel]}
                                </span>
                              ))}
                            </div>
                          </div>

                          {idea.source_link && (
                            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">참고 링크</p>
                              <a
                                href={idea.source_link}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-3 block break-all text-sm leading-relaxed text-sky-200 underline decoration-sky-300/30 underline-offset-4 transition hover:text-sky-100"
                              >
                                {idea.source_link}
                              </a>
                            </div>
                          )}

                          {idea.attachments && idea.attachments.length > 0 && (
                            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                              <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">첨부 이미지</p>
                              <div className="mt-3 grid gap-3 md:grid-cols-2">
                                {idea.attachments.map((attachment) => (
                                  <div
                                    key={`${idea.id}:${attachment.id}`}
                                    className="grid gap-2 rounded-2xl border border-white/[0.08] bg-black/20 p-3"
                                  >
                                    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-black/30">
                                      <img
                                        src={attachment.data_url}
                                        alt={attachment.name}
                                        className="h-36 w-full object-cover"
                                      />
                                    </div>
                                    <p className="truncate text-sm text-white">{attachment.name}</p>
                                    {attachment.note && (
                                      <p className="text-sm leading-relaxed text-neutral-300">{attachment.note}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">상태와 시각</p>
                            <div className="mt-3 grid gap-2 text-sm text-neutral-200">
                              <p>상태: {idea.status === 'inbox' ? '신규' : '초안 완료'}</p>
                              <p>최근 수정: {formatDateTime(idea.updated_at)}</p>
                              <p>생성 시각: {formatDateTime(idea.created_at)}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {selectedIdeaPrepStatus && (
                        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
                          <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">초안 생성 체크</p>
                          <div className="mt-3 grid gap-2 text-sm leading-relaxed text-neutral-200">
                            {selectedIdeaPrepStatus.blocking.length === 0 && selectedIdeaPrepStatus.warnings.length === 0 && (
                              <p>지금 입력값 기준으로 바로 초안 생성 가능한 상태입니다.</p>
                            )}
                            {selectedIdeaPrepStatus.blocking.map((message) => (
                              <p key={`selected:blocking:${message}`} className="text-amber-100">
                                보강 필요: {message}
                              </p>
                            ))}
                            {selectedIdeaPrepStatus.warnings.map((message) => (
                              <p key={`selected:warning:${message}`} className="text-neutral-300">
                                참고: {message}
                              </p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2">
                    {idea.channels.map((channel) => {
                      const actionKey = `${idea.id}:${channel}`
                      return (
                        <button
                          key={channel}
                          type="button"
                          onClick={() => handleGenerateDraft(idea.id, channel)}
                          disabled={generatingDraftId === actionKey}
                          className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-neutral-200 transition hover:border-amber-300/40 hover:text-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {generatingDraftId === actionKey ? '생성 중...' : `${marketingChannelLabels[channel]} 초안 생성`}
                        </button>
                      )
                    })}
                  </div>

                  {ideaPrepById.get(idea.id)?.blocking.length ? (
                    <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-amber-50">
                      초안 생성 전 보강 필요: {ideaPrepById.get(idea.id)?.blocking.join(' / ')}
                    </div>
                  ) : null}

                  {!ideaPrepById.get(idea.id)?.blocking.length && ideaPrepById.get(idea.id)?.warnings.length ? (
                    <div className="mt-3 rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs leading-relaxed text-neutral-300">
                      참고: {ideaPrepById.get(idea.id)?.warnings.join(' / ')}
                    </div>
                  ) : null}
                </div>
              ))}

              {workspace?.ideas.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/[0.1] bg-black/20 px-4 py-8 text-center text-sm text-neutral-500">
                  아직 아이디어가 없습니다. 첫 아이디어를 저장해 콘텐츠 원재료를 쌓아보세요.
                </div>
              )}
            </div>
          </div>
            </section>
          )}

          {activeWorkspaceTab === 'review' && (
            <section className="space-y-6">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-5">
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">승인 큐</p>
              <h2 className="mt-2 text-xl font-semibold text-white">자동 생성된 초안을 검토하세요</h2>
            </div>

            <div className="grid gap-3">
              {(workspace?.drafts ?? []).map((draft) => {
                const publication = publicationByDraftId.get(draft.id)

                return (
                  <button
                    key={draft.id}
                    type="button"
                    onClick={() => {
                      setSelectedIdeaId(draft.idea_id)
                      setSelectedDraftId(draft.id)
                      focusWorkspaceTab('review')
                    }}
                    className={`rounded-2xl border px-4 py-4 text-left transition ${
                      selectedDraftId === draft.id
                        ? 'border-amber-300/40 bg-amber-500/10'
                        : 'border-white/[0.08] bg-black/20 hover:border-white/[0.16]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{draft.title}</p>
                        <p className="mt-1 text-xs text-neutral-500">
                          {marketingChannelLabels[draft.channel]} • v{draft.version} • {displayTone(draft.tone)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusToneClass[draft.status]}`}>
                          {marketingDraftStatusLabels[draft.status]}
                        </span>
                        {publication?.publish_status === 'published' && (
                          <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
                            발행 완료
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-400">{draft.content}</p>
                  </button>
                )
              })}

              {workspace?.drafts.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/[0.1] bg-black/20 px-4 py-8 text-center text-sm text-neutral-500">
                  생성된 초안이 여기로 들어옵니다.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">초안 편집기</p>
                <h2 className="mt-2 text-xl font-semibold text-white">
                  {selectedDraft ? marketingChannelLabels[selectedDraft.channel] : '초안을 선택하세요'}
                </h2>
              </div>
              {selectedIdea && (
                <span className="rounded-full border border-white/[0.08] bg-black/20 px-3 py-1 text-[11px] text-neutral-300">
                  원본 아이디어: {selectedIdea.title}
                </span>
              )}
            </div>

            {selectedDraft ? (
              <div className="grid gap-4">
                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">제목</span>
                  <input
                    value={draftEditor.title}
                    onChange={(event) => setDraftEditor((current) => ({ ...current, title: event.target.value }))}
                    className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                  />
                </label>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm text-neutral-300">톤</span>
                    <input
                      value={draftEditor.tone}
                      onChange={(event) => setDraftEditor((current) => ({ ...current, tone: event.target.value }))}
                      className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                      placeholder="예: 교육형, 기능 소개형"
                    />
                  </label>

                  <label className="grid gap-2">
                    <span className="text-sm text-neutral-300">상태</span>
                    <select
                      value={draftEditor.status}
                      onChange={(event) =>
                        setDraftEditor((current) => ({
                          ...current,
                          status: event.target.value as MarketingDraftStatus,
                        }))
                      }
                      className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                    >
                      {draftStatusOptions.map(([value, label]) => (
                        <option key={value} value={value} className="bg-neutral-950">
                          {label}
                        </option>
                      ))}
                        </select>
                      </label>
                    </div>

                    {selectedDraft.channel === 'naver_blog' && selectedBlogPreview && (
                      <div className="grid gap-4 rounded-2xl border border-lime-300/15 bg-lime-500/5 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">블로그 구조 미리보기</p>
                            <p className="mt-1 text-xs text-neutral-400">구조 초안은 편집용이고, 아래 발행용 미리보기는 네이버에 붙여넣기 좋게 정리한 버전입니다.</p>
                          </div>
                          <span className="rounded-full border border-lime-300/20 bg-lime-500/10 px-2.5 py-1 text-[11px] text-lime-100">
                            네이버 블로그 전용
                          </span>
                        </div>

                        {selectedBlogPreview.titleCandidates.length > 0 && (
                          <div className="grid gap-2">
                            <p className="text-xs uppercase tracking-[0.22em] text-neutral-500">제목 후보</p>
                            <div className="grid gap-2">
                              {selectedBlogPreview.titleCandidates.map((candidate, index) => (
                                <div
                                  key={candidate}
                                  className="flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-black/20 px-3 py-3 text-sm text-neutral-200"
                                >
                                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-lime-300/20 bg-lime-500/10 text-[11px] font-semibold text-lime-100">
                                    {index + 1}
                                  </span>
                                  <span className="leading-relaxed">{candidate}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="grid gap-3 md:grid-cols-2">
                          {selectedBlogPreview.sections.map((section) => (
                            <div key={section.heading} className="rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                              <p className="text-sm font-semibold text-white">{section.heading}</p>
                              <p className="mt-2 text-sm leading-relaxed text-neutral-300 whitespace-pre-line">{section.body}</p>
                            </div>
                          ))}
                        </div>

                        <div className="grid gap-3 rounded-2xl border border-white/[0.08] bg-black/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-white">네이버 붙여넣기용 미리보기</p>
                              <p className="mt-1 text-xs text-neutral-400">`#`, `##` 없이 실제 발행할 때 읽히는 형태로 정리한 본문입니다.</p>
                            </div>
                            <button
                              type="button"
                              onClick={copyBlogPublishText}
                              className="rounded-full border border-lime-300/30 bg-lime-500/10 px-3 py-1.5 text-xs font-medium text-lime-100 transition hover:bg-lime-500/15"
                            >
                              발행용 복사
                            </button>
                          </div>
                          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-sm leading-relaxed text-neutral-200 whitespace-pre-line">
                            {selectedBlogPublishText}
                          </div>
                        </div>
                      </div>
                    )}

                    <label className="grid gap-2">
                      <span className="text-sm text-neutral-300">
                        {selectedDraft.channel === 'naver_blog' ? '원본 구조 초안' : '초안 본문'}
                      </span>
                  <textarea
                    value={draftEditor.content}
                    onChange={(event) => setDraftEditor((current) => ({ ...current, content: event.target.value }))}
                    className="min-h-56 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-amber-300/50"
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">리스크 플래그</span>
                  <textarea
                    value={draftEditor.risk_flags_text}
                    onChange={(event) =>
                      setDraftEditor((current) => ({
                        ...current,
                        risk_flags_text: event.target.value,
                      }))
                    }
                    className="min-h-28 rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm leading-relaxed text-white outline-none transition focus:border-amber-300/50"
                    placeholder="한 줄에 하나씩 적어주세요"
                  />
                </label>

                {selectedDraft.channel === 'x' && (
                  <div className="grid gap-3 rounded-2xl border border-cyan-300/15 bg-cyan-500/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-white">발행 기록</p>
                        <p className="mt-1 text-xs text-neutral-400">
                          X에 직접 올린 뒤 URL을 남기면 이 초안을 발행 완료로 추적할 수 있습니다.
                        </p>
                      </div>
                      {selectedPublication?.publish_status === 'published' && (
                        <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
                          발행 완료
                        </span>
                      )}
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm text-neutral-300">발행 URL</span>
                      <input
                        value={publicationUrl}
                        onChange={(event) => setPublicationUrl(event.target.value)}
                        className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300/50"
                        placeholder="https://x.com/your_handle/status/..."
                      />
                    </label>

                    {selectedPublication?.external_url && (
                      <a
                        href={selectedPublication.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-cyan-200 underline underline-offset-4"
                      >
                        저장된 발행 글 열기
                      </a>
                    )}

                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={savePublicationRecord}
                        disabled={savingPublication || draftEditor.status !== 'approved'}
                        className="rounded-2xl border border-cyan-300/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingPublication ? '저장 중...' : '발행 완료로 기록'}
                      </button>
                      {draftEditor.status !== 'approved' && (
                        <p className="text-xs text-neutral-500">승인된 초안만 발행 완료로 기록할 수 있습니다.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => saveDraft()}
                    disabled={savingDraft}
                    className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingDraft ? '저장 중...' : '초안 저장'}
                  </button>
                  <button
                    type="button"
                    onClick={() => saveDraft('approved')}
                    disabled={savingDraft}
                    className="rounded-2xl border border-emerald-300/30 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    승인
                  </button>
                  <button
                    type="button"
                    onClick={() => saveDraft('on_hold')}
                    disabled={savingDraft}
                    className="rounded-2xl border border-sky-300/30 bg-sky-500/10 px-4 py-3 text-sm font-semibold text-sky-100 transition hover:bg-sky-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    보류
                  </button>
                  <button
                    type="button"
                    onClick={() => saveDraft('discarded')}
                    disabled={savingDraft}
                    className="rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    폐기
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/[0.1] bg-black/20 px-4 py-10 text-center text-sm text-neutral-500">
                승인 큐에서 초안을 선택하면 여기서 편집하고 승인할 수 있습니다.
              </div>
            )}
          </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
