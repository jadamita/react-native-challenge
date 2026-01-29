import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ChartDataPoint, VolumeDataPoint, ChartTimeframe, ApiError } from "@/lib/types";
import { fetchChartDataWithVolume } from "@/lib/api/coingecko";
import { CHART_CACHE_DURATION } from "@/lib/constants/cryptos";

/**
 * Maximum number of chart cache entries to keep
 */
export const MAX_CHART_CACHE_SIZE = 20;

interface ChartCache {
  prices: ChartDataPoint[];
  volumes: VolumeDataPoint[];
  timeframe: ChartTimeframe;
  fetchedAt: number;
}

interface ChartLoadingState {
  isLoading: boolean;
  error: ApiError | null;
}

interface ChartStoreState {
  // State
  chartCache: Record<string, ChartCache>;
  chartLoadingStates: Record<string, ChartLoadingState>;
  _hasHydrated: boolean;

  // Actions
  getChartData: (cryptoId: string, timeframe: ChartTimeframe) => Promise<{
    prices: ChartDataPoint[];
    volumes: VolumeDataPoint[];
    error: ApiError | null;
  }>;
  clearChartCache: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useChartStore = create<ChartStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      chartCache: {},
      chartLoadingStates: {},
      _hasHydrated: false,

      // Set hydration state
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
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
          return { prices: cached.prices, volumes: cached.volumes, error: null };
        }

        // Set loading state for this chart
        set({
          chartLoadingStates: {
            ...chartLoadingStates,
            [cacheKey]: { isLoading: true, error: null },
          },
        });

        // Fetch fresh data with volume
        const result = await fetchChartDataWithVolume(cryptoId, timeframe);

        if (result.success) {
          set((state) => {
            let newCache = {
              ...state.chartCache,
              [cacheKey]: {
                prices: result.data.prices,
                volumes: result.data.volumes,
                timeframe,
                fetchedAt: Date.now(),
              },
            };

            // Evict oldest entries if cache exceeds max size
            const cacheKeys = Object.keys(newCache);
            if (cacheKeys.length > MAX_CHART_CACHE_SIZE) {
              // Sort by fetchedAt ascending (oldest first)
              const sortedKeys = cacheKeys.sort(
                (a, b) => newCache[a].fetchedAt - newCache[b].fetchedAt
              );
              // Remove oldest entries until we're at the limit
              const keysToRemove = sortedKeys.slice(0, cacheKeys.length - MAX_CHART_CACHE_SIZE);
              newCache = { ...newCache };
              keysToRemove.forEach((key) => delete newCache[key]);
            }

            return {
              chartCache: newCache,
              chartLoadingStates: {
                ...state.chartLoadingStates,
                [cacheKey]: { isLoading: false, error: null },
              },
            };
          });
          return { prices: result.data.prices, volumes: result.data.volumes, error: null };
        }

        // Update loading state with error
        set((state) => ({
          chartLoadingStates: {
            ...state.chartLoadingStates,
            [cacheKey]: { isLoading: false, error: result.error },
          },
        }));

        // Return cached data if available, otherwise empty arrays with error
        return {
          prices: cached?.prices ?? [],
          volumes: cached?.volumes ?? [],
          error: result.error,
        };
      },

      // Clear chart cache
      clearChartCache: () => {
        set({ chartCache: {}, chartLoadingStates: {} });
      },
    }),
    {
      name: "stonkr-charts",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist chart cache
      partialize: (state) => ({
        chartCache: state.chartCache,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Hook to get chart loading state for a specific crypto/timeframe
 */
export function useChartLoadingState(cryptoId: string, timeframe: ChartTimeframe) {
  return useChartStore((state) => {
    const cacheKey = `${cryptoId}-${timeframe}`;
    return state.chartLoadingStates[cacheKey] ?? { isLoading: false, error: null };
  });
}

/**
 * Hook to check if chart store has been hydrated from storage
 */
export function useChartStoreHydrated(): boolean {
  return useChartStore((state) => state._hasHydrated);
}
