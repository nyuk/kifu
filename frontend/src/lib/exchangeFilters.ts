const normalizeToken = (value: string) => value.trim().toLowerCase()

export const normalizeExchangeFilter = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null

  const firstToken = trimmed.split(/[,\s]+/).find(Boolean)
  if (!firstToken) return null

  const token = normalizeToken(firstToken)
  if (token === 'binance' || token === 'binance_futures' || token === 'binancefutures' || token === 'futures') {
    return 'binance_futures'
  }
  if (token === 'binance_spot' || token === 'binancespot' || token === 'spot') {
    return 'binance_spot'
  }
  if (token === 'upbit') {
    return 'upbit'
  }
  return null
}
