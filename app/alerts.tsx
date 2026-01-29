import { View, Text, ScrollView, Pressable } from "react-native";
import { useEffect } from "react";
import { useRouter } from "expo-router";
import { useAlertStore } from "@/lib/stores/alertStore";
import { getCryptoById } from "@/lib/constants/cryptos";
import { formatPrice } from "@/lib/api/coingecko";
import { format, formatDistanceToNow } from "date-fns";

export default function AlertsScreen() {
  const router = useRouter();
  const { triggeredAlerts, activeAlerts, markAllAsViewed, clearTriggeredAlerts, removeAlert } =
    useAlertStore();

  // Mark as viewed when screen is shown
  useEffect(() => {
    if (triggeredAlerts.some((t) => !t.viewed)) {
      markAllAsViewed();
    }
  }, [triggeredAlerts, markAllAsViewed]);

  // Format timestamp in UTC
  const formatUTC = (timestamp: number) => {
    const date = new Date(timestamp);
    return format(date, "MMM d, HH:mm:ss") + " UTC";
  };

  return (
    <ScrollView className="flex-1 bg-slate-100 dark:bg-slate-900">
      <View className="p-4">
        {/* Triggered alerts section */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-slate-900 dark:text-white font-bold text-lg">
              Triggered Alerts
            </Text>
            {triggeredAlerts.length > 0 && (
              <Pressable
                onPress={clearTriggeredAlerts}
                className="bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-lg active:bg-slate-300 dark:active:bg-slate-600"
              >
                <Text className="text-slate-600 dark:text-slate-300 text-sm">Clear All</Text>
              </Pressable>
            )}
          </View>

          {triggeredAlerts.length === 0 ? (
            <View className="bg-white dark:bg-slate-800 rounded-xl p-6 items-center">
              <Text className="text-4xl mb-2">🔔</Text>
              <Text className="text-slate-500 dark:text-slate-400 text-center">
                No triggered alerts yet.
              </Text>
              <Text className="text-slate-400 dark:text-slate-500 text-center text-sm mt-1">
                Set price alerts on any crypto to get notified.
              </Text>
            </View>
          ) : (
            triggeredAlerts.map((triggered) => {
              const crypto = getCryptoById(triggered.alert.cryptoId);
              if (!crypto) return null;

              return (
                <Pressable
                  key={triggered.id}
                  onPress={() => router.push(`/crypto/${crypto.id}`)}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 active:bg-slate-100 dark:active:bg-slate-700"
                >
                  <View className="flex-row items-center mb-2">
                    <View
                      className="w-8 h-8 rounded-full mr-3 items-center justify-center"
                      style={{ backgroundColor: crypto.color }}
                    >
                      <Text className="text-white font-bold text-xs">
                        {crypto.symbol.slice(0, 2)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-900 dark:text-white font-semibold">
                        {crypto.name}
                      </Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-sm">
                        {crypto.symbol} •{" "}
                        {formatDistanceToNow(triggered.triggeredAt, {
                          addSuffix: true,
                        })}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded ${
                        triggered.alert.type === "above"
                          ? "bg-crypto-green/20"
                          : "bg-crypto-red/20"
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          triggered.alert.type === "above"
                            ? "text-crypto-green"
                            : "text-crypto-red"
                        }`}
                      >
                        {triggered.alert.type === "above" ? "↑ ABOVE" : "↓ BELOW"}
                      </Text>
                    </View>
                  </View>

                  <View className="bg-slate-100 dark:bg-slate-700/50 rounded-lg p-3">
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-slate-500 dark:text-slate-400 text-sm">Target:</Text>
                      <Text className="text-slate-900 dark:text-white font-medium">
                        {formatPrice(triggered.alert.threshold)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-slate-500 dark:text-slate-400 text-sm">Triggered at:</Text>
                      <Text className="text-slate-900 dark:text-white font-medium">
                        {formatPrice(triggered.triggeredPrice)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-slate-500 dark:text-slate-400 text-sm">Time (UTC):</Text>
                      <Text className="text-slate-600 dark:text-slate-300 text-sm">
                        {formatUTC(triggered.triggeredAt)}
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Active alerts section */}
        <View>
          <Text className="text-slate-900 dark:text-white font-bold text-lg mb-3">
            Active Alerts ({activeAlerts.length})
          </Text>

          {activeAlerts.length === 0 ? (
            <View className="bg-white dark:bg-slate-800 rounded-xl p-6 items-center">
              <Text className="text-slate-500 dark:text-slate-400 text-center">
                No active alerts.
              </Text>
              <Text className="text-slate-400 dark:text-slate-500 text-center text-sm mt-1">
                Go to a crypto detail page to set an alert.
              </Text>
            </View>
          ) : (
            activeAlerts.map((alert) => {
              const crypto = getCryptoById(alert.cryptoId);
              if (!crypto) return null;

              return (
                <Pressable
                  key={alert.id}
                  onPress={() => router.push(`/crypto/${crypto.id}`)}
                  className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-3 border border-purple-500/30 active:bg-slate-100 dark:active:bg-slate-700"
                >
                  <View className="flex-row items-center">
                    <View
                      className="w-8 h-8 rounded-full mr-3 items-center justify-center"
                      style={{ backgroundColor: crypto.color }}
                    >
                      <Text className="text-white font-bold text-xs">
                        {crypto.symbol.slice(0, 2)}
                      </Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-slate-900 dark:text-white font-semibold">
                        {crypto.name}
                      </Text>
                      <Text className="text-slate-500 dark:text-slate-400 text-sm">
                        {alert.type === "above" ? "Above" : "Below"}{" "}
                        {formatPrice(alert.threshold)}
                      </Text>
                    </View>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        removeAlert(alert.id);
                      }}
                      className="bg-slate-200 dark:bg-slate-700 px-3 py-1 rounded-lg active:bg-slate-300 dark:active:bg-slate-600"
                    >
                      <Text className="text-slate-500 dark:text-slate-400 text-sm">Remove</Text>
                    </Pressable>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </View>
    </ScrollView>
  );
}
