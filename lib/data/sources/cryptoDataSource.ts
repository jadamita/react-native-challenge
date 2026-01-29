import type {
  ApiResult,
  PriceData,
  ChartDataPoint,
  ChartResult,
  ChartTimeframe,
} from "@/lib/types";

/**
 * Interface for crypto data sources
 * Allows swapping between different API providers (CoinGecko, CoinMarketCap, etc.)
 */
export interface CryptoDataSource {
  /**
   * Fetch current prices for all tracked cryptocurrencies
   */
  fetchPrices(): Promise<ApiResult<PriceData[]>>;

  /**
   * Fetch price for a single cryptocurrency
   */
  fetchSinglePrice(cryptoId: string): Promise<ApiResult<PriceData>>;

  /**
   * Fetch historical chart data with volume
   */
  fetchChartData(
    cryptoId: string,
    timeframe: ChartTimeframe
  ): Promise<ApiResult<ChartResult>>;

  /**
   * Check if the data source has an API key configured
   */
  hasApiKey(): boolean;
}
