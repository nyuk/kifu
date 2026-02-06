export type AiSectionTone = 'summary' | 'risk' | 'conclusion' | 'checklist' | 'neutral'

export type AiSection = {
  title: string
  body: string
  tone: AiSectionTone
}

const headerPattern = /^\d+\)\s*([^:]+):\s*(.*)$/

const normalize = (value: string) => value.replace(/\s+/g, '').toLowerCase()

const resolveTone = (title: string): AiSectionTone => {
  const key = normalize(title)
  if (key.includes('결론') || key.includes('conclusion')) return 'conclusion'
  if (key.includes('리스크') || key.includes('위험') || key.includes('무효') || key.includes('risk')) return 'risk'
  if (key.includes('체크') || key.includes('check')) return 'checklist'
  if (key.includes('요약') || key.includes('상황') || key.includes('summary')) return 'summary'
  return 'neutral'
}

export const parseAiSections = (text: string): AiSection[] => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const sections: AiSection[] = []
  let current: AiSection | null = null

  for (const line of lines) {
    const match = line.match(headerPattern)
    if (match) {
      if (current) sections.push(current)
      const title = match[1].trim()
      const body = match[2].trim()
      current = {
        title,
        body,
        tone: resolveTone(title),
      }
      continue
    }

    if (!current) {
      continue
    }

    current.body = current.body ? `${current.body}\n${line}` : line
  }

  if (current) sections.push(current)
  return sections
}

export const toneClass = (tone: AiSectionTone) => {
  switch (tone) {
    case 'summary':
      return 'border-sky-400/40 bg-sky-500/10 text-sky-100'
    case 'risk':
      return 'border-amber-400/40 bg-amber-500/10 text-amber-100'
    case 'conclusion':
      return 'border-emerald-400/40 bg-emerald-500/10 text-emerald-100'
    case 'checklist':
      return 'border-cyan-400/40 bg-cyan-500/10 text-cyan-100'
    default:
      return 'border-neutral-800/70 bg-neutral-950/70 text-neutral-200'
  }
}
