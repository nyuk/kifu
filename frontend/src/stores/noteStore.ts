import { create } from 'zustand'
import { api } from '../lib/api'
import type { ReviewNote, CreateNoteRequest, NotesListResponse } from '../types/review'

type NoteStore = {
  notes: ReviewNote[]
  selectedNote: ReviewNote | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }

  // Actions
  fetchNotes: (page?: number) => Promise<void>
  fetchNotesByBubble: (bubbleId: string) => Promise<void>
  createNote: (data: CreateNoteRequest) => Promise<ReviewNote | null>
  updateNote: (id: string, data: CreateNoteRequest) => Promise<ReviewNote | null>
  deleteNote: (id: string) => Promise<boolean>
  selectNote: (note: ReviewNote | null) => void
  reset: () => void
}

export const useNoteStore = create<NoteStore>((set, get) => ({
  notes: [],
  selectedNote: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  fetchNotes: async (page = 1) => {
    set({ isLoading: true, error: null })
    try {
      const { pagination } = get()
      const response = await api.get<NotesListResponse>(
        `/v1/notes?page=${page}&limit=${pagination.limit}`
      )
      set({
        notes: response.data.notes,
        pagination: {
          page: response.data.page,
          limit: response.data.limit,
          total: response.data.total,
          totalPages: response.data.total_pages,
        },
        isLoading: false,
      })
    } catch (error) {
      set({ error: '노트를 불러오는데 실패했습니다', isLoading: false })
    }
  },

  fetchNotesByBubble: async (bubbleId: string) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.get<{ notes: ReviewNote[] }>(
        `/v1/bubbles/${bubbleId}/notes`
      )
      set({ notes: response.data.notes, isLoading: false })
    } catch (error) {
      set({ error: '노트를 불러오는데 실패했습니다', isLoading: false })
    }
  },

  createNote: async (data: CreateNoteRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.post<ReviewNote>('/v1/notes', data)
      const newNote = response.data
      set((state) => ({
        notes: [newNote, ...state.notes],
        isLoading: false,
      }))
      return newNote
    } catch (error) {
      set({ error: '노트 생성에 실패했습니다', isLoading: false })
      return null
    }
  },

  updateNote: async (id: string, data: CreateNoteRequest) => {
    set({ isLoading: true, error: null })
    try {
      const response = await api.put<ReviewNote>(`/v1/notes/${id}`, data)
      const updatedNote = response.data
      set((state) => ({
        notes: state.notes.map((n) => (n.id === id ? updatedNote : n)),
        selectedNote: state.selectedNote?.id === id ? updatedNote : state.selectedNote,
        isLoading: false,
      }))
      return updatedNote
    } catch (error) {
      set({ error: '노트 수정에 실패했습니다', isLoading: false })
      return null
    }
  },

  deleteNote: async (id: string) => {
    set({ isLoading: true, error: null })
    try {
      await api.delete(`/v1/notes/${id}`)
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
        isLoading: false,
      }))
      return true
    } catch (error) {
      set({ error: '노트 삭제에 실패했습니다', isLoading: false })
      return false
    }
  },

  selectNote: (note) => set({ selectedNote: note }),

  reset: () =>
    set({
      notes: [],
      selectedNote: null,
      isLoading: false,
      error: null,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    }),
}))
