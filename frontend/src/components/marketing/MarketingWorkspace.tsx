'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  MARKETING_PRODUCT_KEY,
  createMarketingIdea,
  fetchMarketingWorkspace,
  generateMarketingDraft,
  updateMarketingDraft,
} from '../../lib/marketing'
import type {
  CreateMarketingIdeaPayload,
  MarketingAngleType,
  MarketingChannel,
  MarketingDraftStatus,
  MarketingWorkspaceResponse,
} from '../../types/marketing'
import {
  marketingAngleLabels,
  marketingChannelLabels,
  marketingDraftStatusLabels,
} from '../../types/marketing'

type IdeaFormState = {
  title: string
  raw_note: string
  angle_type: MarketingAngleType
  message_pillar: string
  channels: MarketingChannel[]
  source_link: string
}

type DraftEditorState = {
  title: string
  content: string
  tone: string
  risk_flags_text: string
  status: MarketingDraftStatus
}

const messagePillars = [
  'Kifu는 트레이더가 왜 진입했고 왜 청산했는지 잊지 않게 돕습니다.',
  'Kifu는 거래 기록, 메모, 복기를 한 흐름으로 묶어 반복 실수를 줄입니다.',
  'Kifu는 매수와 매도 이유를 남겨 다음 판단이 더 나아지도록 돕습니다.',
]

const angleOptions = Object.entries(marketingAngleLabels) as Array<[MarketingAngleType, string]>
const channelOptions = Object.entries(marketingChannelLabels) as Array<[MarketingChannel, string]>
const draftStatusOptions = Object.entries(marketingDraftStatusLabels) as Array<[MarketingDraftStatus, string]>

const defaultIdeaForm = (): IdeaFormState => ({
  title: '',
  raw_note: '',
  angle_type: 'feature',
  message_pillar: messagePillars[0],
  channels: ['x'],
  source_link: '',
})

