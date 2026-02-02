
import { useBubbleStore, type Bubble, type Trade } from './bubbleStore'

export interface DataExport {
    schemaVersion?: number
    exportedAt?: string
    appVersion?: string
    bubbles: Bubble[]
    trades?: Trade[]
}

export function exportBubbles() {
    const { bubbles, trades } = useBubbleStore.getState()
    const data: DataExport = {
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        bubbles,
        trades,
    }

    const jsonString = JSON.stringify(data, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = `kifu-export-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export async function importBubbles(file: File): Promise<{ success: boolean; message: string }> {
    try {
        const text = await file.text()
        const data = JSON.parse(text) as DataExport

        // bubbles 배열 확인
        if (!Array.isArray(data.bubbles)) {
            return { success: false, message: 'Invalid file format: bubbles array missing' }
        }

        // 버블 교체
        useBubbleStore.getState().replaceAllBubbles(data.bubbles)

        // trades가 있으면 함께 import
        let tradeCount = 0
        if (Array.isArray(data.trades) && data.trades.length > 0) {
            useBubbleStore.getState().deleteAllTrades()
            useBubbleStore.getState().importTrades(data.trades)
            tradeCount = data.trades.length
        }

        const message = tradeCount > 0
            ? `${data.bubbles.length}개 버블, ${tradeCount}개 거래 가져오기 완료`
            : `${data.bubbles.length}개 버블 가져오기 완료`

        return { success: true, message }
    } catch (error) {
        console.error(error)
        return { success: false, message: 'JSON 파일 파싱 실패' }
    }
}
