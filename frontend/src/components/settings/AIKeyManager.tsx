'use client'

import { useEffect, useState } from 'react'
import { useAuthStore } from '../../stores/auth'
import { api } from '../../lib/api'
import { isGuestSession } from '../../lib/guestSession'

type AIKeyItem = {
  provider: string
  masked?: string | null
}

const PROVIDERS = [
  { id: 'openai', name: 'OpenAI', model: 'GPT-4o' },
  { id: 'claude', name: 'Claude', model: 'Claude 3.5 Sonnet' },
  { id: 'gemini', name: 'Gemini', model: 'Gemini 1.5 Pro' },
]

export function AIKeyManager() {
  const [keys, setKeys] = useState<AIKeyItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingProvider, setEditingProvider] = useState<string | null>(null)
  const [newKey, setNewKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guestMode, setGuestMode] = useState(false)
  const accessToken = useAuthStore((state) => state.accessToken)

  const fetchKeys = async () => {
    if (!accessToken || guestMode) return

    try {
      setLoading(true)
      const response = await api.get<{ keys: AIKeyItem[] }>('/v1/users/me/ai-keys')
      setKeys(response.data.keys || [])
    } catch (err) {
      console.error('Failed to fetch AI keys:', err)
      setError('AI 키 목록을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setGuestMode(isGuestSession())
  }, [])

  useEffect(() => {
    fetchKeys()
  }, [accessToken, guestMode])

  const handleSaveKey = async (provider: string) => {
    if (!newKey.trim() || !accessToken || guestMode) return

    try {
      setSaving(true)
      setError(null)

      await api.put('/v1/users/me/ai-keys', {
        keys: [{
          provider,
          api_key: newKey.trim(),
        }],
      })

      setEditingProvider(null)
      setNewKey('')
      await fetchKeys()
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to save key'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteKey = async (provider: string) => {
    if (!accessToken || guestMode) return
    if (!confirm(`${provider} API 키를 삭제하시겠습니까?`)) return

    try {
      setSaving(true)
      await api.delete(`/v1/users/me/ai-keys/${provider}`)
      await fetchKeys()
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to delete key'
      setError(message)
    } finally {
      setSaving(false)
    }
  }

  const getKeyStatus = (providerId: string) => {
    return keys.find((k) => k.provider === providerId)
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-neutral-800 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {guestMode && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-200">
          게스트 모드에서는 AI 키 관리 기능이 비활성화됩니다.
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          {error}
        </div>
      )}

      {PROVIDERS.map((provider) => {
        const keyStatus = getKeyStatus(provider.id)
        const isEditing = editingProvider === provider.id

        return (
          <div
            key={provider.id}
            className="p-4 bg-neutral-900/60 border border-neutral-800 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-neutral-200">{provider.name}</span>
                  <span className="text-xs text-neutral-500">{provider.model}</span>
                </div>
                {keyStatus?.masked && (
                  <div className="mt-1 text-xs text-neutral-500">
                    API Key: {keyStatus.masked}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                {keyStatus?.masked ? (
                  <>
                    <span className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded">
                      설정됨
                    </span>
                    <button
                      onClick={() => {
                        if (guestMode) return
                        setEditingProvider(provider.id)
                        setNewKey('')
                      }}
                      disabled={guestMode}
                      className="px-3 py-1 text-xs text-neutral-400 hover:text-neutral-200 transition"
                    >
                      변경
                    </button>
                    <button
                      onClick={() => handleDeleteKey(provider.id)}
                      disabled={saving || guestMode}
                      className="px-3 py-1 text-xs text-red-400 hover:text-red-300 transition disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </>
                ) : (
                  <>
                    <span className="px-2 py-1 text-xs bg-neutral-800 text-neutral-500 rounded">
                      미설정
                    </span>
                    <button
                      onClick={() => {
                        if (guestMode) return
                        setEditingProvider(provider.id)
                        setNewKey('')
                      }}
                      disabled={guestMode}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition"
                    >
                      추가
                    </button>
                  </>
                )}
              </div>
            </div>

            {isEditing && (
              <div className="mt-4 pt-4 border-t border-neutral-800">
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder={`${provider.name} API Key 입력`}
                    className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveKey(provider.id)}
                    disabled={saving || !newKey.trim() || guestMode}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingProvider(null)
                      setNewKey('')
                      setError(null)
                    }}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-lg transition"
                  >
                    취소
                  </button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">
                  API 키는 암호화되어 안전하게 저장됩니다.
                </p>
              </div>
            )}
          </div>
        )
      })}

      <div className="mt-4 p-4 bg-neutral-900/40 border border-neutral-800/60 rounded-lg">
        <p className="text-xs text-neutral-500">
          AI 키를 등록하면 버블 생성 시 각 AI의 의견을 받을 수 있습니다.
          <br />
          최소 하나 이상의 AI 키를 등록해야 AI 의견 기능을 사용할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
