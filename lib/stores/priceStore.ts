import { create } from "zustand";
import type { PriceData, ChartDataPoint, ChartTimeframe, ApiError } from "@/lib/types";
import { fetchPrices, fetchChartData } from "@/lib/api/coingecko";
import { PRICE_POLL_INTERVAL, CHART_CACHE_DURATION } from "@/lib/constants/cryptos";

interface ChartCache {
  data: ChartDataPoint[];
  timeframe: ChartTimeframe;
  fetchedAt: number;
}

interface ChartLoadingState {
  isLoading: boolean;
  error: ApiError | null;
}

/**
 * Stale data threshold - show warning if data is older than 2 minutes
 */
export const STALE_THRESHOLD = 2 * 60 * 1000;

interface PriceStore {
  // State
  prices: Record<string, PriceData>;
  chartCache: Record<string, ChartCache>;
  chartLoadingStates: Record<string, ChartLoadingState>;
  isLoading: boolean;
  error: ApiError | null;
  lastFetchTime: number | null;
  isPolling: boolean;
  consecutiveFailures: number;

  // Actions
  fetchAllPrices: () => Promise<void>;
  getChartData: (cryptoId: string, timeframe: ChartTimeframe) => Promise<{ data: ChartDataPoint[]; error: ApiError | null }>;
  refreshPrices: () => Promise<void>;
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
  chartLoadingStates: {},
  isLoading: false,
  error: null,
  lastFetchTime: null,
  isPolling: false,
  consecutiveFailures: 0,

  // Fetch all prices
  fetchAllPrices: async () => {
    const { consecutiveFailures } = get();

    // Don't set loading on subsequent poll failures to avoid flickering
    if (consecutiveFailures === 0) {
      set({ isLoading: true });
    }

    const result = await fetchPrices();

    if (result.success) {
      const priceMap: Record<string, PriceData> = {};
      result.data.forEach((p) => {
        priceMap[p.cryptoId] = p;
      });
      set({
        prices: priceMap,
        isLoading: false,
        error: null,
        lastFetchTime: Date.now(),
        consecutiveFailures: 0,
      });
    } else {
      set((state) => ({
        isLoading: false,
        error: result.error,
        consecutiveFailures: state.consecutiveFailures + 1,
      }));
    }
  },

  // Manual refresh - always shows loading
  refreshPrices: async () => {
    set({ isLoading: true, error: null, consecutiveFailures: 0 });

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

  // Get chart data with caching and per-chart loading states
  getChartData: async (cryptoId: string, timeframe: ChartTimeframe) => {
    const { chartCache, chartLoadingStates } = get();
    const cacheKey = `${cryptoId}-${timeframe}`;
    const cached = chartCache[cacheKey];

    // Check if we have valid cached data
    if (
      cached &&
      cached.timeframe === timeframe &&
      Date.now() - cached.fetchedAt < CHART_CACHE_DURATION
    ) {
      return { data: cached.data, error: null };
    }

    // Set loading state for this chart
    set({
      chartLoadingStates: {
        ...chartLoadingStates,
        [cacheKey]: { isLoading: true, error: null },
      },
    });

    // Fetch fresh data
    const result = await fetchChartData(cryptoId, timeframe);

    if (result.success) {
      set((state) => ({
        chartCache: {
          ...state.chartCache,
          [cacheKey]: {
            data: result.data,
            timeframe,
            fetchedAt: Date.now(),
          },
        },
        chartLoadingStates: {
          ...state.chartLoadingStates,
          [cacheKey]: { isLoading: false, error: null },
        },
      }));
      return { data: result.data, error: null };
    }

    // Update loading state with error
    set((state) => ({
      chartLoadingStates: {
        ...state.chartLoadingStates,
        [cacheKey]: { isLoading: false, error: result.error },
      },
    }));

    // Return cached data if available, otherwise empty array with error
    return { data: cached?.data ?? [], error: result.error };
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

/**
 * Hook to check if price data is stale
 */
export function useIsDataStale(): boolean {
  return usePriceStore((state) => {
    if (!state.lastFetchTime) return false;
    return Date.now() - state.lastFetchTime > STALE_THRESHOLD;
  });
}

/**
 * Hook to get chart loading state for a specific crypto/timeframe
 */
export function useChartLoadingState(cryptoId: string, timeframe: ChartTimeframe) {
  return usePriceStore((state) => {
    const cacheKey = `${cryptoId}-${timeframe}`;
    return state.chartLoadingStates[cacheKey] ?? { isLoading: false, error: null };
  });
}

/**
 * Hook to get consecutive failure count
 */
export function useConsecutiveFailures(): number {
  return usePriceStore((state) => state.consecutiveFailures);
}
