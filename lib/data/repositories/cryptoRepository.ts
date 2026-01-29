import type {
  ApiResult,
  PriceData,
  ChartResult,
  ChartTimeframe,
} from "@/lib/types";
import type { CryptoDataSource } from "../sources/cryptoDataSource";
import { coingeckoSource } from "../sources/coingeckoSource";

/**
 * Repository for crypto data operations
 * Provides a clean interface for the app and allows swapping data sources
 */
export class CryptoRepository {
  private dataSource: CryptoDataSource;

  constructor(dataSource: CryptoDataSource = coingeckoSource) {
    this.dataSource = dataSource;
  }

  /**
   * Fetch current prices for all tracked cryptocurrencies
   */
  async getPrices(): Promise<ApiResult<PriceData[]>> {
    return this.dataSource.fetchPrices();
  }

  /**
   * Fetch price for a single cryptocurrency
   */
  async getPrice(cryptoId: string): Promise<ApiResult<PriceData>> {
    return this.dataSource.fetchSinglePrice(cryptoId);
  }

  /**
   * Fetch historical chart data with volume
   */
  async getChartData(
    cryptoId: string,
    timeframe: ChartTimeframe
  ): Promise<ApiResult<ChartResult>> {
    return this.dataSource.fetchChartData(cryptoId, timeframe);
  }

  /**
   * Check if the repository's data source has an API key configured
   */
  hasApiKey(): boolean {
    return this.dataSource.hasApiKey();
  }

  /**
   * Set a different data source (useful for testing or switching providers)
   */
  setDataSource(dataSource: CryptoDataSource): void {
    this.dataSource = dataSource;
  }
}

/**
 * Default repository instance using CoinGecko
 */
export const cryptoRepository = new CryptoRepository();
