import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface SettingsStore {
  // Settings
  showVolumeChart: boolean;
  isDarkMode: boolean;

  // Hydration state
  _hasHydrated: boolean;

  // Actions
  setShowVolumeChart: (show: boolean) => void;
  setIsDarkMode: (isDark: boolean) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Default settings
      showVolumeChart: false,
      isDarkMode: true,
      _hasHydrated: false,

      // Actions
      setShowVolumeChart: (show) => {
        set({ showVolumeChart: show });
      },

      setIsDarkMode: (isDark) => {
        set({ isDarkMode: isDark });
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: "stonkr-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        showVolumeChart: state.showVolumeChart,
        isDarkMode: state.isDarkMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

/**
 * Hook to check if settings store has been hydrated
 */
export function useSettingsHydrated(): boolean {
  return useSettingsStore((state) => state._hasHydrated);
}
