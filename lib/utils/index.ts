/**
 * Utility functions
 *
 * Usage:
 * import { getPriceChangeColor, getRelativeTimeString } from '@/lib/utils';
 */

// Price utilities
export {
  getPriceChangeColor,
  getPriceChangeSign,
  getPriceChangeBgColor,
  getPriceChangeMutedBgColor,
  formatPriceChangeWithSign,
  isValidPrice,
  clamp,
} from "./priceUtils";

// Date utilities
export {
  getRelativeTimeString,
  getShortRelativeTimeString,
  formatTime,
  formatDate,
  formatDateTime,
  isOlderThan,
} from "./dateUtils";
