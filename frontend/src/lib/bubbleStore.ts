
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

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
  updateBubble: (id: string, updates: Partial<Bubble>) => void;
  deleteBubble: (id: string) => void;
  replaceAllBubbles: (bubbles: Bubble[]) => void;
  getBubblesForTime: (symbol: string, timeframe: string, ts: number) => Bubble[];

  trades: Trade[];
  importTrades: (trades: Trade[]) => void;
  deleteAllTrades: () => void;
}

export const useBubbleStore = create<BubbleState>()(
  persist(
    (set, get) => ({
      bubbles: [],
      addBubble: (bubble) => set((state) => ({ bubbles: [...state.bubbles, bubble] })),
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
