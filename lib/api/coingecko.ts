import type {
  ApiResult,
  ApiError,
  ApiErrorType,
  PriceData,
  ChartDataPoint,
  VolumeDataPoint,
  ChartResult,
  ChartTimeframe,
  CoinGeckoSimplePriceResponse,
  CoinGeckoMarketChartResponse,
} from "@/lib/types";
import { CRYPTO_IDS_PARAM } from "@/lib/constants/cryptos";

const BASE_URL = "https://api.coingecko.com/api/v3";

/**
 * API key from environment variable (optional)
 * Get a free Demo key at: https://www.coingecko.com/en/api/pricing
 */
const API_KEY = process.env.EXPO_PUBLIC_COINGECKO_API_KEY;

/**
 * Default timeout for API requests (10 seconds)
 */
const REQUEST_TIMEOUT = 10_000;

/**
 * Retry configuration
 */
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

/**
 * Create a structured API error
 */
function createApiError(
  type: ApiErrorType,
  message: string,
  retryable = false
): ApiError {
  return { type, message, retryable };
}

/**
 * Parse error from response or exception
 */
function parseError(error: unknown, response?: Response): ApiError {
  // Handle HTTP response errors
  if (response) {
    const status = response.status;

    if (status === 429) {
      return createApiError(
        "RATE_LIMIT",
        "Rate limit exceeded. Please wait a moment and try again.",
        true
      );
    }
    if (status === 404) {
      return createApiError("NOT_FOUND", "Resource not found.", false);
    }
    if (status >= 500) {
      return createApiError(
        "SERVER_ERROR",
        "Server error. Please try again later.",
        true
      );
    }
    return createApiError("UNKNOWN", `Request failed with status ${status}`, true);
  }

  // Handle exceptions
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return createApiError(
        "TIMEOUT",
        "Request timed out. Check your connection and try again.",
        true
      );
    }

    // Network errors (no internet, DNS failure, etc.)
    if (
      error.message.includes("Network request failed") ||
      error.message.includes("Failed to fetch") ||
      error.message.includes("fetch failed") ||
      error.name === "TypeError"
    ) {
      return createApiError(
        "NETWORK",
        "Unable to connect. Check your internet connection.",
        true
      );
    }

    // JSON parsing errors
    if (error instanceof SyntaxError) {
      return createApiError(
        "PARSE_ERROR",
        "Invalid response from server.",
        true
      );
    }

    return createApiError("UNKNOWN", error.message, true);
  }

  return createApiError("UNKNOWN", "An unexpected error occurred.", true);
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = MAX_RETRIES
): Promise<Response> {
  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      // Don't retry client errors (except rate limit)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return response;
      }

      // Retry on rate limit and server errors
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }

      return response;
    } catch (error) {
      lastError = parseError(error);

      // Only retry on retryable errors
      if (!lastError.retryable || attempt >= maxRetries) {
        throw error;
      }

      const delay = INITIAL_RETRY_DELAY * Math.pow(2, attempt);
      await sleep(delay);
    }
  }

  throw new Error(lastError?.message || "Max retries exceeded");
}

/**
 * Get headers for API requests
 * Includes API key if configured
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (API_KEY) {
    headers["x-cg-demo-api-key"] = API_KEY;
  }

  return headers;
}

/**
 * Fetch with timeout wrapper
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getHeaders(),
        ...options.headers,
      },
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check if API key is configured
 */
export function hasApiKey(): boolean {
  return Boolean(API_KEY);
}

/**
 * Fetch current prices for all tracked cryptocurrencies
 * Uses /simple/price endpoint for efficient batch fetching
 */
