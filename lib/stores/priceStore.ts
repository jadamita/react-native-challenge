/**
 * Price store - re-exports from split stores for backwards compatibility
 *
 * The price store has been split into focused stores:
 * - lib/stores/price/priceStore.ts - Price data management
 * - lib/stores/price/chartStore.ts - Chart data and caching
 * - lib/stores/price/pollingStore.ts - Polling logic
 *
 * This file re-exports everything for backwards compatibility.
 */

export {
  // Combined store for backwards compatibility
  usePriceStore,
  usePriceStoreHydrated,
  // Individual stores
  usePriceDataStore,
  useChartStore,
  usePollingStore,
  // Price hooks
  usePrice,
  usePricesArray,
  useIsDataStale,
  useConsecutiveFailures,
  usePriceDataStoreHydrated,
  // Chart hooks
  useChartLoadingState,
  useChartStoreHydrated,
  // Constants
  STALE_THRESHOLD,
  MAX_CHART_CACHE_SIZE,
} from "./price";
