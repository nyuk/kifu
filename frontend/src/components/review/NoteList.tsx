'use client'

import { useState, useEffect } from 'react'
import { useNoteStore } from '../../stores/noteStore'
import { NoteEditor } from './NoteEditor'
import type { ReviewNote } from '../../types/review'

const EMOTION_EMOJI: Record<string, string> = {
  greedy: '🤑',
  fearful: '😨',
  confident: '😎',
  uncertain: '🤔',
  calm: '😌',
  frustrated: '😤',
}

type NoteListProps = {
  bubbleId?: string
}

export function NoteList({ bubbleId }: NoteListProps) {
  const {
    notes,
    isLoading,
    error,
    pagination,
    fetchNotes,
    fetchNotesByBubble,
    deleteNote,
  } = useNoteStore()

  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [editingNote, setEditingNote] = useState<ReviewNote | null>(null)

  useEffect(() => {
    if (bubbleId) {
      fetchNotesByBubble(bubbleId)
    } else {
      fetchNotes()
    }
  }, [bubbleId, fetchNotes, fetchNotesByBubble])

  const handleEdit = (note: ReviewNote) => {
    setEditingNote(note)
    setIsEditorOpen(true)
  }

  const handleDelete = async (note: ReviewNote) => {
    if (confirm(`"${note.title}" 노트를 삭제하시겠습니까?`)) {
      await deleteNote(note.id)
    }
  }

  const handleNewNote = () => {
    setEditingNote(null)
    setIsEditorOpen(true)
  }

  const handleCloseEditor = () => {
    setIsEditorOpen(false)
    setEditingNote(null)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (isLoading && notes.length === 0) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.04] backdrop-blur-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/4 rounded bg-white/[0.06]"></div>
          <div className="h-20 rounded bg-white/[0.06]"></div>
          <div className="h-20 rounded bg-white/[0.06]"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-sm p-5 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-neutral-100">
          복기 노트 {notes.length > 0 && <span className="ml-1 text-sm font-normal text-zinc-400">({pagination.total})</span>}
        </h3>
        <button
          onClick={handleNewNote}
          className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:bg-white/10 hover:text-white"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 노트
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="py-12 text-center text-zinc-400">
          <svg className="mx-auto mb-3 h-10 w-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">아직 작성된 노트가 없습니다</p>
          <p className="mt-1 text-xs opacity-70">매매 복기를 기록해보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-xl border border-white/5 bg-white/[0.03] p-5 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {note.emotion && (
                    <span className="text-lg" title={note.emotion}>
                      {EMOTION_EMOJI[note.emotion]}
                    </span>
                  )}
                  <h4 className="font-medium text-neutral-100">{note.title}</h4>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(note)}
                    className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-white/10 hover:text-white"
                    title="수정"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(note)}
                    className="rounded p-1.5 text-neutral-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="mb-3 text-sm text-neutral-400 line-clamp-2">{note.content}</p>

              {note.lesson_learned && (
                <div className="mb-3 rounded border-l-2 border-amber-500 bg-amber-900/10 pl-3 py-1.5">
                  <p className="mb-0.5 text-xs font-medium text-amber-300">배운 점</p>
                  <p className="text-sm text-neutral-300">{note.lesson_learned}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {note.tags?.map((tag) => (
                  <span key={tag} className="rounded bg-sky-500/10 px-2 py-0.5 text-sky-300">
                    #{tag}
                  </span>
                ))}
                <span className="ml-auto text-neutral-600">{formatDate(note.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!bubbleId && pagination.totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            onClick={() => fetchNotes(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <span className="px-3 py-1.5 text-sm text-zinc-400">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchNotes(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-neutral-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            다음
          </button>
        </div>
      )}

      {isEditorOpen && (
        <NoteEditor
          note={editingNote}
          bubbleId={bubbleId}
          onClose={handleCloseEditor}
        />
      )}
    </div>
  )
}
