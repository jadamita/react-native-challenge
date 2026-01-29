import { usePriceDataStore } from "@/lib/stores/priceStore";
import type { ConnectionStatus } from "@/lib/types";

/**
 * Hook to determine network/connection status based on API call results.
 * This approach:
 * 1. Avoids adding extra dependencies
 * 2. Reflects actual connectivity to the data source (not just generic internet)
 * 3. Works seamlessly with our existing error handling
 */
export function useNetworkStatus(): ConnectionStatus {
  const error = usePriceDataStore((state) => state.error);
  const consecutiveFailures = usePriceDataStore((state) => state.consecutiveFailures);
  const isLoading = usePriceDataStore((state) => state.isLoading);
  const lastFetchTime = usePriceDataStore((state) => state.lastFetchTime);

  // Determine connection status
  if (isLoading && !lastFetchTime) {
    return "checking";
  }

  // Consider offline after 2+ consecutive failures with network-related errors
  if (consecutiveFailures >= 2 && error) {
    if (error.type === "NETWORK" || error.type === "TIMEOUT") {
      return "offline";
    }
  }

  return "online";
}

/**
 * Hook that provides a boolean for simple online/offline checks
 */
export function useIsOnline(): boolean {
  const status = useNetworkStatus();
  return status === "online";
}

/**
 * Hook that returns true when initially connecting (no data yet)
 */
export function useIsInitialLoading(): boolean {
  const isLoading = usePriceDataStore((state) => state.isLoading);
  const lastFetchTime = usePriceDataStore((state) => state.lastFetchTime);

  return isLoading && !lastFetchTime;
}
