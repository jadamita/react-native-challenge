import { create } from "zustand";
import type { PriceData, ChartDataPoint, ChartTimeframe } from "@/lib/types";
import { fetchPrices, fetchChartData } from "@/lib/api/coingecko";
import { PRICE_POLL_INTERVAL, CHART_CACHE_DURATION } from "@/lib/constants/cryptos";

interface ChartCache {
  data: ChartDataPoint[];
  timeframe: ChartTimeframe;
  fetchedAt: number;
}

interface PriceStore {
  // State
  prices: Record<string, PriceData>;
  chartCache: Record<string, ChartCache>;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
  isPolling: boolean;

  // Actions
  fetchAllPrices: () => Promise<void>;
  getChartData: (cryptoId: string, timeframe: ChartTimeframe) => Promise<ChartDataPoint[]>;
  startPolling: () => void;
  stopPolling: () => void;
  clearError: () => void;
}

// Store the interval ID outside the store
let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const usePriceStore = create<PriceStore>((set, get) => ({
  // Initial state
  prices: {},
  chartCache: {},
  isLoading: false,
  error: null,
  lastFetchTime: null,
  isPolling: false,

  // Fetch all prices
  fetchAllPrices: async () => {
    set({ isLoading: true, error: null });

    const result = await fetchPrices();

    if (result.success) {
      const priceMap: Record<string, PriceData> = {};
      result.data.forEach((p) => {
        priceMap[p.cryptoId] = p;
      });
      set({
        prices: priceMap,
        isLoading: false,
        lastFetchTime: Date.now(),
      });
    } else {
      set({
        isLoading: false,
        error: result.error,
      });
    }
  },

  // Get chart data with caching
  getChartData: async (cryptoId: string, timeframe: ChartTimeframe) => {
    const { chartCache } = get();
    const cached = chartCache[cryptoId];

    // Check if we have valid cached data
    if (
      cached &&
      cached.timeframe === timeframe &&
      Date.now() - cached.fetchedAt < CHART_CACHE_DURATION
    ) {
      return cached.data;
    }

    // Fetch fresh data
    const result = await fetchChartData(cryptoId, timeframe);

    if (result.success) {
      set({
        chartCache: {
          ...get().chartCache,
          [cryptoId]: {
            data: result.data,
            timeframe,
            fetchedAt: Date.now(),
          },
        },
      });
      return result.data;
    }

    // Return cached data if fetch fails, or empty array
    return cached?.data ?? [];
  },

  // Start automatic polling
  startPolling: () => {
    const { isPolling, fetchAllPrices } = get();

    if (isPolling) return;

    set({ isPolling: true });

    // Fetch immediately
    fetchAllPrices();

    // Then poll at interval
    pollingInterval = setInterval(() => {
      fetchAllPrices();
    }, PRICE_POLL_INTERVAL);
  },

  // Stop polling
  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    set({ isPolling: false });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },
}));

/**
 * Hook to get price for a specific crypto
 */
export function usePrice(cryptoId: string): PriceData | undefined {
  return usePriceStore((state) => state.prices[cryptoId]);
}

/**
 * Hook to get all prices as an array
 */
export function usePricesArray(): PriceData[] {
  return usePriceStore((state) => Object.values(state.prices));
}
