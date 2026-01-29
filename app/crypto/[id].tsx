import { AlertForm } from "@/components/AlertForm";
import { ErrorBanner, StaleDataBanner } from "@/components/ErrorBanner";
import { PriceChart } from "@/components/PriceChart";
import { formatPercentChange, formatPrice } from "@/lib/api/coingecko";
import { getCryptoById } from "@/lib/constants/cryptos";
import { useAlertForCrypto } from "@/lib/stores/alertStore";
import { usePriceStore, useIsDataStale } from "@/lib/stores/priceStore";
import { useLocalSearchParams } from "expo-router";
import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";

export default function CryptoDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const crypto = getCryptoById(id);
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Price data (polling handled at app level)
  const prices = usePriceStore((state) => state.prices);
  const error = usePriceStore((state) => state.error);
  const lastFetchTime = usePriceStore((state) => state.lastFetchTime);
  const refreshPrices = usePriceStore((state) => state.refreshPrices);
  const priceData = id ? prices[id] : undefined;
  const isDataStale = useIsDataStale();

  // Alert data
  const alert = useAlertForCrypto(id || "");

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await refreshPrices();
    setIsRefreshing(false);
  }, [refreshPrices]);

  if (!crypto) {
    return (
      <View className="flex-1 bg-slate-100 dark:bg-slate-900 items-center justify-center">
        <Text className="text-slate-900 dark:text-white text-lg">Crypto not found</Text>
      </View>
    );
  }

  const changeColor =
    priceData && priceData.priceChange24h >= 0
      ? "text-crypto-green"
      : "text-crypto-red";

  return (
    <>
      <ScrollView
        className="flex-1 bg-slate-100 dark:bg-slate-900"
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#3b82f6"
            colors={["#3b82f6"]}
          />
        }
      >
        <View className="p-4">
          {/* Error banner */}
          {error && !priceData && (
            <View className="mb-4">
              <ErrorBanner
                error={error}
                onRetry={handleRefresh}
                isRetrying={isRefreshing}
              />
            </View>
          )}

          {/* Stale data warning */}
          {isDataStale && lastFetchTime && priceData && (
            <View className="mb-4">
              <StaleDataBanner
                lastUpdated={lastFetchTime}
                onRefresh={handleRefresh}
              />
            </View>
          )}

          {/* Header */}
          <View className="flex-row items-center mb-6">
            <View
              className="w-16 h-16 rounded-full mr-4 items-center justify-center"
              style={{ backgroundColor: crypto.color }}
            >
              <Text className="text-white font-bold text-xl">
                {crypto.symbol.slice(0, 2)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 dark:text-white font-bold text-2xl">
                {crypto.name}
              </Text>
              <Text className="text-slate-500 dark:text-slate-400 text-lg">{crypto.symbol}</Text>
            </View>
          </View>

          {/* Current price */}
          <View className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-4">
            {priceData ? (
              <>
                <Text className="text-slate-500 dark:text-slate-400 text-sm mb-1">
                  Current Price
                </Text>
                <Text className="text-slate-900 dark:text-white font-bold text-3xl mb-1">
                  {formatPrice(priceData.price)}
                </Text>
                <Text className={`font-semibold text-lg ${changeColor}`}>
                  {formatPercentChange(priceData.priceChange24h)} (24h)
                </Text>
              </>
            ) : (
              <View className="items-center py-4">
                <ActivityIndicator size="large" color={crypto.color} />
                <Text className="text-slate-500 dark:text-slate-400 mt-2">Loading price...</Text>
              </View>
            )}
          </View>

          {/* Chart */}
          <View className="mb-4">
            <PriceChart cryptoId={crypto.id} color={crypto.color} />
          </View>

          {/* Alert section */}
          <Pressable
            onPress={() => setShowAlertForm(true)}
            className={`rounded-xl p-4 mb-4 ${
              alert
                ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-500"
                : "bg-white dark:bg-slate-800 active:bg-slate-100 dark:active:bg-slate-700"
            }`}
          >
            {alert ? (
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-purple-700 dark:text-purple-300 font-semibold mb-1">
                    Active Alert
                  </Text>
                  <Text className="text-slate-900 dark:text-white">
                    Notify when price goes{" "}
                    <Text className="font-bold">
                      {alert.type === "above" ? "above" : "below"}
                    </Text>{" "}
                    {formatPrice(alert.threshold)}
                  </Text>
                  <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Tap to edit or remove
                  </Text>
                </View>
                <View className="w-3 h-3 rounded-full bg-purple-500" />
              </View>
            ) : (
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-slate-900 dark:text-white font-semibold mb-1">
                    Set Price Alert
                  </Text>
                  <Text className="text-slate-500 dark:text-slate-400">
                    Get notified when {crypto.symbol} reaches your target price
                  </Text>
                </View>
                <Text className="text-2xl">➕</Text>
              </View>
            )}
          </Pressable>

          {/* Last updated */}
          {priceData && (
            <Text className="text-slate-400 dark:text-slate-500 text-center mt-4 text-sm">
              Last updated:{" "}
              {new Date(priceData.lastUpdated).toLocaleTimeString()}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Alert Form Modal */}
      <AlertForm
        crypto={crypto}
        visible={showAlertForm}
        onClose={() => setShowAlertForm(false)}
      />
    </>
  );
}
