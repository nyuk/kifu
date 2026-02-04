
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { api } from './api';

export interface AgentResponse {
  provider: string;
  model: string;
  prompt_type: 'brief' | 'detailed' | 'history' | 'custom' | 'technical';
  response: string;
  created_at: string;
}

export interface Bubble {
  id: string;
  symbol: string;
  timeframe: string;
  ts: number; // epoch ms
  price: number;
  note: string;
  tags?: string[];
  action?: 'BUY' | 'SELL' | 'HOLD' | 'TP' | 'SL' | 'NONE';
  agents?: AgentResponse[];
  asset_class?: string;
  venue_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Trade {
  id: string;
  exchange: 'upbit' | 'binance';
  symbol: string;
  side: 'buy' | 'sell';
  ts: number; // epoch ms
  price: number;
  qty?: number;
  fee?: number;
  raw?: any;
}

interface BubbleState {
  bubbles: Bubble[];
  addBubble: (bubble: Bubble) => void;
  createBubbleRemote: (payload: {
    symbol: string;
    timeframe: string;
    candle_time: string;
    price: string;
    memo?: string;
    tags?: string[];
    asset_class?: string;
    venue_name?: string;
  }) => Promise<Bubble>;
  updateBubbleRemote: (id: string, payload: {
    memo?: string;
    tags?: string[];
    asset_class?: string;
    venue_name?: string;
  }) => Promise<void>;
  backfillBubblesFromServer: () => Promise<{ updated: number }>;
  backfillPortfolioBubblesFromServer: () => Promise<{ created: number }>;
  updateBubble: (id: string, updates: Partial<Bubble>) => void;
  deleteBubble: (id: string) => void;
  replaceAllBubbles: (bubbles: Bubble[]) => void;
  getBubblesForTime: (symbol: string, timeframe: string, ts: number) => Bubble[];
  createBubbleFromTrade: (trade: Trade, overrides?: Partial<Bubble>) => Promise<Bubble>;
  createBubblesFromTrades: (trades: Trade[]) => Promise<{ created: Bubble[]; skipped: number; updated: number }>;
  backfillBubblesFromTrades: (trades: Trade[]) => Promise<{ updated: number }>;

