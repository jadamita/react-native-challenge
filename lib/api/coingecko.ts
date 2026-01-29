import type {
  ApiResult,
  PriceData,
  ChartDataPoint,
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

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded. Please wait." };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data: CoinGeckoSimplePriceResponse = await response.json();
    const now = Date.now();

    const prices: PriceData[] = Object.entries(data).map(([id, priceInfo]) => ({
      cryptoId: id,
      price: priceInfo.usd,
      priceChange24h: priceInfo.usd_24h_change ?? 0,
      marketCap: priceInfo.usd_market_cap ?? 0,
      lastUpdated: now,
    }));

    return { success: true, data: prices };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { success: false, error: "Request timed out" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error occurred" };
  }
}

/**
 * Fetch historical chart data for a specific cryptocurrency
 * @param cryptoId - CoinGecko crypto ID (e.g., "bitcoin")
 * @param timeframe - "24h" or "7d"
 */
export async function fetchChartData(
  cryptoId: string,
  timeframe: ChartTimeframe = "24h"
): Promise<ApiResult<ChartDataPoint[]>> {
  try {
    const days = timeframe === "24h" ? 1 : 7;
    const url = `${BASE_URL}/coins/${cryptoId}/market_chart?vs_currency=usd&days=${days}`;

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded. Please wait." };
      }
      if (response.status === 404) {
        return { success: false, error: `Crypto "${cryptoId}" not found` };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data: CoinGeckoMarketChartResponse = await response.json();

    // Transform [timestamp, price][] to ChartDataPoint[]
    const chartData: ChartDataPoint[] = data.prices.map(([timestamp, value]) => ({
      timestamp,
      value,
    }));

    return { success: true, data: chartData };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { success: false, error: "Request timed out" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error occurred" };
  }
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

    const response = await fetchWithTimeout(url);

    if (!response.ok) {
      if (response.status === 429) {
        return { success: false, error: "Rate limit exceeded. Please wait." };
      }
      return { success: false, error: `API error: ${response.status}` };
    }

    const data: CoinGeckoSimplePriceResponse = await response.json();

    if (!data[cryptoId]) {
      return { success: false, error: `Crypto "${cryptoId}" not found` };
    }

    const priceData: PriceData = {
      cryptoId,
      price: data[cryptoId].usd,
      priceChange24h: data[cryptoId].usd_24h_change ?? 0,
      marketCap: data[cryptoId].usd_market_cap ?? 0,
      lastUpdated: Date.now(),
    };

    return { success: true, data: priceData };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { success: false, error: "Request timed out" };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unknown error occurred" };
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
