import { useSettingsStore } from '../settingsStore';

describe('settingsStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    useSettingsStore.setState({
      showVolumeChart: false,
      isDarkMode: true,
      _hasHydrated: false,
    });
  });

  describe('default values', () => {
    it('has showVolumeChart defaulted to false', () => {
      expect(useSettingsStore.getState().showVolumeChart).toBe(false);
    });

    it('has isDarkMode defaulted to true', () => {
      expect(useSettingsStore.getState().isDarkMode).toBe(true);
    });

    it('has _hasHydrated defaulted to false', () => {
      expect(useSettingsStore.getState()._hasHydrated).toBe(false);
    });
  });

  describe('setShowVolumeChart', () => {
    it('sets showVolumeChart to true', () => {
      useSettingsStore.getState().setShowVolumeChart(true);
      expect(useSettingsStore.getState().showVolumeChart).toBe(true);
    });

    it('sets showVolumeChart to false', () => {
      useSettingsStore.setState({ showVolumeChart: true });
      useSettingsStore.getState().setShowVolumeChart(false);
      expect(useSettingsStore.getState().showVolumeChart).toBe(false);
    });

    it('toggles showVolumeChart', () => {
      const initial = useSettingsStore.getState().showVolumeChart;
      useSettingsStore.getState().setShowVolumeChart(!initial);
      expect(useSettingsStore.getState().showVolumeChart).toBe(!initial);
    });
  });

  describe('setIsDarkMode', () => {
    it('sets isDarkMode to false (light mode)', () => {
      useSettingsStore.getState().setIsDarkMode(false);
      expect(useSettingsStore.getState().isDarkMode).toBe(false);
    });

    it('sets isDarkMode to true (dark mode)', () => {
      useSettingsStore.setState({ isDarkMode: false });
      useSettingsStore.getState().setIsDarkMode(true);
      expect(useSettingsStore.getState().isDarkMode).toBe(true);
    });
  });

  describe('hydration', () => {
    it('sets hydration state to true', () => {
      useSettingsStore.getState().setHasHydrated(true);
      expect(useSettingsStore.getState()._hasHydrated).toBe(true);
    });

    it('sets hydration state to false', () => {
      useSettingsStore.setState({ _hasHydrated: true });
      useSettingsStore.getState().setHasHydrated(false);
      expect(useSettingsStore.getState()._hasHydrated).toBe(false);
    });
  });
});