  trades: Trade[];
  importTrades: (trades: Trade[]) => void;
  deleteAllTrades: () => void;
}

export const useBubbleStore = create<BubbleState>()(
  persist(
    (set, get) => ({
      bubbles: [],
      addBubble: (bubble) => set((state) => ({ bubbles: [...state.bubbles, bubble] })),
      createBubbleRemote: async (payload) => {
        const response = await api.post('/v1/bubbles', payload);
        const data = response.data;
        const bubble: Bubble = {
          id: data.id,
          symbol: data.symbol,
          timeframe: data.timeframe,
          ts: new Date(data.candle_time).getTime(),
          price: Number(data.price),
          note: data.memo || '',
          tags: data.tags || [],
          asset_class: data.asset_class,
          venue_name: data.venue_name,
          action: undefined,
          created_at: data.created_at || new Date().toISOString(),
          updated_at: data.updated_at || new Date().toISOString(),
        };
        set((state) => ({ bubbles: [...state.bubbles, bubble] }));
        return bubble;
      },
      updateBubbleRemote: async (id, payload) => {
        await api.put(`/v1/bubbles/${id}`, payload);
        set((state) => ({
          bubbles: state.bubbles.map((b) =>
            b.id === id ? { ...b, ...payload, updated_at: new Date().toISOString() } : b
          ),
        }));
      },
      backfillBubblesFromServer: async () => {
        const response = await api.post('/v1/trades/backfill-bubbles');
        const updated = Number(response.data?.updated || 0);
        return { updated };
      },
      backfillPortfolioBubblesFromServer: async () => {
        const response = await api.post('/v1/portfolio/backfill-bubbles');
        const created = Number(response.data?.created || 0);
        return { created };
      },
      updateBubble: (id, updates) =>
        set((state) => ({
          bubbles: state.bubbles.map((b) =>
            b.id === id ? { ...b, ...updates, updated_at: new Date().toISOString() } : b
          ),
        })),
      deleteBubble: (id) =>
        set((state) => ({ bubbles: state.bubbles.filter((b) => b.id !== id) })),
      replaceAllBubbles: (bubbles) => set({ bubbles }),
      getBubblesForTime: (symbol, timeframe, ts) => {
        return get().bubbles.filter(
          (b) => b.symbol === symbol && b.timeframe === timeframe && b.ts === ts
        );
      },
      createBubbleFromTrade: async (trade, overrides = {}) => {
        const action = trade.side === 'buy' ? 'BUY' : 'SELL';
        const now = new Date().toISOString();
        const memoOverride = typeof overrides.note === 'string' ? overrides.note : undefined;
        const tagsOverride = Array.isArray(overrides.tags) ? overrides.tags : undefined;
        const timeframeOverride = typeof overrides.timeframe === 'string' ? overrides.timeframe : undefined;
        const tsOverride = typeof overrides.ts === 'number' ? overrides.ts : undefined;
        const priceOverride = typeof overrides.price === 'number' ? overrides.price : undefined;
        const payload = {
          symbol: trade.symbol,
          timeframe: timeframeOverride || '1h',
          candle_time: new Date(tsOverride ?? trade.ts).toISOString(),
          price: String(priceOverride ?? trade.price),
          memo: memoOverride || `Trade sync: ${trade.symbol} ${trade.side.toUpperCase()} @ ${trade.price}`,
          tags: tagsOverride || [trade.side],
          asset_class: 'crypto',
          venue_name: trade.exchange,
        };
        const created = await get().createBubbleRemote(payload);
        set((state) => ({
          bubbles: state.bubbles.map((b) =>
            b.id === created.id
              ? {
                  ...b,
                  action,
                  note: created.note || payload.memo || '',
                  tags: created.tags?.length ? created.tags : payload.tags,
                  updated_at: now,
                }
              : b
          ),
        }));
        return {
          ...created,
          action,
          note: created.note || payload.memo || '',
          tags: created.tags?.length ? created.tags : payload.tags,
          created_at: created.created_at || now,
          updated_at: created.updated_at || now,
        };
      },
      createBubblesFromTrades: async (trades) => {
        const created: Bubble[] = [];
        let skipped = 0;
        let updated = 0;
        const existing = get().bubbles;
        for (const trade of trades) {
          const action = trade.side === 'buy' ? 'BUY' : 'SELL';
          const existingBubble = existing.find(
            (b) =>
              b.symbol === trade.symbol &&
              b.ts === trade.ts &&
              b.action === action &&
              Math.abs(b.price - trade.price) < 0.0000001
          );
          if (existingBubble) {
            const updatePayload = buildBubblePatchFromTrade(trade, existingBubble);
            if (Object.keys(updatePayload).length > 0) {
              try {
                await get().updateBubbleRemote(existingBubble.id, updatePayload);
                updated += 1;
              } catch {
                // ignore update errors for now
              }
            }
            skipped += 1;
            continue;
          }
          const bubble = await get().createBubbleFromTrade(trade);
          created.push(bubble);
        }
        return { created, skipped, updated };
      },
      backfillBubblesFromTrades: async (trades) => {
        const existing = get().bubbles;
        let updated = 0;
        for (const trade of trades) {
          const action = trade.side === 'buy' ? 'BUY' : 'SELL';
          const existingBubble = existing.find(
            (b) =>
              b.symbol === trade.symbol &&
              b.ts === trade.ts &&
              b.action === action &&
              Math.abs(b.price - trade.price) < 0.0000001
          );
          if (!existingBubble) continue;
          const updatePayload = buildBubblePatchFromTrade(trade, existingBubble);
          if (Object.keys(updatePayload).length === 0) continue;
          try {
            await get().updateBubbleRemote(existingBubble.id, updatePayload);
            updated += 1;
          } catch {
            // ignore update errors for now
          }
        }
        return { updated };
      },
      trades: [],
      importTrades: (newTrades) => set((state) => ({ trades: [...state.trades, ...newTrades] })),
      deleteAllTrades: () => set({ trades: [] }),
    }),
    {
      name: 'bubble-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

const buildBubblePatchFromTrade = (trade: Trade, bubble: Bubble) => {
  const patch: { memo?: string; tags?: string[]; asset_class?: string; venue_name?: string } = {};
  if (!bubble.tags || bubble.tags.length === 0) {
    patch.tags = [trade.side];
  }
  if (!bubble.note || bubble.note.trim().length === 0) {
    patch.memo = `Trade sync: ${trade.symbol} ${trade.side.toUpperCase()} @ ${trade.price}`;
  }
  if (!(bubble as any).asset_class) {
    patch.asset_class = 'crypto';
  }
  if (!(bubble as any).venue_name) {
    patch.venue_name = trade.exchange;
  }
  return patch;
}
