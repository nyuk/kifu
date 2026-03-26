'use client'

import { useEffect, useState } from 'react'
import { useI18n } from '../../../../src/lib/i18n'
import { useAlertStore } from '../../../../src/stores/alertStore'
import { RuleList } from '../../../../src/components/alerts/RuleList'
import { RuleEditor } from '../../../../src/components/alerts/RuleEditor'
import { PresetStrategies } from '../../../../src/components/presets/PresetStrategies'
import type { AlertRule } from '../../../../src/types/alert'
import Link from 'next/link'
import { isGuestSession } from '../../../../src/lib/guestSession'

type Tab = 'rules' | 'presets'

export default function AlertRulesPage() {
  const { t } = useI18n()
  const guestMode = isGuestSession()
  const { rules, isLoadingRules, rulesError, fetchRules } = useAlertStore()
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('rules')

  useEffect(() => {
    fetchRules()
  }, [fetchRules])

  const handleCreate = () => {
    setEditingRule(null)
    setEditorOpen(true)
  }

  const handleEdit = (rule: AlertRule) => {
    setEditingRule(rule)
    setEditorOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6">
        <div className="flex items-center gap-2 text-xs text-neutral-500">
          <Link href="/alerts" className="hover:text-neutral-300 transition">
            {t.alertsTitle}
          </Link>
          <span>/</span>
          <span>{activeTab === 'rules' ? t.alertRulesTitle : '프리셋 전략'}</span>
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-neutral-100">
          {activeTab === 'rules' ? t.alertRulesTitle : '프리셋 전략'}
        </h2>
        <p className="mt-2 text-sm text-neutral-400">
          {activeTab === 'rules'
            ? '알림은 진입 신호보다 복기 후보를 놓치지 않게 도와주는 보조 장치입니다. 신호가 오면 차트와 말풍선으로 바로 이어가세요.'
            : 'KIFU가 검증한 전략을 먼저 읽고, 내 루틴에 맞으면 알림으로 연결하세요.'}
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('rules')}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'rules'
              ? 'bg-neutral-200 text-neutral-950'
              : 'bg-white/[0.04] text-neutral-400 hover:bg-white/[0.06]'
          }`}
        >
          내 알림
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition ${
            activeTab === 'presets'
              ? 'bg-neutral-200 text-neutral-950'
              : 'bg-white/[0.04] text-neutral-400 hover:bg-white/[0.06]'
          }`}
        >
          검증된 전략
        </button>
      </div>

      {/* Tab content */}
      {activeTab === 'presets' ? (
        <PresetStrategies />
      ) : (
        <>
          {guestMode && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              게스트 모드에서는 알림 규칙을 읽기만 할 수 있습니다. 생성, 수정, 삭제, 토글은 웹 계정에서 사용할 수 있습니다.
            </div>
          )}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-neutral-500">복기 루틴 안에서 쓰는 방법</p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-sm font-semibold text-neutral-100">1. 먼저 알림을 받습니다</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  가격 변화나 변동성 신호를 놓치지 않도록, 내 루틴에 맞는 종목과 기준만 걸어둡니다.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-sm font-semibold text-neutral-100">2. 차트에서 장면을 확인합니다</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  알림이 오면 바로 차트로 가서 말풍선과 체결 오버레이로 그 순간의 장면을 먼저 봅니다.
                </p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                <p className="text-sm font-semibold text-neutral-100">3. 복기로 판단을 남깁니다</p>
                <p className="mt-2 text-sm leading-relaxed text-neutral-400">
                  단순히 알림을 받는 데서 끝내지 않고, 왜 봤는지와 어떤 판단을 했는지 복기로 이어갑니다.
                </p>
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleCreate}
              disabled={guestMode}
              className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-950 transition hover:bg-white"
            >
              + 새 알림 만들기
            </button>
          </div>

          {rulesError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
              {rulesError}
            </div>
          )}

          {isLoadingRules && rules.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/[0.04]" />
              ))}
            </div>
          ) : rules.length === 0 ? (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-10 text-center">
              <p className="text-sm text-neutral-400">아직 만든 알림이 없습니다.</p>
              <p className="mt-2 text-sm text-neutral-500">
                직접 규칙을 만들거나, 검증된 전략 탭에서 프리셋으로 시작해도 됩니다.
              </p>
              <button
                type="button"
                onClick={handleCreate}
                disabled={guestMode}
                className="mt-4 rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:border-neutral-500 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                + 새 알림 만들기
              </button>
            </div>
          ) : (
            <RuleList rules={rules} onEdit={handleEdit} guestMode={guestMode} />
          )}

          <RuleEditor
            open={editorOpen}
            rule={editingRule}
            guestMode={guestMode}
            onClose={() => setEditorOpen(false)}
          />
        </>
      )}
    </div>
  )
}
