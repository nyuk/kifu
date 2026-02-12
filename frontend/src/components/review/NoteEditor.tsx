'use client'

import { useState, useEffect } from 'react'
import { useNoteStore } from '../../stores/noteStore'
import type { ReviewNote, Emotion, CreateNoteRequest } from '../../types/review'

type NoteEditorProps = {
  note?: ReviewNote | null
  bubbleId?: string
  onClose: () => void
  onSaved?: (note: ReviewNote) => void
}

const EMOTION_OPTIONS: { value: Emotion; label: string; emoji: string }[] = [
  { value: '', label: '선택 안함', emoji: '' },
  { value: 'confident', label: '자신감', emoji: '😎' },
  { value: 'calm', label: '평온함', emoji: '😌' },
  { value: 'greedy', label: '탐욕', emoji: '🤑' },
  { value: 'fearful', label: '두려움', emoji: '😨' },
  { value: 'uncertain', label: '불확실', emoji: '🤔' },
  { value: 'frustrated', label: '좌절감', emoji: '😤' },
]

export function NoteEditor({ note, bubbleId, onClose, onSaved }: NoteEditorProps) {
  const { createNote, updateNote, isLoading } = useNoteStore()

  const [title, setTitle] = useState(note?.title || '')
  const [content, setContent] = useState(note?.content || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(note?.tags || [])
  const [lessonLearned, setLessonLearned] = useState(note?.lesson_learned || '')
  const [emotion, setEmotion] = useState<Emotion>(note?.emotion || '')

  useEffect(() => {
    if (note) {
      setTitle(note.title)
      setContent(note.content)
      setTags(note.tags || [])
      setLessonLearned(note.lesson_learned || '')
      setEmotion(note.emotion || '')
    }
  }, [note])

  const handleAddTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
      setTagInput('')
    }
  }

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !content.trim()) {
      return
    }

    const data: CreateNoteRequest = {
      title: title.trim(),
      content: content.trim(),
      tags: tags.length > 0 ? tags : undefined,
      lesson_learned: lessonLearned.trim() || undefined,
      emotion: emotion || undefined,
      bubble_id: bubbleId || note?.bubble_id,
    }

    let savedNote: ReviewNote | null
    if (note) {
      savedNote = await updateNote(note.id, data)
    } else {
      savedNote = await createNote(data)
    }

    if (savedNote) {
      onSaved?.(savedNote)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-neutral-950/95 backdrop-blur-md shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-neutral-950/95 p-5">
          <h2 className="text-xl font-bold text-neutral-100">
            {note ? '노트 수정' : '새 복기 노트'}
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              제목 <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-neutral-100 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="노트 제목을 입력하세요"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              내용 <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[150px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
              placeholder="매매에 대한 분석과 복기 내용을 작성하세요"
              required
            />
          </div>

          {/* Emotion */}
          <div>
            <label className="mb-2 block text-sm font-medium text-neutral-300">
              매매 당시 감정
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEmotion(opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all ${emotion === opt.value
                      ? 'border-white/20 bg-neutral-100 text-neutral-900 shadow-sm font-semibold'
                      : 'border-transparent bg-white/5 text-neutral-400 hover:bg-white/10 hover:text-neutral-200'
                    }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Learned */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              교훈/배운 점
            </label>
            <textarea
              value={lessonLearned}
              onChange={(e) => setLessonLearned(e.target.value)}
              className="min-h-[80px] w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-neutral-100 placeholder:text-neutral-500 focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              placeholder="이 매매에서 배운 점을 기록하세요"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-300">
              태그
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-neutral-100 placeholder:text-neutral-500 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20 transition-all"
                placeholder="태그 입력 후 Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-neutral-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                추가
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 rounded bg-sky-500/10 px-2 py-1 text-sm text-sky-300"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-sky-300/60 hover:text-sky-300"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-white/5 bg-white/[0.04] p-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm font-semibold text-neutral-300 hover:bg-white/5 hover:text-white transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim() || !content.trim()}
              className="rounded-lg bg-neutral-100 px-6 py-2.5 text-sm font-bold text-neutral-950 shadow-lg shadow-white/5 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? '저장 중...' : note ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