export async function fetchPrices(): Promise<ApiResult<PriceData[]>> {
  try {
    const url = `${BASE_URL}/simple/price?ids=${CRYPTO_IDS_PARAM}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      return { success: false, error: parseError(null, response) };
    }

    const data: CoinGeckoSimplePriceResponse = await response.json();
    const now = Date.now();

    // Validate response data
    if (!data || typeof data !== "object" || Object.keys(data).length === 0) {
      return {
        success: false,
        error: createApiError("PARSE_ERROR", "Empty or invalid price data received.", true),
      };
    }

    const prices: PriceData[] = Object.entries(data).map(([id, priceInfo]) => ({
      cryptoId: id,
      price: priceInfo?.usd ?? 0,
      priceChange24h: priceInfo?.usd_24h_change ?? 0,
      marketCap: priceInfo?.usd_market_cap ?? 0,
      lastUpdated: now,
    }));

    // Filter out any invalid entries
    const validPrices = prices.filter(
      (p) => p.price > 0 && isFinite(p.price) && !isNaN(p.price)
    );

    if (validPrices.length === 0) {
      return {
        success: false,
        error: createApiError("PARSE_ERROR", "No valid price data received.", true),
      };
    }

    return { success: true, data: validPrices };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

/**
 * Convert timeframe to days parameter for CoinGecko API
 */
function timeframeToDays(timeframe: ChartTimeframe): string {
  switch (timeframe) {
    case "1h":
      return "1"; // API returns hourly data for 1 day, we'll filter to 1h
    case "24h":
      return "1";
    case "7d":
      return "7";
    case "30d":
      return "30";
    case "90d":
      return "90";
    case "1y":
      return "365";
    default:
      return "1";
  }
}

/**
 * Fetch historical chart data with volume for a specific cryptocurrency
 * @param cryptoId - CoinGecko crypto ID (e.g., "bitcoin")
 * @param timeframe - Chart timeframe
 */
export async function fetchChartDataWithVolume(
  cryptoId: string,
  timeframe: ChartTimeframe = "24h"
): Promise<ApiResult<ChartResult>> {
  try {
    const days = timeframeToDays(timeframe);
    const url = `${BASE_URL}/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`;

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      if (response.status === 404) {
        return {
          success: false,
          error: createApiError("NOT_FOUND", `Crypto "${cryptoId}" not found.`, false),
        };
      }
      return { success: false, error: parseError(null, response) };
    }

    const data: CoinGeckoMarketChartResponse = await response.json();

    // Validate response data
    if (!data?.prices || !Array.isArray(data.prices)) {
      return {
        success: false,
        error: createApiError("PARSE_ERROR", "Invalid chart data format.", true),
      };
    }

    // For 1h timeframe, filter to last hour of data
    let pricesData = data.prices;
    let volumesData = data.total_volumes || [];

    if (timeframe === "1h") {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      pricesData = pricesData.filter(([timestamp]) => timestamp >= oneHourAgo);
      volumesData = volumesData.filter(([timestamp]) => timestamp >= oneHourAgo);
    }

    // Transform and validate prices
    const prices: ChartDataPoint[] = pricesData
      .filter(
        ([timestamp, value]) =>
          typeof timestamp === "number" &&
          typeof value === "number" &&
          isFinite(value) &&
          !isNaN(value) &&
          value > 0
      )
      .map(([timestamp, value]) => ({
        timestamp,
        value,
      }));

    // Transform and validate volumes
    const volumes: VolumeDataPoint[] = volumesData
      .filter(
        ([timestamp, value]) =>
          typeof timestamp === "number" &&
          typeof value === "number" &&
          isFinite(value) &&
          !isNaN(value) &&
          value >= 0
      )
      .map(([timestamp, value]) => ({
        timestamp,
        value,
      }));

    if (prices.length === 0) {
      return {
        success: false,
        error: createApiError("PARSE_ERROR", "No valid chart data available.", true),
      };
    }

    return { success: true, data: { prices, volumes } };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

/**
 * Fetch historical chart data for a specific cryptocurrency (legacy, prices only)
 * @param cryptoId - CoinGecko crypto ID (e.g., "bitcoin")
 * @param timeframe - Chart timeframe
 */
export async function fetchChartData(
  cryptoId: string,
  timeframe: ChartTimeframe = "24h"
): Promise<ApiResult<ChartDataPoint[]>> {
  const result = await fetchChartDataWithVolume(cryptoId, timeframe);
  if (result.success) {
    return { success: true, data: result.data.prices };
  }
  return result;
}

/**
 * Fetch price for a single cryptocurrency
 * Useful for targeted updates
 */
export async function fetchSinglePrice(
  cryptoId: string
): Promise<ApiResult<PriceData>> {
  try {
    const url = `${BASE_URL}/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;

    const response = await fetchWithRetry(url);

    if (!response.ok) {
      return { success: false, error: parseError(null, response) };
    }

    const data: CoinGeckoSimplePriceResponse = await response.json();

    if (!data[cryptoId]) {
      return {
        success: false,
        error: createApiError("NOT_FOUND", `Crypto "${cryptoId}" not found.`, false),
      };
    }

    const price = data[cryptoId]?.usd;
    if (typeof price !== "number" || !isFinite(price) || isNaN(price)) {
      return {
        success: false,
        error: createApiError("PARSE_ERROR", "Invalid price data received.", true),
      };
    }

    const priceData: PriceData = {
      cryptoId,
      price,
      priceChange24h: data[cryptoId].usd_24h_change ?? 0,
      marketCap: data[cryptoId].usd_market_cap ?? 0,
      lastUpdated: Date.now(),
    };

    return { success: true, data: priceData };
  } catch (error) {
    return { success: false, error: parseError(error) };
  }
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  if (price >= 1) {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  // For small prices (like DOGE), show more decimals
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

/**
 * Format percentage change for display
 */
export function formatPercentChange(change: number): string {
  const sign = change >= 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * Format volume for display (compact notation)
 */
export function formatVolume(volume: number): string {
  if (volume >= 1_000_000_000) {
    return `$${(volume / 1_000_000_000).toFixed(1)}B`;
  }
  if (volume >= 1_000_000) {
    return `$${(volume / 1_000_000).toFixed(1)}M`;
  }
  if (volume >= 1_000) {
    return `$${(volume / 1_000).toFixed(1)}K`;
  }
  return `$${volume.toFixed(0)}`;
}

/**
 * Get user-friendly error message from ApiError
 */
export function getErrorMessage(error: ApiError): string {
  return error.message;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: ApiError): boolean {
  return error.retryable;
}

/**
 * Get icon for error type (for UI display)
 */
export function getErrorIcon(error: ApiError): string {
  switch (error.type) {
    case "NETWORK":
      return "📡";
    case "TIMEOUT":
      return "⏱️";
    case "RATE_LIMIT":
      return "🚦";
    case "SERVER_ERROR":
      return "🔧";
    default:
      return "⚠️";
  }
}
