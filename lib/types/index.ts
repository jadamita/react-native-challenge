/**
 * Core cryptocurrency definition
 */
export interface Crypto {
  id: string; // CoinGecko API ID (e.g., "bitcoin")
  symbol: string; // Ticker symbol (e.g., "BTC")
  name: string; // Full name (e.g., "Bitcoin")
  color: string; // Brand color for UI
}

/**
 * Current price data for a cryptocurrency
 */
export interface PriceData {
  cryptoId: string;
  price: number; // Current USD price
  priceChange24h: number; // 24h percentage change
  marketCap: number; // Market cap in USD
  lastUpdated: number; // Unix timestamp (ms)
}

/**
 * Chart data point format for react-native-wagmi-charts
 */
export interface ChartDataPoint {
  timestamp: number; // Unix timestamp (ms)
  value: number; // Price in USD
}

/**
 * User-created price alert
 */
export interface Alert {
  id: string; // Unique alert ID
  cryptoId: string; // Which crypto this alert is for
  type: "above" | "below"; // Trigger when price goes above or below
  threshold: number; // Target price in USD
  createdAt: number; // Unix timestamp (ms)
}

/**
 * Alert that has been triggered
 */
export interface TriggeredAlert {
  id: string; // Unique triggered alert ID
  alert: Alert; // The original alert configuration
  triggeredPrice: number; // Price when alert was triggered
  triggeredAt: number; // Unix timestamp (ms) when triggered
  viewed: boolean; // Has user seen this in alerts screen
}

/**
 * Price store state
 */
export interface PriceStoreState {
  prices: Record<string, PriceData>; // Keyed by cryptoId
  chartData: Record<string, ChartDataPoint[]>; // Keyed by cryptoId
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
}

/**
 * Alert store state
 */
export interface AlertStoreState {
  activeAlerts: Alert[]; // Alerts waiting to trigger
  triggeredAlerts: TriggeredAlert[]; // Alerts that have fired
  unviewedCount: number; // Badge count for UI
}

/**
 * CoinGecko API response types
 */
export interface CoinGeckoSimplePriceResponse {
  [coinId: string]: {
    usd: number;
    usd_24h_change: number;
    usd_market_cap: number;
  };
}

export interface CoinGeckoMarketChartResponse {
  prices: [number, number][]; // [timestamp, price][]
}

/**
 * Chart timeframe options
 */
export type ChartTimeframe = "24h" | "7d";

/**
 * Error categories for better error handling
 */
export type ApiErrorType =
  | "NETWORK" // No internet connection or DNS failure
  | "TIMEOUT" // Request timed out
  | "RATE_LIMIT" // 429 - Too many requests
  | "NOT_FOUND" // 404 - Resource not found
  | "SERVER_ERROR" // 5xx errors
  | "PARSE_ERROR" // JSON parsing failed
  | "UNKNOWN"; // Catch-all for unexpected errors

/**
 * Structured API error with type and message
 */
export interface ApiError {
  type: ApiErrorType;
  message: string;
  retryable: boolean;
}

/**
 * API fetch result with error handling
 */
export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

/**
 * Connection status for network monitoring
 */
export type ConnectionStatus = "online" | "offline" | "checking";
