import { DrawerContent } from "@/components/DrawerContent";
import "@/global.css";
import { useAlertStore, useUnviewedAlertCount } from "@/lib/stores/alertStore";
import { usePriceStore } from "@/lib/stores/priceStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { useNetworkStatus } from "@/lib/hooks/useNetworkStatus";
import {
  requestNotificationPermissions,
  addNotificationResponseListener,
  getInitialNotification,
} from "@/lib/services/notifications";
import { Drawer } from "expo-router/drawer";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { View, Text, Pressable, Appearance } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

// Offline banner component
function OfflineBanner() {
  const networkStatus = useNetworkStatus();

  if (networkStatus !== "offline") return null;

  return (
    <View className="bg-crypto-red px-4 py-2 flex-row items-center justify-center">
      <Text className="text-white text-sm font-medium">
        No connection - prices may be outdated
      </Text>
    </View>
  );
}

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

// Theme synchronizer component
function ThemeSync() {
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);

  useEffect(() => {
    Appearance.setColorScheme(isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return null;
}

export default function RootLayout() {
  const router = useRouter();
  const startPolling = usePriceStore((state) => state.startPolling);
  const stopPolling = usePriceStore((state) => state.stopPolling);
  const prices = usePriceStore((state) => state.prices);
  const evaluateAlerts = useAlertStore((state) => state.evaluateAlerts);
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const notificationResponseRef = useRef<ReturnType<typeof addNotificationResponseListener> | null>(null);

  // Set initial color scheme
  useEffect(() => {
    Appearance.setColorScheme(isDarkMode ? "dark" : "light");
  }, []);

  // Request notification permissions on mount
  useEffect(() => {
    requestNotificationPermissions();

    // Check if app was opened from a notification
    getInitialNotification().then((response) => {
      if (response?.notification.request.content.data?.type === "price-alert") {
        router.push("/alerts");
      }
    });

    // Listen for notification taps while app is running
    notificationResponseRef.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === "price-alert") {
        router.push("/alerts");
      }
    });

    return () => {
      notificationResponseRef.current?.remove();
    };
  }, [router]);

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

  // Dynamic header colors based on theme
  const headerBgColor = isDarkMode ? "#0f172a" : "#f8fafc";
  const headerTintColor = isDarkMode ? "#fff" : "#0f172a";
  const drawerBgColor = isDarkMode ? "#0f172a" : "#f8fafc";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeSync />
      <OfflineBanner />
      <Drawer
        drawerContent={(props) => <DrawerContent {...props} />}
        screenOptions={{
          headerStyle: {
            backgroundColor: headerBgColor,
          },
          headerTintColor: headerTintColor,
          headerTitleStyle: {
            fontWeight: "600",
          },
          drawerStyle: {
            backgroundColor: drawerBgColor,
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
        <Drawer.Screen
          name="settings"
          options={{
            drawerItemStyle: { display: "none" },
            title: "Settings",
            headerRight: () => null,
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
