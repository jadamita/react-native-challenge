import type { CryptoDataSource } from "./cryptoDataSource";
import type {
  ApiResult,
  PriceData,
  ChartResult,
  ChartTimeframe,
} from "@/lib/types";
import {
  fetchPrices,
  fetchSinglePrice,
  fetchChartDataWithVolume,
  hasApiKey,
} from "@/lib/api/coingecko";

/**
 * CoinGecko implementation of CryptoDataSource
 * Wraps the existing CoinGecko API functions
 */
export class CoinGeckoDataSource implements CryptoDataSource {
  async fetchPrices(): Promise<ApiResult<PriceData[]>> {
    return fetchPrices();
  }

  async fetchSinglePrice(cryptoId: string): Promise<ApiResult<PriceData>> {
    return fetchSinglePrice(cryptoId);
  }

  async fetchChartData(
    cryptoId: string,
    timeframe: ChartTimeframe
  ): Promise<ApiResult<ChartResult>> {
    return fetchChartDataWithVolume(cryptoId, timeframe);
  }

  hasApiKey(): boolean {
    return hasApiKey();
  }
}

/**
 * Default CoinGecko data source instance
 */
export const coingeckoSource = new CoinGeckoDataSource();
