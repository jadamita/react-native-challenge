import type { PriceData, ChartDataPoint, VolumeDataPoint, ApiError } from '@/lib/types';

// Mock the API module
jest.mock('@/lib/api/coingecko', () => ({
  fetchPrices: jest.fn(),
  fetchChartDataWithVolume: jest.fn(),
}));

// Mock constants to control timing in tests
jest.mock('@/lib/constants/cryptos', () => ({
  PRICE_POLL_INTERVAL: 1000, // 1 second for testing
  CHART_CACHE_DURATION: 5000, // 5 seconds for testing
}));

import { usePriceStore, STALE_THRESHOLD } from '../priceStore';
import { fetchPrices, fetchChartDataWithVolume } from '@/lib/api/coingecko';

const mockFetchPrices = fetchPrices as jest.MockedFunction<typeof fetchPrices>;
const mockFetchChartDataWithVolume = fetchChartDataWithVolume as jest.MockedFunction<typeof fetchChartDataWithVolume>;

// Sample test data
const mockPriceData: PriceData[] = [
  {
    cryptoId: 'bitcoin',
    price: 50000,
    priceChange24h: 2.5,
    marketCap: 1000000000000,
    lastUpdated: Date.now(),
  },
  {
    cryptoId: 'ethereum',
    price: 3000,
    priceChange24h: -1.2,
    marketCap: 400000000000,
    lastUpdated: Date.now(),
  },
];

const mockChartPrices: ChartDataPoint[] = [
  { timestamp: 1000, value: 49000 },
  { timestamp: 2000, value: 49500 },
  { timestamp: 3000, value: 50000 },
];

const mockChartVolumes: VolumeDataPoint[] = [
  { timestamp: 1000, value: 1000000 },
  { timestamp: 2000, value: 1100000 },
  { timestamp: 3000, value: 1200000 },
];

const mockApiError: ApiError = {
  type: 'NETWORK',
  message: 'Network error',
  retryable: true,
};

