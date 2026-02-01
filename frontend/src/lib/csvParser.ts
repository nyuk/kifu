
import { Trade } from './bubbleStore'

export async function parseTradeCsv(file: File): Promise<Trade[]> {
    const text = await file.text()
    const lines = text.split('\n').filter(line => line.trim() !== '')

    if (lines.length < 2) return []

    const headers = lines[0].toLowerCase().split(',').map(h => h.trim())

    // Basic mapping helper
    const getIdx = (candidates: string[]) => headers.findIndex(h => candidates.includes(h))

    const timeIdx = getIdx(['time', 'date', 'created_at', 'timestamp'])
    const sideIdx = getIdx(['side', 'type', 'action'])
    const priceIdx = getIdx(['price', 'avg_price', 'exec_price'])
    const qtyIdx = getIdx(['qty', 'quantity', 'amount', 'units'])
    const symbolIdx = getIdx(['symbol', 'market', 'pair'])

    if (timeIdx === -1 || sideIdx === -1 || priceIdx === -1) {
        throw new Error('Missing required columns: time, side, price')
    }

    const trades: Trade[] = []

    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim())
        if (cols.length < headers.length) continue

        try {
            const rawTime = cols[timeIdx]
            const sideRaw = cols[sideIdx].toLowerCase()
            const price = parseFloat(cols[priceIdx])
            const qty = qtyIdx !== -1 ? parseFloat(cols[qtyIdx]) : undefined
            const symbol = symbolIdx !== -1 ? cols[symbolIdx] : 'UNKNOWN'

            // Normalize Side
            let side: 'buy' | 'sell' = 'buy'
            if (['sell', 'ask', 'bid_sell'].includes(sideRaw)) side = 'sell'

            // Parse Time
            const ts = new Date(rawTime).getTime()
            if (isNaN(ts)) continue

            trades.push({
                id: crypto.randomUUID(),
                exchange: 'upbit', // default for now, or detect from header
                symbol,
                side,
                ts,
                price,
                qty,
                raw: { original: lines[i] }
            })
        } catch (e) {
            console.warn('Failed to parse line', i, e)
        }
    }

    return trades
}
