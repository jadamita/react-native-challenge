/**
 * Price stores - split into focused stores for better separation of concerns
 *
 * - priceStore: Price data management (prices, loading, errors)
 * - chartStore: Chart data and caching
 * - pollingStore: Polling logic
 */

// Re-export all stores and hooks
export {
  usePriceDataStore,
  usePrice,
  usePricesArray,
  useIsDataStale,
  useConsecutiveFailures,
  usePriceDataStoreHydrated,
  STALE_THRESHOLD,
} from "./priceStore";

export {
  useChartStore,
  useChartLoadingState,
  useChartStoreHydrated,
  MAX_CHART_CACHE_SIZE,
} from "./chartStore";

export {
  usePollingStore,
} from "./pollingStore";

// Backwards compatibility - create a combined store interface
// This allows existing code to work without changes
import { usePriceDataStore } from "./priceStore";
import { useChartStore } from "./chartStore";
import { usePollingStore } from "./pollingStore";
import type { PriceData, ChartDataPoint, VolumeDataPoint, ChartTimeframe, ApiError } from "@/lib/types";

/**
 * Combined price store for backwards compatibility
 * Provides the same interface as the original usePriceStore
 */
export const usePriceStore = Object.assign(
  // Main selector function
  <T>(selector: (state: CombinedPriceState) => T): T => {
    const priceState = usePriceDataStore((s) => ({
      prices: s.prices,
      isLoading: s.isLoading,
      error: s.error,
      lastFetchTime: s.lastFetchTime,
      consecutiveFailures: s.consecutiveFailures,
      _hasHydrated: s._hasHydrated,
    }));
    const chartState = useChartStore((s) => ({
      chartCache: s.chartCache,
      chartLoadingStates: s.chartLoadingStates,
    }));
    const pollingState = usePollingStore((s) => ({
      isPolling: s.isPolling,
    }));

    const combined: CombinedPriceState = {
      ...priceState,
      ...chartState,
      ...pollingState,
      // Actions
      fetchAllPrices: usePriceDataStore.getState().fetchAllPrices,
      refreshPrices: usePriceDataStore.getState().refreshPrices,
      clearError: usePriceDataStore.getState().clearError,
      setHasHydrated: usePriceDataStore.getState().setHasHydrated,
      getChartData: useChartStore.getState().getChartData,
      clearChartCache: useChartStore.getState().clearChartCache,
      startPolling: usePollingStore.getState().startPolling,
      stopPolling: usePollingStore.getState().stopPolling,
    };

    return selector(combined);
  },
  // Static methods
  {
    getState: (): CombinedPriceState => ({
      // Price data
      ...usePriceDataStore.getState(),
      // Chart data (without overwriting _hasHydrated)
      chartCache: useChartStore.getState().chartCache,
      chartLoadingStates: useChartStore.getState().chartLoadingStates,
      // Polling
      isPolling: usePollingStore.getState().isPolling,
      // Combined actions
      getChartData: useChartStore.getState().getChartData,
      clearChartCache: useChartStore.getState().clearChartCache,
      startPolling: usePollingStore.getState().startPolling,
      stopPolling: usePollingStore.getState().stopPolling,
    }),
    setState: (partial: Partial<CombinedPriceState>) => {
      // Distribute state updates to appropriate stores
      const priceKeys = ['prices', 'isLoading', 'error', 'lastFetchTime', 'consecutiveFailures', '_hasHydrated'];
      const chartKeys = ['chartCache', 'chartLoadingStates'];
      const pollingKeys = ['isPolling'];

      const priceUpdate: Record<string, unknown> = {};
      const chartUpdate: Record<string, unknown> = {};
      const pollingUpdate: Record<string, unknown> = {};

      for (const [key, value] of Object.entries(partial)) {
        if (priceKeys.includes(key)) {
          priceUpdate[key] = value;
        } else if (chartKeys.includes(key)) {
          chartUpdate[key] = value;
        } else if (pollingKeys.includes(key)) {
          pollingUpdate[key] = value;
        }
      }

      if (Object.keys(priceUpdate).length > 0) {
        usePriceDataStore.setState(priceUpdate as any);
      }
      if (Object.keys(chartUpdate).length > 0) {
        useChartStore.setState(chartUpdate as any);
      }
      if (Object.keys(pollingUpdate).length > 0) {
        usePollingStore.setState(pollingUpdate as any);
      }
    },
  }
);

interface CombinedPriceState {
  // From price data store
  prices: Record<string, PriceData>;
  isLoading: boolean;
  error: ApiError | null;
  lastFetchTime: number | null;
  consecutiveFailures: number;
  _hasHydrated: boolean;
  fetchAllPrices: () => Promise<void>;
  refreshPrices: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
  // From chart store
  chartCache: Record<string, {
    prices: ChartDataPoint[];
    volumes: VolumeDataPoint[];
    timeframe: ChartTimeframe;
    fetchedAt: number;
  }>;
  chartLoadingStates: Record<string, {
    isLoading: boolean;
    error: ApiError | null;
  }>;
  getChartData: (cryptoId: string, timeframe: ChartTimeframe) => Promise<{
    prices: ChartDataPoint[];
    volumes: VolumeDataPoint[];
    error: ApiError | null;
  }>;
  clearChartCache: () => void;
  // From polling store
  isPolling: boolean;
  startPolling: () => void;
  stopPolling: () => void;
}

/**
 * Hook to check if price store has been hydrated from storage
 * Checks both price data and chart stores
 */
export function usePriceStoreHydrated(): boolean {
  const priceHydrated = usePriceDataStore((state) => state._hasHydrated);
  const chartHydrated = useChartStore((state) => state._hasHydrated);
  return priceHydrated && chartHydrated;
}
