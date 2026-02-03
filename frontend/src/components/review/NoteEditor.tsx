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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
        <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">
            {note ? '노트 수정' : '새 복기 노트'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              제목 *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="노트 제목을 입력하세요"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              내용 *
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[150px]"
              placeholder="매매에 대한 분석과 복기 내용을 작성하세요"
              required
            />
          </div>

          {/* Emotion */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              매매 당시 감정
            </label>
            <div className="flex flex-wrap gap-2">
              {EMOTION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setEmotion(opt.value)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    emotion === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lesson Learned */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              교훈/배운 점
            </label>
            <textarea
              value={lessonLearned}
              onChange={(e) => setLessonLearned(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 min-h-[80px]"
              placeholder="이 매매에서 배운 점을 기록하세요"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              태그
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="태그 입력 후 Enter"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                추가
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-400"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !title.trim() || !content.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '저장 중...' : note ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
