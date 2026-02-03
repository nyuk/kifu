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
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-700 rounded w-1/4"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
          <div className="h-20 bg-gray-700 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          복기 노트 {notes.length > 0 && `(${pagination.total})`}
        </h3>
        <button
          onClick={handleNewNote}
          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          새 노트
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500 rounded-lg p-3 mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {notes.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p>아직 작성된 노트가 없습니다</p>
          <p className="text-sm mt-1">매매 복기를 기록해보세요</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="bg-gray-900 rounded-lg p-4 hover:bg-gray-900/80 transition-colors"
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  {note.emotion && (
                    <span className="text-lg" title={note.emotion}>
                      {EMOTION_EMOJI[note.emotion]}
                    </span>
                  )}
                  <h4 className="font-medium text-white">{note.title}</h4>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleEdit(note)}
                    className="p-1.5 text-gray-400 hover:text-white transition-colors"
                    title="수정"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(note)}
                    className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                    title="삭제"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              <p className="text-gray-300 text-sm line-clamp-2 mb-2">{note.content}</p>

              {note.lesson_learned && (
                <div className="bg-yellow-900/20 border-l-2 border-yellow-500 pl-3 py-1 mb-2">
                  <p className="text-yellow-400 text-xs font-medium mb-0.5">배운 점</p>
                  <p className="text-gray-300 text-sm">{note.lesson_learned}</p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 text-xs">
                {note.tags?.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded">
                    #{tag}
                  </span>
                ))}
                <span className="text-gray-500 ml-auto">{formatDate(note.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!bubbleId && pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => fetchNotes(pagination.page - 1)}
            disabled={pagination.page <= 1}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            이전
          </button>
          <span className="px-3 py-1 text-gray-400">
            {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchNotes(pagination.page + 1)}
            disabled={pagination.page >= pagination.totalPages}
            className="px-3 py-1 bg-gray-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
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
