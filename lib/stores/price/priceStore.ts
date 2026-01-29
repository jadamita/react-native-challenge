import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PriceData, ApiError } from "@/lib/types";
import { fetchPrices } from "@/lib/api/coingecko";

/**
 * Stale data threshold - show warning if data is older than 2 minutes
 */
export const STALE_THRESHOLD = 2 * 60 * 1000;

interface PriceStoreState {
  // State
  prices: Record<string, PriceData>;
  isLoading: boolean;
  error: ApiError | null;
  lastFetchTime: number | null;
  consecutiveFailures: number;
  _hasHydrated: boolean;

  // Actions
  fetchAllPrices: () => Promise<void>;
  refreshPrices: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const usePriceDataStore = create<PriceStoreState>()(
  persist(
    (set, get) => ({
      // Initial state
      prices: {},
      isLoading: false,
      error: null,
      lastFetchTime: null,
      consecutiveFailures: 0,
      _hasHydrated: false,

      // Set hydration state
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },

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

      // Clear error
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: "stonkr-prices",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist these fields
      partialize: (state) => ({
        prices: state.prices,
        lastFetchTime: state.lastFetchTime,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Hook to get price for a specific crypto
 */
export function usePrice(cryptoId: string): PriceData | undefined {
  return usePriceDataStore((state) => state.prices[cryptoId]);
}

/**
 * Hook to get all prices as an array
 */
export function usePricesArray(): PriceData[] {
  return usePriceDataStore((state) => Object.values(state.prices));
}

/**
 * Hook to check if price data is stale
 */
export function useIsDataStale(): boolean {
  return usePriceDataStore((state) => {
    if (!state.lastFetchTime) return false;
    return Date.now() - state.lastFetchTime > STALE_THRESHOLD;
  });
}

/**
 * Hook to get consecutive failure count
 */
export function useConsecutiveFailures(): number {
  return usePriceDataStore((state) => state.consecutiveFailures);
}

/**
 * Hook to check if price store has been hydrated from storage
 */
export function usePriceDataStoreHydrated(): boolean {
  return usePriceDataStore((state) => state._hasHydrated);
}
