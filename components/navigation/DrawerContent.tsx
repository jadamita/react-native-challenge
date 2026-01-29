import { View, Text, Pressable } from "react-native";
import { DrawerContentScrollView } from "@react-navigation/drawer";
import { useRouter, usePathname } from "expo-router";
import { useMemo } from "react";
import { CRYPTOS } from "@/lib/constants/cryptos";
import { usePriceDataStore } from "@/lib/stores/priceStore";
import { useAlertStore } from "@/lib/stores/alertStore";
import { formatPrice, formatPercentChange } from "@/lib/api/coingecko";
import { LoadingSkeleton } from "@/components/common";

export function DrawerContent(props: any) {
  const router = useRouter();
  const pathname = usePathname();
  const prices = usePriceDataStore((state) => state.prices);
  const isLoading = usePriceDataStore((state) => state.isLoading);
  const error = usePriceDataStore((state) => state.error);
  const consecutiveFailures = usePriceDataStore((state) => state.consecutiveFailures);
  const activeAlerts = useAlertStore((state) => state.activeAlerts);

  const hasPrices = Object.keys(prices).length > 0;
  const showLoadingSkeletons = isLoading && !hasPrices;

  // Sort cryptos by market cap (highest first)
  const sortedCryptos = useMemo(() => {
    return [...CRYPTOS].sort((a, b) => {
      const marketCapA = prices[a.id]?.marketCap ?? 0;
      const marketCapB = prices[b.id]?.marketCap ?? 0;
      return marketCapB - marketCapA;
    });
  }, [prices]);

  return (
    <DrawerContentScrollView {...props} className="bg-slate-100 dark:bg-slate-900">
      <View className="px-4 py-2 mb-2">
        <Text className="text-slate-900 dark:text-white text-xl font-bold">Stonkr</Text>
        <Text className="text-slate-500 dark:text-slate-400 text-sm">Sorted by Market Cap</Text>
      </View>

      {/* Connection error indicator */}
      {consecutiveFailures >= 2 && error && (
        <View className="mx-4 mb-3 bg-crypto-red/20 rounded-lg px-3 py-2 flex-row items-center">
          <Text className="mr-2">📡</Text>
          <Text className="text-crypto-red text-xs flex-1">
            Connection issues. Retrying...
          </Text>
        </View>
      )}

      {/* Crypto list - sorted by market cap */}
      {sortedCryptos.map((crypto, index) => {
        const priceData = prices[crypto.id];
        const isActive = pathname === `/crypto/${crypto.id}`;
        const hasAlert = activeAlerts.some((a) => a.cryptoId === crypto.id);
        const changeColor =
          priceData && priceData.priceChange24h >= 0
            ? "text-crypto-green"
            : "text-crypto-red";

        return (
          <Pressable
            key={crypto.id}
            onPress={() => router.push(`/crypto/${crypto.id}`)}
            className={`flex-row items-center mx-2 px-3 py-3 rounded-xl mb-1 ${
              isActive ? "bg-slate-200 dark:bg-slate-700" : "active:bg-slate-200 dark:active:bg-slate-800"
            }`}
          >
            {/* Rank */}
            <Text className="text-slate-400 dark:text-slate-500 text-xs w-5 mr-2">{index + 1}</Text>

            {/* Crypto icon */}
            <View
              className="w-10 h-10 rounded-full mr-3 items-center justify-center"
              style={{ backgroundColor: crypto.color }}
            >
              <Text className="text-white font-bold text-xs">
                {crypto.symbol.slice(0, 2)}
              </Text>
            </View>

            {/* Name and symbol */}
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-slate-900 dark:text-white font-semibold">{crypto.name}</Text>
                {hasAlert && (
                  <View className="w-2 h-2 rounded-full bg-purple-500" />
                )}
              </View>
              <Text className="text-slate-500 dark:text-slate-400 text-sm">{crypto.symbol}</Text>
            </View>

            {/* Price */}
            <View className="items-end">
              {showLoadingSkeletons ? (
                <View className="gap-1">
                  <LoadingSkeleton width={60} height={14} />
                  <LoadingSkeleton width={40} height={12} />
                </View>
              ) : priceData ? (
                <>
                  <Text className="text-slate-900 dark:text-white font-medium text-sm">
                    {formatPrice(priceData.price)}
                  </Text>
                  <Text className={`text-xs ${changeColor}`}>
                    {formatPercentChange(priceData.priceChange24h)}
                  </Text>
                </>
              ) : (
                <Text className="text-slate-400 dark:text-slate-500 text-sm">--</Text>
              )}
            </View>
          </Pressable>
        );
      })}

      {/* Bottom links */}
      <View className="mx-2 mt-4 pt-4 border-t border-slate-300 dark:border-slate-700">
        {/* Alerts link */}
        <Pressable
          onPress={() => router.push("/alerts")}
          className={`flex-row items-center px-3 py-3 rounded-xl ${
            pathname === "/alerts" ? "bg-slate-200 dark:bg-slate-700" : "active:bg-slate-200 dark:active:bg-slate-800"
          }`}
        >
          <View className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 mr-3 items-center justify-center">
            <Text className="text-lg">🔔</Text>
          </View>
          <Text className="text-slate-900 dark:text-white font-semibold flex-1">Alerts</Text>
          <DrawerAlertBadge />
        </Pressable>

        {/* Settings link */}
        <Pressable
          onPress={() => router.push("/settings")}
          className={`flex-row items-center px-3 py-3 rounded-xl mt-1 ${
            pathname === "/settings" ? "bg-slate-200 dark:bg-slate-700" : "active:bg-slate-200 dark:active:bg-slate-800"
          }`}
        >
          <View className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 mr-3 items-center justify-center">
            <Text className="text-lg">⚙️</Text>
          </View>
          <Text className="text-slate-900 dark:text-white font-semibold flex-1">Settings</Text>
        </Pressable>
      </View>
    </DrawerContentScrollView>
  );
}

function DrawerAlertBadge() {
  const triggeredAlerts = useAlertStore((state) => state.triggeredAlerts);
  const unviewedCount = triggeredAlerts.filter((t) => !t.viewed).length;

  if (unviewedCount === 0) return null;

  return (
    <View className="bg-crypto-red px-2 py-1 rounded-full min-w-[24px] items-center">
      <Text className="text-white text-xs font-bold">{unviewedCount}</Text>
    </View>
  );
}
