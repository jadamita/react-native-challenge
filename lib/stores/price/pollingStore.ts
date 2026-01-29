import { create } from "zustand";
import { PRICE_POLL_INTERVAL } from "@/lib/constants/cryptos";
import { usePriceDataStore } from "./priceStore";

interface PollingStoreState {
  // State
  isPolling: boolean;

  // Actions
  startPolling: () => void;
  stopPolling: () => void;
}

// Store the interval ID outside the store
let pollingInterval: ReturnType<typeof setInterval> | null = null;

export const usePollingStore = create<PollingStoreState>((set, get) => ({
  // Initial state
  isPolling: false,

  // Start automatic polling
  startPolling: () => {
    const { isPolling } = get();

    if (isPolling) return;

    set({ isPolling: true });

    // Get fetchAllPrices from price data store
    const fetchAllPrices = usePriceDataStore.getState().fetchAllPrices;

    // Fetch immediately
    fetchAllPrices();

    // Then poll at interval
    pollingInterval = setInterval(() => {
      usePriceDataStore.getState().fetchAllPrices();
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
}));
