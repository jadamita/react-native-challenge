import { View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { useEffect, useState, useCallback } from "react";
import { CRYPTOS } from "@/lib/constants/cryptos";
import { fetchPrices, formatPrice, formatPercentChange } from "@/lib/api/coingecko";
import type { PriceData } from "@/lib/types";

export default function TestScreen() {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchPrices();

    if (result.success) {
      const priceMap: Record<string, PriceData> = {};
      result.data.forEach((p) => {
        priceMap[p.cryptoId] = p;
      });
      setPrices(priceMap);
      setLastUpdated(new Date());
    } else {
      setError(result.error);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadPrices();
  }, [loadPrices]);

  return (
    <ScrollView className="flex-1 bg-slate-900">
      <View className="p-4">
        <Text className="text-2xl font-bold text-white mb-2">
          Chunk 3: Live API Data
        </Text>

        {/* Status bar */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-slate-400">
            {lastUpdated
              ? `Updated: ${lastUpdated.toLocaleTimeString()}`
              : "Not yet loaded"}
          </Text>
          <Pressable
            onPress={loadPrices}
            disabled={isLoading}
            className="bg-blue-600 active:bg-blue-700 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Text className="text-white font-semibold">
              {isLoading ? "Loading..." : "Refresh"}
            </Text>
          </Pressable>
        </View>

        {/* Error message */}
        {error && (
          <View className="bg-crypto-red/20 border border-crypto-red rounded-xl p-4 mb-4">
            <Text className="text-crypto-red font-semibold">Error: {error}</Text>
            <Text className="text-slate-400 text-sm mt-1">
              Tap Refresh to try again
            </Text>
          </View>
        )}

        {/* Loading indicator */}
        {isLoading && Object.keys(prices).length === 0 && (
          <View className="items-center py-8">
            <ActivityIndicator size="large" color="#3b82f6" />
            <Text className="text-slate-400 mt-4">Fetching prices from CoinGecko...</Text>
          </View>
        )}

        {/* Crypto list with prices */}
        {CRYPTOS.map((crypto) => {
          const priceData = prices[crypto.id];
          const changeColor =
            priceData && priceData.priceChange24h >= 0
              ? "text-crypto-green"
              : "text-crypto-red";

          return (
            <View
              key={crypto.id}
              className="flex-row items-center bg-slate-800 rounded-xl p-4 mb-3"
            >
              {/* Color indicator */}
              <View
                className="w-10 h-10 rounded-full mr-4 items-center justify-center"
                style={{ backgroundColor: crypto.color }}
              >
                <Text className="text-white font-bold text-xs">
                  {crypto.symbol.slice(0, 2)}
                </Text>
              </View>

              {/* Crypto info */}
              <View className="flex-1">
                <Text className="text-white font-semibold text-lg">
                  {crypto.name}
                </Text>
                <Text className="text-slate-400 text-sm">{crypto.symbol}</Text>
              </View>

              {/* Price data */}
              <View className="items-end">
                {priceData ? (
                  <>
                    <Text className="text-white font-semibold">
                      {formatPrice(priceData.price)}
                    </Text>
                    <Text className={`text-sm font-medium ${changeColor}`}>
                      {formatPercentChange(priceData.priceChange24h)}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text className="text-slate-500 font-semibold">$--,---</Text>
                    <Text className="text-slate-600 text-sm">--</Text>
                  </>
                )}
              </View>
            </View>
          );
        })}

        {/* Status summary */}
        <View className="mt-6 p-4 bg-slate-800/50 rounded-xl">
          <Text className="text-crypto-green font-semibold mb-2">
            ✓ API service: lib/api/coingecko.ts
          </Text>
          <Text className="text-crypto-green font-semibold mb-2">
            ✓ fetchPrices() - batch fetch all 10 cryptos
          </Text>
          <Text className="text-crypto-green font-semibold mb-2">
            ✓ fetchChartData() - historical data for charts
          </Text>
          <Text className="text-crypto-green font-semibold mb-2">
            ✓ Error handling with timeout
          </Text>
          <Text className="text-slate-400 text-sm mt-2">
            Ready for Chunk 4: Zustand stores with polling
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
