import { create } from "zustand";
import type { Alert, TriggeredAlert, PriceData } from "@/lib/types";

interface AlertStore {
  // State
  activeAlerts: Alert[];
  triggeredAlerts: TriggeredAlert[];

  // Computed
  unviewedCount: number;

  // Actions
  addAlert: (alert: Omit<Alert, "id" | "createdAt">) => string;
  removeAlert: (alertId: string) => void;
  updateAlert: (alertId: string, updates: Partial<Pick<Alert, "type" | "threshold">>) => void;
  getAlertForCrypto: (cryptoId: string) => Alert | undefined;

  // Alert evaluation
  evaluateAlerts: (prices: Record<string, PriceData>) => void;

  // Triggered alerts management
  markAllAsViewed: () => void;
  clearTriggeredAlerts: () => void;
}

/**
 * Generate a unique ID for alerts
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export const useAlertStore = create<AlertStore>((set, get) => ({
  // Initial state
  activeAlerts: [],
  triggeredAlerts: [],

  // Computed - unviewed count
  get unviewedCount() {
    return get().triggeredAlerts.filter((t) => !t.viewed).length;
  },

  // Add a new alert
  addAlert: (alertData) => {
    const id = generateId();
    const alert: Alert = {
      ...alertData,
      id,
      createdAt: Date.now(),
    };

    // Remove any existing alert for the same crypto
    set((state) => ({
      activeAlerts: [
        ...state.activeAlerts.filter((a) => a.cryptoId !== alertData.cryptoId),
        alert,
      ],
    }));

    return id;
  },

  // Remove an alert
  removeAlert: (alertId) => {
    set((state) => ({
      activeAlerts: state.activeAlerts.filter((a) => a.id !== alertId),
    }));
  },

  // Update an existing alert
  updateAlert: (alertId, updates) => {
    set((state) => ({
      activeAlerts: state.activeAlerts.map((a) =>
        a.id === alertId ? { ...a, ...updates } : a
      ),
    }));
  },

  // Get alert for a specific crypto
  getAlertForCrypto: (cryptoId) => {
    return get().activeAlerts.find((a) => a.cryptoId === cryptoId);
  },

  // Evaluate all alerts against current prices
  evaluateAlerts: (prices) => {
    const { activeAlerts } = get();
    const triggeredIds: string[] = [];
    const newTriggered: TriggeredAlert[] = [];

    activeAlerts.forEach((alert) => {
      const priceData = prices[alert.cryptoId];
      if (!priceData) return;

      const currentPrice = priceData.price;
      let isTriggered = false;

      if (alert.type === "above" && currentPrice >= alert.threshold) {
        isTriggered = true;
      } else if (alert.type === "below" && currentPrice <= alert.threshold) {
        isTriggered = true;
      }

      if (isTriggered) {
        triggeredIds.push(alert.id);
        newTriggered.push({
          id: generateId(),
          alert,
          triggeredPrice: currentPrice,
          triggeredAt: Date.now(),
          viewed: false,
        });
      }
    });

    if (triggeredIds.length > 0) {
      set((state) => ({
        // Remove triggered alerts from active
        activeAlerts: state.activeAlerts.filter(
          (a) => !triggeredIds.includes(a.id)
        ),
        // Add to triggered list
        triggeredAlerts: [...newTriggered, ...state.triggeredAlerts],
      }));
    }
  },

  // Mark all triggered alerts as viewed
  markAllAsViewed: () => {
    set((state) => ({
      triggeredAlerts: state.triggeredAlerts.map((t) => ({
        ...t,
        viewed: true,
      })),
    }));
  },

  // Clear all triggered alerts (after viewing)
  clearTriggeredAlerts: () => {
    set({ triggeredAlerts: [] });
  },
}));

/**
 * Hook to get unviewed alert count for badge
 */
export function useUnviewedAlertCount(): number {
  return useAlertStore((state) =>
    state.triggeredAlerts.filter((t) => !t.viewed).length
  );
}

/**
 * Hook to get alert for a specific crypto
 */
export function useAlertForCrypto(cryptoId: string): Alert | undefined {
  return useAlertStore((state) =>
    state.activeAlerts.find((a) => a.cryptoId === cryptoId)
  );
}
