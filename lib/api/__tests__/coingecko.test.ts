import {
  formatPrice,
  formatPercentChange,
  formatVolume,
  getErrorIcon,
  isRetryableError,
  getErrorMessage,
  fetchPrices,
  fetchSinglePrice,
} from '../coingecko';
import type { ApiError } from '@/lib/types';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('coingecko API', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe('formatPrice', () => {
    it('formats prices >= $1 with 2 decimal places', () => {
      expect(formatPrice(100)).toBe('$100.00');
      expect(formatPrice(1234.56)).toBe('$1,234.56');
      expect(formatPrice(50000)).toBe('$50,000.00');
    });

    it('formats prices < $1 with more decimal places', () => {
      expect(formatPrice(0.5)).toMatch(/\$0\.5/);
      expect(formatPrice(0.0001)).toMatch(/\$0\.0001/);
      expect(formatPrice(0.00001234)).toMatch(/\$0\.00001/);
    });

    it('handles edge cases', () => {
      expect(formatPrice(0)).toBe('$0.0000');
      expect(formatPrice(1)).toBe('$1.00');
      expect(formatPrice(0.99)).toMatch(/\$0\.99/);
    });

    it('handles very large prices', () => {
      expect(formatPrice(1000000)).toBe('$1,000,000.00');
      expect(formatPrice(99999.99)).toBe('$99,999.99');
    });
  });

  describe('formatPercentChange', () => {
    it('formats positive changes with + sign', () => {
      expect(formatPercentChange(5.5)).toBe('+5.50%');
      expect(formatPercentChange(100)).toBe('+100.00%');
      expect(formatPercentChange(0.01)).toBe('+0.01%');
    });

    it('formats negative changes with - sign', () => {
      expect(formatPercentChange(-5.5)).toBe('-5.50%');
      expect(formatPercentChange(-100)).toBe('-100.00%');
      expect(formatPercentChange(-0.01)).toBe('-0.01%');
    });

    it('formats zero with + sign', () => {
      expect(formatPercentChange(0)).toBe('+0.00%');
    });

    it('rounds to 2 decimal places', () => {
      expect(formatPercentChange(1.234)).toBe('+1.23%');
      expect(formatPercentChange(1.235)).toBe('+1.24%');
      expect(formatPercentChange(-1.999)).toBe('-2.00%');
    });
  });

  describe('formatVolume', () => {
    it('formats billions', () => {
      expect(formatVolume(1_000_000_000)).toBe('$1.0B');
      expect(formatVolume(5_500_000_000)).toBe('$5.5B');
      expect(formatVolume(100_000_000_000)).toBe('$100.0B');
    });

    it('formats millions', () => {
      expect(formatVolume(1_000_000)).toBe('$1.0M');
      expect(formatVolume(500_000_000)).toBe('$500.0M');
      expect(formatVolume(999_999_999)).toBe('$1000.0M');
    });

    it('formats thousands', () => {
      expect(formatVolume(1_000)).toBe('$1.0K');
      expect(formatVolume(50_000)).toBe('$50.0K');
      expect(formatVolume(999_999)).toBe('$1000.0K');
    });

    it('formats small values', () => {
      expect(formatVolume(999)).toBe('$999');
      expect(formatVolume(100)).toBe('$100');
      expect(formatVolume(0)).toBe('$0');
    });
  });

  describe('getErrorIcon', () => {
    it('returns correct icon for NETWORK errors', () => {
      const error: ApiError = { type: 'NETWORK', message: 'test', retryable: true };
      expect(getErrorIcon(error)).toBe('📡');
    });

    it('returns correct icon for TIMEOUT errors', () => {
      const error: ApiError = { type: 'TIMEOUT', message: 'test', retryable: true };
      expect(getErrorIcon(error)).toBe('⏱️');
    });

    it('returns correct icon for RATE_LIMIT errors', () => {
      const error: ApiError = { type: 'RATE_LIMIT', message: 'test', retryable: true };
      expect(getErrorIcon(error)).toBe('🚦');
    });

    it('returns correct icon for SERVER_ERROR errors', () => {
      const error: ApiError = { type: 'SERVER_ERROR', message: 'test', retryable: true };
      expect(getErrorIcon(error)).toBe('🔧');
    });

    it('returns default icon for other errors', () => {
      const error: ApiError = { type: 'UNKNOWN', message: 'test', retryable: true };
      expect(getErrorIcon(error)).toBe('⚠️');
    });
  });

  describe('isRetryableError', () => {
    it('returns true for retryable errors', () => {
      const error: ApiError = { type: 'NETWORK', message: 'test', retryable: true };
      expect(isRetryableError(error)).toBe(true);
    });

    it('returns false for non-retryable errors', () => {
      const error: ApiError = { type: 'NOT_FOUND', message: 'test', retryable: false };
      expect(isRetryableError(error)).toBe(false);
    });
  });

  describe('getErrorMessage', () => {
    it('returns the error message', () => {
      const error: ApiError = { type: 'NETWORK', message: 'Custom error message', retryable: true };
      expect(getErrorMessage(error)).toBe('Custom error message');
    });
  });

  describe('fetchPrices', () => {
    it('returns prices on successful response', async () => {
      const mockResponse = {
        bitcoin: { usd: 50000, usd_24h_change: 5.5, usd_market_cap: 1000000000000 },
        ethereum: { usd: 3000, usd_24h_change: -2.1, usd_market_cap: 350000000000 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchPrices();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0].cryptoId).toBe('bitcoin');
        expect(result.data[0].price).toBe(50000);
        expect(result.data[0].priceChange24h).toBe(5.5);
        expect(result.data[1].cryptoId).toBe('ethereum');
      }
    });

    it('returns error on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await fetchPrices();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NETWORK');
        expect(result.error.retryable).toBe(true);
      }
    });

    it('returns error on 429 rate limit', async () => {
      // Mock all retry attempts (initial + 3 retries = 4 calls)
      const errorResponse = { ok: false, status: 429 };
      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse);

      const result = await fetchPrices();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('RATE_LIMIT');
        expect(result.error.retryable).toBe(true);
      }
    }, 30000);

    it('returns error on 500 server error', async () => {
      // Mock all retry attempts (initial + 3 retries = 4 calls)
      const errorResponse = { ok: false, status: 500 };
      mockFetch
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse)
        .mockResolvedValueOnce(errorResponse);

      const result = await fetchPrices();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SERVER_ERROR');
        expect(result.error.retryable).toBe(true);
      }
    }, 30000);

    it('filters out invalid price data', async () => {
      const mockResponse = {
        bitcoin: { usd: 50000, usd_24h_change: 5.5, usd_market_cap: 1000000000000 },
        invalid: { usd: -100, usd_24h_change: 0, usd_market_cap: 0 }, // Invalid negative price
        broken: { usd: NaN, usd_24h_change: 0, usd_market_cap: 0 }, // Invalid NaN
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchPrices();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].cryptoId).toBe('bitcoin');
      }
    });

    it('returns error when all prices are invalid', async () => {
      const mockResponse = {
        broken: { usd: -100, usd_24h_change: 0, usd_market_cap: 0 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchPrices();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('PARSE_ERROR');
      }
    });

    it('returns error on empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await fetchPrices();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('PARSE_ERROR');
      }
    });
  });

  describe('fetchSinglePrice', () => {
    it('returns price for valid crypto', async () => {
      const mockResponse = {
        bitcoin: { usd: 50000, usd_24h_change: 5.5, usd_market_cap: 1000000000000 },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchSinglePrice('bitcoin');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.cryptoId).toBe('bitcoin');
        expect(result.data.price).toBe(50000);
      }
    });

    it('returns NOT_FOUND error for unknown crypto', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await fetchSinglePrice('unknown-coin');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('NOT_FOUND');
        expect(result.error.retryable).toBe(false);
      }
    });
  });
});
