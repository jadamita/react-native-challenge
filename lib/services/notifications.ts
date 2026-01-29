import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import type { Alert } from "@/lib/types";
import { formatPrice } from "@/lib/api/coingecko";
import { getCryptoById } from "@/lib/constants/cryptos";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Request notification permissions
 * Returns true if permissions were granted
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  // Notifications don't work on simulators/emulators for some features
  if (!Device.isDevice) {
    console.log("Notifications work best on physical devices");
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();

  let finalStatus = existingStatus;

  // Only ask if not already granted
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    console.log("Notification permissions not granted");
    return false;
  }

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("price-alerts", {
      name: "Price Alerts",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#3b82f6",
      sound: "default",
    });
  }

  return true;
}

/**
 * Check if notifications are enabled
 */
export async function areNotificationsEnabled(): Promise<boolean> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === "granted";
}

/**
 * Send a notification for a triggered alert
 */
export async function sendAlertNotification(
  alert: Alert,
  triggeredPrice: number
): Promise<void> {
  const crypto = getCryptoById(alert.cryptoId);
  if (!crypto) return;

  const direction = alert.type === "above" ? "above" : "below";
  const emoji = alert.type === "above" ? "📈" : "📉";

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${emoji} ${crypto.name} Alert Triggered!`,
      body: `${crypto.symbol} is now ${formatPrice(triggeredPrice)} (${direction} ${formatPrice(alert.threshold)})`,
      data: {
        cryptoId: alert.cryptoId,
        alertId: alert.id,
        type: "price-alert",
      },
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // Send immediately
  });
}

/**
 * Cancel all pending notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get the notification that opened the app (if any)
 */
export async function getInitialNotification() {
  return await Notifications.getLastNotificationResponseAsync();
}

/**
 * Add listener for notification received while app is foregrounded
 */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/**
 * Add listener for when user taps on a notification
 */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}
