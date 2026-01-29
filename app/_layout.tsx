import { DrawerContent } from "@/components/DrawerContent";
import "@/global.css";
import { useAlertStore, useUnviewedAlertCount } from "@/lib/stores/alertStore";
import { usePriceStore } from "@/lib/stores/priceStore";
import { Drawer } from "expo-router/drawer";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

// Header badge component that subscribes to alert count
function HeaderAlertBadge() {
  const router = useRouter();
  const unviewedCount = useUnviewedAlertCount();

  return (
    <Pressable
      onPress={() => router.push("/alerts")}
      className="w-10 h-10 items-center justify-center mr-2"
    >
      <Text className="text-xl">🔔</Text>
      {unviewedCount > 0 && (
        <View className="absolute -top-1 -right-1 bg-crypto-red rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
          <Text className="text-white text-xs font-bold">
            {unviewedCount > 9 ? "9+" : unviewedCount}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

export default function RootLayout() {
  const startPolling = usePriceStore((state) => state.startPolling);
  const stopPolling = usePriceStore((state) => state.stopPolling);
  const prices = usePriceStore((state) => state.prices);
  const evaluateAlerts = useAlertStore((state) => state.evaluateAlerts);

  // Start price polling at app level
  useEffect(() => {
    startPolling();
    return () => stopPolling();
  }, [startPolling, stopPolling]);

  // Evaluate alerts whenever prices update
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      evaluateAlerts(prices);
    }
  }, [prices, evaluateAlerts]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerStyle: {
            backgroundColor: "#0f172a",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "600",
          },
          drawerStyle: {
            backgroundColor: "#0f172a",
            width: 300,
          },
          headerRight: () => <HeaderAlertBadge />,
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Stonkr",
          }}
        />
        <Drawer.Screen
          name="crypto/[id]"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Crypto",
          }}
        />
        <Drawer.Screen
          name="alerts"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Alerts",
            headerRight: () => null,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
