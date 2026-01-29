/**
 * Data layer - repositories and data sources
 *
 * The data layer provides a clean abstraction over data fetching:
 * - Sources: Low-level implementations (CoinGecko, etc.)
 * - Repositories: High-level interfaces for the app
 *
 * Usage:
 * import { cryptoRepository } from '@/lib/data';
 * const prices = await cryptoRepository.getPrices();
 */

// Repositories
export { CryptoRepository, cryptoRepository } from "./repositories";

// Sources (for advanced usage or testing)
export type { CryptoDataSource } from "./sources";
export { CoinGeckoDataSource, coingeckoSource } from "./sources";