const emptyDraftEditor = (): DraftEditorState => ({
  title: '',
  content: '',
  tone: '',
  risk_flags_text: '',
  status: 'approval_pending',
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

export function MarketingWorkspace() {
  const [workspace, setWorkspace] = useState<MarketingWorkspaceResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [ideaForm, setIdeaForm] = useState<IdeaFormState>(defaultIdeaForm)
  const [draftEditor, setDraftEditor] = useState<DraftEditorState>(emptyDraftEditor)
  const [selectedIdeaId, setSelectedIdeaId] = useState<string | null>(null)
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null)
  const [savingIdea, setSavingIdea] = useState(false)
  const [generatingDraftId, setGeneratingDraftId] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)

  const loadWorkspace = async () => {
    setLoading(true)
    setError(null)
    try {
      const nextWorkspace = await fetchMarketingWorkspace(MARKETING_PRODUCT_KEY)
      setWorkspace(nextWorkspace)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '마케팅 워크스페이스를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadWorkspace()
  }, [])

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

  useEffect(() => {
    if (!selectedDraft) {
      setDraftEditor(emptyDraftEditor())
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

  const handleIdeaFieldChange = <K extends keyof IdeaFormState>(field: K, value: IdeaFormState[K]) => {
    setIdeaForm((current) => ({
      ...current,
      [field]: value,
    }))
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
      product_key: MARKETING_PRODUCT_KEY,
      title: ideaForm.title,
      raw_note: ideaForm.raw_note,
      angle_type: ideaForm.angle_type,
      message_pillar: ideaForm.message_pillar,
      channels: ideaForm.channels,
      source_link: ideaForm.source_link.trim() || undefined,
    }

    setSavingIdea(true)
    setError(null)
    try {
      await createMarketingIdea(payload)
      setIdeaForm(defaultIdeaForm())
      await loadWorkspace()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : '아이디어를 저장하지 못했습니다.')
    } finally {
      setSavingIdea(false)
    }
  }

  const handleGenerateDraft = async (ideaId: string, channel: MarketingChannel) => {
    setGeneratingDraftId(`${ideaId}:${channel}`)
    setError(null)
    try {
      await generateMarketingDraft(ideaId, {
        product_key: MARKETING_PRODUCT_KEY,
        channel,
      })
      await loadWorkspace()
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : '초안을 생성하지 못했습니다.')
    } finally {
      setGeneratingDraftId(null)
    }
  }

  const saveDraft = async (statusOverride?: MarketingDraftStatus) => {
    if (!selectedDraft) return

    setSavingDraft(true)
    setError(null)
    try {
      await updateMarketingDraft(selectedDraft.id, {
        product_key: MARKETING_PRODUCT_KEY,
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
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : '초안을 저장하지 못했습니다.')
    } finally {
      setSavingDraft(false)
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
      <section className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-[radial-gradient(circle_at_top_left,_rgba(241,113,33,0.18),_transparent_32%),linear-gradient(135deg,rgba(17,24,39,0.96),rgba(10,10,10,0.92))] p-6 shadow-2xl shadow-black/30">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-[10px] uppercase tracking-[0.35em] text-amber-200/70">마케팅 OS</p>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Kifu 안에서 시작하고, 다른 제품까지 확장할 수 있게 설계합니다.</h1>
            <p className="text-sm leading-relaxed text-neutral-300">
              지금은 <span className="font-semibold text-amber-200">product_key=kifu</span>로 고정되어 있지만, 데이터 모델과 API는
              나중에 다른 제품도 붙일 수 있게 분리되어 있습니다.
            </p>
          </div>
          <div className="rounded-2xl border border-amber-300/20 bg-black/20 px-4 py-3 text-sm text-neutral-200">
            <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-400">현재 워크스페이스</p>
            <p className="mt-2 text-lg font-semibold text-amber-100">Kifu</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">아이디어</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary?.idea_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-neutral-500">초안</p>
          <p className="mt-3 text-3xl font-semibold text-white">{summary?.draft_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-amber-100/70">승인 대기</p>
          <p className="mt-3 text-3xl font-semibold text-amber-50">{summary?.approval_pending_count ?? 0}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-emerald-100/70">승인 완료</p>
          <p className="mt-3 text-3xl font-semibold text-emerald-50">{summary?.approved_count ?? 0}</p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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

              <label className="grid gap-2">
                <span className="text-sm text-neutral-300">핵심 메시지</span>
                <select
                  value={ideaForm.message_pillar}
                  onChange={(event) => handleIdeaFieldChange('message_pillar', event.target.value)}
                  className="rounded-2xl border border-white/[0.08] bg-black/20 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300/50"
                >
                  {messagePillars.map((pillar) => (
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
                  <button type="button" onClick={() => setSelectedIdeaId(idea.id)} className="w-full text-left">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-white">{idea.title}</p>
                        <p className="mt-1 text-sm text-neutral-400">{idea.raw_note}</p>
                      </div>
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-neutral-300">
                        {idea.status === 'inbox' ? '신규' : '초안 완료'}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
                      <span>{marketingAngleLabels[idea.angle_type]}</span>
                      <span>•</span>
                      <span>{formatDateTime(idea.updated_at)}</span>
                      {idea.channels.map((channel) => (
                        <span key={channel} className="rounded-full border border-white/[0.08] px-2 py-0.5 text-neutral-300">
                          {marketingChannelLabels[channel]}
                        </span>
                      ))}
                    </div>
                  </button>

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

        <section className="space-y-6">
          <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.05] p-5">
            <div className="mb-4">
              <p className="text-[11px] uppercase tracking-[0.28em] text-neutral-500">승인 큐</p>
              <h2 className="mt-2 text-xl font-semibold text-white">자동 생성된 초안을 검토하세요</h2>
            </div>

            <div className="grid gap-3">
              {(workspace?.drafts ?? []).map((draft) => (
                <button
                  key={draft.id}
                  type="button"
                  onClick={() => setSelectedDraftId(draft.id)}
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
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusToneClass[draft.status]}`}>
                      {marketingDraftStatusLabels[draft.status]}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-neutral-400">{draft.content}</p>
                </button>
              ))}

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

                <label className="grid gap-2">
                  <span className="text-sm text-neutral-300">초안 본문</span>
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
      </div>
    </div>
  )
}