describe('priceStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    jest.clearAllMocks();
    usePriceStore.setState({
      prices: {},
      chartCache: {},
      chartLoadingStates: {},
      isLoading: false,
      error: null,
      lastFetchTime: null,
      isPolling: false,
      consecutiveFailures: 0,
    });
  });

  describe('default values', () => {
    it('has empty prices by default', () => {
      expect(usePriceStore.getState().prices).toEqual({});
    });

    it('has empty chartCache by default', () => {
      expect(usePriceStore.getState().chartCache).toEqual({});
    });

    it('has empty chartLoadingStates by default', () => {
      expect(usePriceStore.getState().chartLoadingStates).toEqual({});
    });

    it('has isLoading false by default', () => {
      expect(usePriceStore.getState().isLoading).toBe(false);
    });

    it('has error null by default', () => {
      expect(usePriceStore.getState().error).toBeNull();
    });

    it('has lastFetchTime null by default', () => {
      expect(usePriceStore.getState().lastFetchTime).toBeNull();
    });

    it('has isPolling false by default', () => {
      expect(usePriceStore.getState().isPolling).toBe(false);
    });

    it('has consecutiveFailures 0 by default', () => {
      expect(usePriceStore.getState().consecutiveFailures).toBe(0);
    });
  });

  describe('fetchAllPrices', () => {
    it('sets loading state on first fetch', async () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      const fetchPromise = usePriceStore.getState().fetchAllPrices();
      // Check loading state immediately after call
      expect(usePriceStore.getState().isLoading).toBe(true);

      await fetchPromise;
    });

    it('updates prices on successful fetch', async () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      await usePriceStore.getState().fetchAllPrices();

      const state = usePriceStore.getState();
      expect(state.prices['bitcoin']).toEqual(mockPriceData[0]);
      expect(state.prices['ethereum']).toEqual(mockPriceData[1]);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.lastFetchTime).not.toBeNull();
      expect(state.consecutiveFailures).toBe(0);
    });

    it('sets error on failed fetch', async () => {
      mockFetchPrices.mockResolvedValue({ success: false, error: mockApiError });

      await usePriceStore.getState().fetchAllPrices();

      const state = usePriceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toEqual(mockApiError);
      expect(state.consecutiveFailures).toBe(1);
    });

    it('increments consecutiveFailures on subsequent failures', async () => {
      mockFetchPrices.mockResolvedValue({ success: false, error: mockApiError });

      await usePriceStore.getState().fetchAllPrices();
      expect(usePriceStore.getState().consecutiveFailures).toBe(1);

      await usePriceStore.getState().fetchAllPrices();
      expect(usePriceStore.getState().consecutiveFailures).toBe(2);

      await usePriceStore.getState().fetchAllPrices();
      expect(usePriceStore.getState().consecutiveFailures).toBe(3);
    });

    it('does not set loading on subsequent failures to avoid flickering', async () => {
      mockFetchPrices.mockResolvedValue({ success: false, error: mockApiError });

      // First failure - should set loading
      await usePriceStore.getState().fetchAllPrices();
      expect(usePriceStore.getState().consecutiveFailures).toBe(1);

      // Second failure - should NOT set loading immediately
      mockFetchPrices.mockResolvedValue({ success: false, error: mockApiError });
      const fetchPromise = usePriceStore.getState().fetchAllPrices();
      expect(usePriceStore.getState().isLoading).toBe(false);
      await fetchPromise;
    });

    it('resets consecutiveFailures on successful fetch after failures', async () => {
      // First, create some failures
      mockFetchPrices.mockResolvedValue({ success: false, error: mockApiError });
      await usePriceStore.getState().fetchAllPrices();
      await usePriceStore.getState().fetchAllPrices();
      expect(usePriceStore.getState().consecutiveFailures).toBe(2);

      // Now succeed
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });
      await usePriceStore.getState().fetchAllPrices();
      expect(usePriceStore.getState().consecutiveFailures).toBe(0);
    });
  });

  describe('refreshPrices', () => {
    it('always sets loading state', async () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      const refreshPromise = usePriceStore.getState().refreshPrices();
      expect(usePriceStore.getState().isLoading).toBe(true);

      await refreshPromise;
    });

    it('resets consecutiveFailures before fetching', async () => {
      // Set up some failures first
      usePriceStore.setState({ consecutiveFailures: 3 });

      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      const refreshPromise = usePriceStore.getState().refreshPrices();
      // Should be reset immediately
      expect(usePriceStore.getState().consecutiveFailures).toBe(0);

      await refreshPromise;
    });

    it('clears error before fetching', async () => {
      usePriceStore.setState({ error: mockApiError });

      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      const refreshPromise = usePriceStore.getState().refreshPrices();
      expect(usePriceStore.getState().error).toBeNull();

      await refreshPromise;
    });

    it('updates prices on successful refresh', async () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      await usePriceStore.getState().refreshPrices();

      const state = usePriceStore.getState();
      expect(state.prices['bitcoin']).toEqual(mockPriceData[0]);
      expect(state.isLoading).toBe(false);
      expect(state.lastFetchTime).not.toBeNull();
    });

    it('sets error on failed refresh', async () => {
      mockFetchPrices.mockResolvedValue({ success: false, error: mockApiError });

      await usePriceStore.getState().refreshPrices();

      const state = usePriceStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toEqual(mockApiError);
    });
  });

  describe('getChartData', () => {
    it('returns cached data when cache is fresh', async () => {
      // Pre-populate cache with fresh data
      const cacheKey = 'bitcoin-24h';
      usePriceStore.setState({
        chartCache: {
          [cacheKey]: {
            prices: mockChartPrices,
            volumes: mockChartVolumes,
            timeframe: '24h',
            fetchedAt: Date.now(), // Fresh
          },
        },
      });

      const result = await usePriceStore.getState().getChartData('bitcoin', '24h');

      expect(result.prices).toEqual(mockChartPrices);
      expect(result.volumes).toEqual(mockChartVolumes);
      expect(result.error).toBeNull();
      // Should NOT have called the API
      expect(mockFetchChartDataWithVolume).not.toHaveBeenCalled();
    });

    it('fetches new data when cache is stale', async () => {
      // Pre-populate cache with stale data
      const cacheKey = 'bitcoin-24h';
      usePriceStore.setState({
        chartCache: {
          [cacheKey]: {
            prices: mockChartPrices,
            volumes: mockChartVolumes,
            timeframe: '24h',
            fetchedAt: Date.now() - 10000, // Stale (more than 5 seconds)
          },
        },
      });

      const newPrices: ChartDataPoint[] = [{ timestamp: 4000, value: 51000 }];
      const newVolumes: VolumeDataPoint[] = [{ timestamp: 4000, value: 1300000 }];
      mockFetchChartDataWithVolume.mockResolvedValue({
        success: true,
        data: { prices: newPrices, volumes: newVolumes },
      });

      const result = await usePriceStore.getState().getChartData('bitcoin', '24h');

      expect(mockFetchChartDataWithVolume).toHaveBeenCalledWith('bitcoin', '24h');
      expect(result.prices).toEqual(newPrices);
      expect(result.volumes).toEqual(newVolumes);
      expect(result.error).toBeNull();
    });

    it('fetches new data when no cache exists', async () => {
      mockFetchChartDataWithVolume.mockResolvedValue({
        success: true,
        data: { prices: mockChartPrices, volumes: mockChartVolumes },
      });

      const result = await usePriceStore.getState().getChartData('bitcoin', '24h');

      expect(mockFetchChartDataWithVolume).toHaveBeenCalledWith('bitcoin', '24h');
      expect(result.prices).toEqual(mockChartPrices);
      expect(result.volumes).toEqual(mockChartVolumes);
    });

    it('updates chartCache after successful fetch', async () => {
      mockFetchChartDataWithVolume.mockResolvedValue({
        success: true,
        data: { prices: mockChartPrices, volumes: mockChartVolumes },
      });

      await usePriceStore.getState().getChartData('bitcoin', '24h');

      const cache = usePriceStore.getState().chartCache['bitcoin-24h'];
      expect(cache).toBeDefined();
      expect(cache.prices).toEqual(mockChartPrices);
      expect(cache.volumes).toEqual(mockChartVolumes);
      expect(cache.timeframe).toBe('24h');
      expect(cache.fetchedAt).toBeGreaterThan(0);
    });

    it('sets loading state during fetch', async () => {
      let resolvePromise: (value: any) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetchChartDataWithVolume.mockReturnValue(fetchPromise as any);

      const getChartPromise = usePriceStore.getState().getChartData('bitcoin', '24h');

      // Should be loading
      expect(usePriceStore.getState().chartLoadingStates['bitcoin-24h']).toEqual({
        isLoading: true,
        error: null,
      });

      // Resolve the fetch
      resolvePromise!({
        success: true,
        data: { prices: mockChartPrices, volumes: mockChartVolumes },
      });

      await getChartPromise;

      // Should no longer be loading
      expect(usePriceStore.getState().chartLoadingStates['bitcoin-24h']).toEqual({
        isLoading: false,
        error: null,
      });
    });

    it('returns cached data on fetch failure when cache exists', async () => {
      // Pre-populate cache with stale data
      const cacheKey = 'bitcoin-24h';
      usePriceStore.setState({
        chartCache: {
          [cacheKey]: {
            prices: mockChartPrices,
            volumes: mockChartVolumes,
            timeframe: '24h',
            fetchedAt: Date.now() - 10000, // Stale
          },
        },
      });

      mockFetchChartDataWithVolume.mockResolvedValue({
        success: false,
        error: mockApiError,
      });

      const result = await usePriceStore.getState().getChartData('bitcoin', '24h');

      // Should return cached data with error
      expect(result.prices).toEqual(mockChartPrices);
      expect(result.volumes).toEqual(mockChartVolumes);
      expect(result.error).toEqual(mockApiError);
    });

    it('returns empty arrays on fetch failure when no cache exists', async () => {
      mockFetchChartDataWithVolume.mockResolvedValue({
        success: false,
        error: mockApiError,
      });

      const result = await usePriceStore.getState().getChartData('bitcoin', '24h');

      expect(result.prices).toEqual([]);
      expect(result.volumes).toEqual([]);
      expect(result.error).toEqual(mockApiError);
    });

    it('sets error in loading state on failure', async () => {
      mockFetchChartDataWithVolume.mockResolvedValue({
        success: false,
        error: mockApiError,
      });

      await usePriceStore.getState().getChartData('bitcoin', '24h');

      expect(usePriceStore.getState().chartLoadingStates['bitcoin-24h']).toEqual({
        isLoading: false,
        error: mockApiError,
      });
    });

    it('handles different timeframes with separate cache entries', async () => {
      mockFetchChartDataWithVolume.mockResolvedValue({
        success: true,
        data: { prices: mockChartPrices, volumes: mockChartVolumes },
      });

      await usePriceStore.getState().getChartData('bitcoin', '24h');
      await usePriceStore.getState().getChartData('bitcoin', '7d');

      const cache = usePriceStore.getState().chartCache;
      expect(cache['bitcoin-24h']).toBeDefined();
      expect(cache['bitcoin-7d']).toBeDefined();
    });
  });

  describe('startPolling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      usePriceStore.getState().stopPolling();
      jest.useRealTimers();
    });

    it('sets isPolling to true', () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      usePriceStore.getState().startPolling();

      expect(usePriceStore.getState().isPolling).toBe(true);
    });

    it('fetches prices immediately', () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      usePriceStore.getState().startPolling();

      expect(mockFetchPrices).toHaveBeenCalledTimes(1);
    });

    it('does not restart if already polling', () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      usePriceStore.getState().startPolling();
      usePriceStore.getState().startPolling();
      usePriceStore.getState().startPolling();

      // Should only have called fetch once (from initial startPolling)
      expect(mockFetchPrices).toHaveBeenCalledTimes(1);
    });

    it('fetches prices at interval', async () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      usePriceStore.getState().startPolling();
      expect(mockFetchPrices).toHaveBeenCalledTimes(1);

      // Advance timer by polling interval (1 second in tests)
      jest.advanceTimersByTime(1000);
      expect(mockFetchPrices).toHaveBeenCalledTimes(2);

      jest.advanceTimersByTime(1000);
      expect(mockFetchPrices).toHaveBeenCalledTimes(3);
    });
  });

  describe('stopPolling', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('sets isPolling to false', () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      usePriceStore.getState().startPolling();
      expect(usePriceStore.getState().isPolling).toBe(true);

      usePriceStore.getState().stopPolling();
      expect(usePriceStore.getState().isPolling).toBe(false);
    });

    it('stops the polling interval', () => {
      mockFetchPrices.mockResolvedValue({ success: true, data: mockPriceData });

      usePriceStore.getState().startPolling();
      expect(mockFetchPrices).toHaveBeenCalledTimes(1);

      usePriceStore.getState().stopPolling();

      // Advance time - should NOT call fetch again
      jest.advanceTimersByTime(5000);
      expect(mockFetchPrices).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearError', () => {
    it('clears the error state', () => {
      usePriceStore.setState({ error: mockApiError });
      expect(usePriceStore.getState().error).toEqual(mockApiError);

      usePriceStore.getState().clearError();

      expect(usePriceStore.getState().error).toBeNull();
    });
  });

  describe('clearChartCache', () => {
    it('clears the chart cache', () => {
      usePriceStore.setState({
        chartCache: {
          'bitcoin-24h': {
            prices: mockChartPrices,
            volumes: mockChartVolumes,
            timeframe: '24h',
            fetchedAt: Date.now(),
          },
        },
        chartLoadingStates: {
          'bitcoin-24h': { isLoading: false, error: null },
        },
      });

      expect(Object.keys(usePriceStore.getState().chartCache)).toHaveLength(1);

      usePriceStore.getState().clearChartCache();

      expect(usePriceStore.getState().chartCache).toEqual({});
      expect(usePriceStore.getState().chartLoadingStates).toEqual({});
    });
  });

  describe('cache eviction', () => {
    it('evicts oldest entries when cache exceeds max size', async () => {
      // Fill the cache with 20 entries (max size)
      const initialCache: Record<string, any> = {};
      for (let i = 0; i < 20; i++) {
        initialCache[`crypto${i}-24h`] = {
          prices: mockChartPrices,
          volumes: mockChartVolumes,
          timeframe: '24h',
          fetchedAt: 1000 + i * 100, // Incrementing timestamps
        };
      }
      usePriceStore.setState({ chartCache: initialCache });
      expect(Object.keys(usePriceStore.getState().chartCache)).toHaveLength(20);

      // Add one more entry - should evict the oldest
      mockFetchChartDataWithVolume.mockResolvedValue({
        success: true,
        data: { prices: mockChartPrices, volumes: mockChartVolumes },
      });

      await usePriceStore.getState().getChartData('newcrypto', '24h');

      const cache = usePriceStore.getState().chartCache;
      expect(Object.keys(cache)).toHaveLength(20);
      // The oldest entry (crypto0-24h with fetchedAt: 1000) should be evicted
      expect(cache['crypto0-24h']).toBeUndefined();
      // The new entry should exist
      expect(cache['newcrypto-24h']).toBeDefined();
    });

    it('does not evict when cache is under max size', async () => {
      // Fill cache with 5 entries (under max)
      const initialCache: Record<string, any> = {};
      for (let i = 0; i < 5; i++) {
        initialCache[`crypto${i}-24h`] = {
          prices: mockChartPrices,
          volumes: mockChartVolumes,
          timeframe: '24h',
          fetchedAt: 1000 + i * 100,
        };
      }
      usePriceStore.setState({ chartCache: initialCache });

      mockFetchChartDataWithVolume.mockResolvedValue({
        success: true,
        data: { prices: mockChartPrices, volumes: mockChartVolumes },
      });

      await usePriceStore.getState().getChartData('newcrypto', '24h');

      const cache = usePriceStore.getState().chartCache;
      expect(Object.keys(cache)).toHaveLength(6);
      // All entries should still exist
      expect(cache['crypto0-24h']).toBeDefined();
      expect(cache['newcrypto-24h']).toBeDefined();
    });
  });

  describe('STALE_THRESHOLD constant', () => {
    it('is 2 minutes in milliseconds', () => {
      expect(STALE_THRESHOLD).toBe(2 * 60 * 1000);
    });
  });

  describe('price selector logic (usePrice)', () => {
    it('returns undefined when price does not exist', () => {
      const state = usePriceStore.getState();
      const result = state.prices['nonexistent'];
      expect(result).toBeUndefined();
    });

    it('returns the price data for a crypto', () => {
      usePriceStore.setState({
        prices: {
          bitcoin: mockPriceData[0],
        },
      });

      const state = usePriceStore.getState();
      expect(state.prices['bitcoin']).toEqual(mockPriceData[0]);
    });
  });

  describe('prices array logic (usePricesArray)', () => {
    it('returns empty array when no prices', () => {
      const state = usePriceStore.getState();
      const result = Object.values(state.prices);
      expect(result).toEqual([]);
    });

    it('returns all prices as an array', () => {
      usePriceStore.setState({
        prices: {
          bitcoin: mockPriceData[0],
          ethereum: mockPriceData[1],
        },
      });

      const state = usePriceStore.getState();
      const result = Object.values(state.prices);
      expect(result).toHaveLength(2);
      expect(result).toContainEqual(mockPriceData[0]);
      expect(result).toContainEqual(mockPriceData[1]);
    });
  });

  describe('stale data logic (useIsDataStale)', () => {
    it('returns false when lastFetchTime is null', () => {
      usePriceStore.setState({ lastFetchTime: null });

      const state = usePriceStore.getState();
      const isStale = state.lastFetchTime ? Date.now() - state.lastFetchTime > STALE_THRESHOLD : false;
      expect(isStale).toBe(false);
    });

    it('returns false when data is fresh', () => {
      usePriceStore.setState({ lastFetchTime: Date.now() });

      const state = usePriceStore.getState();
      const isStale = state.lastFetchTime ? Date.now() - state.lastFetchTime > STALE_THRESHOLD : false;
      expect(isStale).toBe(false);
    });

    it('returns true when data is stale', () => {
      // Set lastFetchTime to more than 2 minutes ago
      usePriceStore.setState({ lastFetchTime: Date.now() - STALE_THRESHOLD - 1000 });

      const state = usePriceStore.getState();
      const isStale = state.lastFetchTime ? Date.now() - state.lastFetchTime > STALE_THRESHOLD : false;
      expect(isStale).toBe(true);
    });
  });

  describe('chart loading state logic (useChartLoadingState)', () => {
    it('returns default state when no loading state exists', () => {
      const state = usePriceStore.getState();
      const cacheKey = 'bitcoin-24h';
      const result = state.chartLoadingStates[cacheKey] ?? { isLoading: false, error: null };
      expect(result).toEqual({ isLoading: false, error: null });
    });

    it('returns the loading state for a chart', () => {
      usePriceStore.setState({
        chartLoadingStates: {
          'bitcoin-24h': { isLoading: true, error: null },
        },
      });

      const state = usePriceStore.getState();
      expect(state.chartLoadingStates['bitcoin-24h']).toEqual({ isLoading: true, error: null });
    });

    it('returns error state when present', () => {
      usePriceStore.setState({
        chartLoadingStates: {
          'bitcoin-24h': { isLoading: false, error: mockApiError },
        },
      });

      const state = usePriceStore.getState();
      expect(state.chartLoadingStates['bitcoin-24h']).toEqual({ isLoading: false, error: mockApiError });
    });
  });

  describe('consecutive failures logic (useConsecutiveFailures)', () => {
    it('returns 0 by default', () => {
      const state = usePriceStore.getState();
      expect(state.consecutiveFailures).toBe(0);
    });

    it('returns the consecutive failure count', () => {
      usePriceStore.setState({ consecutiveFailures: 5 });

      const state = usePriceStore.getState();
      expect(state.consecutiveFailures).toBe(5);
    });
  });
});
