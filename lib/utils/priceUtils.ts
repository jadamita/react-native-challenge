/**
 * Price-related utility functions
 */

/**
 * Get Tailwind color class for price change
 */
export function getPriceChangeColor(change: number): string {
  return change >= 0 ? "text-crypto-green" : "text-crypto-red";
}

/**
 * Get sign prefix for price change
 */
export function getPriceChangeSign(change: number): string {
  return change >= 0 ? "+" : "";
}

/**
 * Get background color class for positive/negative changes
 */
export function getPriceChangeBgColor(change: number): string {
  return change >= 0 ? "bg-crypto-green" : "bg-crypto-red";
}

/**
 * Get muted background color for positive/negative changes
 */
export function getPriceChangeMutedBgColor(change: number): string {
  return change >= 0 ? "bg-crypto-green/20" : "bg-crypto-red/20";
}

/**
 * Format price change with sign and percentage
 */
export function formatPriceChangeWithSign(change: number): string {
  const sign = getPriceChangeSign(change);
  return `${sign}${change.toFixed(2)}%`;
}

/**
 * Check if a value is a valid price (finite, positive number)
 */
export function isValidPrice(value: unknown): value is number {
  return (
    typeof value === "number" &&
    isFinite(value) &&
    !isNaN(value) &&
    value > 0
  );
}

/**
 * Clamp a number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
