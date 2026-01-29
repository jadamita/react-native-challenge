import type { Crypto } from "@/lib/types";

/**
 * Top 10 cryptocurrencies by market cap
 * IDs match CoinGecko API identifiers
 */
export const CRYPTOS: Crypto[] = [
  {
    id: "bitcoin",
    symbol: "BTC",
    name: "Bitcoin",
    color: "#F7931A", // Bitcoin orange
  },
  {
    id: "ethereum",
    symbol: "ETH",
    name: "Ethereum",
    color: "#627EEA", // Ethereum purple-blue
  },
  {
    id: "tether",
    symbol: "USDT",
    name: "Tether",
    color: "#26A17B", // Tether green
  },
  {
    id: "usd-coin",
    symbol: "USDC",
    name: "USD Coin",
    color: "#2775CA", // USDC blue
  },
  {
    id: "binancecoin",
    symbol: "BNB",
    name: "BNB",
    color: "#F3BA2F", // Binance yellow
  },
  {
    id: "ripple",
    symbol: "XRP",
    name: "XRP",
    color: "#23292F", // XRP dark
  },
  {
    id: "solana",
    symbol: "SOL",
    name: "Solana",
    color: "#9945FF", // Solana purple
  },
  {
    id: "cardano",
    symbol: "ADA",
    name: "Cardano",
    color: "#0033AD", // Cardano blue
  },
  {
    id: "dogecoin",
    symbol: "DOGE",
    name: "Dogecoin",
    color: "#C2A633", // Doge gold
  },
  {
    id: "tron",
    symbol: "TRX",
    name: "TRON",
    color: "#FF0013", // Tron red
  },
];

/**
 * Get crypto by CoinGecko ID
 */
export function getCryptoById(id: string): Crypto | undefined {
  return CRYPTOS.find((crypto) => crypto.id === id);
}

/**
 * Get crypto by symbol (case-insensitive)
 */
export function getCryptoBySymbol(symbol: string): Crypto | undefined {
  return CRYPTOS.find(
    (crypto) => crypto.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

/**
 * All crypto IDs for batch API calls
 */
export const CRYPTO_IDS = CRYPTOS.map((c) => c.id);

/**
 * Comma-separated IDs for CoinGecko API
 */
export const CRYPTO_IDS_PARAM = CRYPTO_IDS.join(",");

/**
 * Default crypto to show on app launch
 */
export const DEFAULT_CRYPTO_ID = "bitcoin";

/**
 * Price polling interval in milliseconds (30 seconds)
 * CoinGecko free tier: 30 calls/min, we use ~2 calls/min
 */
export const PRICE_POLL_INTERVAL = 30_000;

/**
 * Chart data cache duration in milliseconds (5 minutes)
 */
export const CHART_CACHE_DURATION = 5 * 60 * 1000;
