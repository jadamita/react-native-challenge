import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useState, useEffect, useRef } from "react";
import { useAlertStore, useAlertForCrypto } from "@/lib/stores/alertStore";
import { usePriceDataStore } from "@/lib/stores/priceStore";
import { formatPrice } from "@/lib/api/coingecko";
import type { Crypto } from "@/lib/types";
import type { TextInput as TextInputType } from "react-native";

interface AlertFormProps {
  crypto: Crypto;
  visible: boolean;
  onClose: () => void;
}

export function AlertForm({ crypto, visible, onClose }: AlertFormProps) {
  const [alertType, setAlertType] = useState<"above" | "below">("above");
  const [threshold, setThreshold] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<TextInputType>(null);

  const { addAlert, removeAlert } = useAlertStore();
  const prices = usePriceDataStore((state) => state.prices);
  const currentPrice = prices[crypto.id]?.price;

  // Get existing alert for this crypto (reactive)
  const existingAlert = useAlertForCrypto(crypto.id);

  // Pre-fill form if alert exists
  useEffect(() => {
    if (existingAlert) {
      setAlertType(existingAlert.type);
      setThreshold(existingAlert.threshold.toString());
    } else if (currentPrice) {
      // Default to current price
      setThreshold(currentPrice.toFixed(2));
    }
  }, [existingAlert, currentPrice, visible]);

  const dismissKeyboard = () => {
    Keyboard.dismiss();
  };

  // Sanitize threshold input - only allow valid decimal numbers
  const handleThresholdChange = (text: string) => {
    // Remove any characters that aren't digits or decimal point
    let sanitized = text.replace(/[^\d.]/g, "");

    // Ensure only one decimal point
    const parts = sanitized.split(".");
    if (parts.length > 2) {
      sanitized = parts[0] + "." + parts.slice(1).join("");
    }

    // Limit decimal places to 8
    if (parts.length === 2 && parts[1].length > 8) {
      sanitized = parts[0] + "." + parts[1].slice(0, 8);
    }

    // Limit total length to prevent overflow
    if (sanitized.length > 20) {
      sanitized = sanitized.slice(0, 20);
    }

    setThreshold(sanitized);
    setError(null); // Clear error when user types
  };

  const handleSave = () => {
    dismissKeyboard();
    setError(null);

    // Clean input - remove any non-numeric characters except decimal point
    const cleanedThreshold = threshold.replace(/[^\d.]/g, "");

    // Validate threshold
    const numThreshold = parseFloat(cleanedThreshold);
    if (isNaN(numThreshold) || !isFinite(numThreshold)) {
      setError("Please enter a valid number");
      return;
    }

    if (numThreshold <= 0) {
      setError("Price must be greater than zero");
      return;
    }

    // Prevent extremely large values (over 100 trillion)
    if (numThreshold > 100_000_000_000_000) {
      setError("Price value is too large");
      return;
    }

    // Prevent tiny values that are effectively zero (less than 0.00000001)
    if (numThreshold < 0.00000001) {
      setError("Price value is too small");
      return;
    }

    // Validate threshold makes sense relative to current price
    if (currentPrice) {
      // Calculate percentage difference from current price
      const percentDiff = Math.abs((numThreshold - currentPrice) / currentPrice) * 100;

      if (alertType === "above" && numThreshold <= currentPrice) {
        setError(`Price must be above current (${formatPrice(currentPrice)})`);
        return;
      }
      if (alertType === "below" && numThreshold >= currentPrice) {
        setError(`Price must be below current (${formatPrice(currentPrice)})`);
        return;
      }

      // Warn if alert is unrealistically far from current price (over 1000%)
      if (percentDiff > 1000) {
        setError("Alert is very far from current price. Are you sure?");
        // Allow saving on second attempt by checking if same error was shown
        if (!existingAlert && threshold === cleanedThreshold) {
          // User confirmed by pressing save again, allow it
        } else {
          setThreshold(cleanedThreshold);
          return;
        }
      }
    }

    // Round to reasonable precision (max 8 decimal places)
    const roundedThreshold = Math.round(numThreshold * 100000000) / 100000000;

    // Add or update alert
    addAlert({
      cryptoId: crypto.id,
      type: alertType,
      threshold: roundedThreshold,
    });

    onClose();
  };

  const handleDelete = () => {
    dismissKeyboard();
    if (existingAlert) {
      removeAlert(existingAlert.id);
    }
    onClose();
  };

  const handleClose = () => {
    dismissKeyboard();
    setError(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View className="flex-1 bg-black/70 justify-center items-center p-4">
            <TouchableWithoutFeedback onPress={dismissKeyboard}>
              <View className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-sm p-6">
                {/* Header */}
                <View className="flex-row items-center mb-6">
                  <View
                    className="w-12 h-12 rounded-full mr-4 items-center justify-center"
                    style={{ backgroundColor: crypto.color }}
                  >
                    <Text className="text-white font-bold">
                      {crypto.symbol.slice(0, 2)}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-slate-900 dark:text-white font-bold text-xl">
                      {existingAlert ? "Edit Alert" : "Set Alert"}
                    </Text>
                    <Text className="text-slate-500 dark:text-slate-400">{crypto.name}</Text>
                  </View>
                </View>

                {/* Current price */}
                <View className="bg-slate-100 dark:bg-slate-700/50 rounded-xl p-3 mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 text-sm">Current Price</Text>
                  {currentPrice ? (
                    <Text className="text-slate-900 dark:text-white font-bold text-lg">
                      {formatPrice(currentPrice)}
                    </Text>
                  ) : (
                    <Text className="text-slate-400 dark:text-slate-500 text-lg">Loading...</Text>
                  )}
                </View>

                {/* Alert type selector */}
                <Text className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                  Notify me when price goes
                </Text>
                <View className="flex-row gap-3 mb-4">
                  <Pressable
                    onPress={() => {
                      dismissKeyboard();
                      setAlertType("above");
                    }}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      alertType === "above" ? "bg-crypto-green" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        alertType === "above" ? "text-white" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      ↑ Above
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      dismissKeyboard();
                      setAlertType("below");
                    }}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      alertType === "below" ? "bg-crypto-red" : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        alertType === "below" ? "text-white" : "text-slate-500 dark:text-slate-400"
                      }`}
                    >
                      ↓ Below
                    </Text>
                  </Pressable>
                </View>

                {/* Threshold input */}
                <Text className="text-slate-500 dark:text-slate-400 text-sm mb-2">
                  Target Price (USD)
                </Text>
                <View className="flex-row items-center bg-slate-100 dark:bg-slate-700 rounded-xl mb-4">
                  <Text className="text-slate-500 dark:text-slate-400 text-xl pl-4">$</Text>
                  <TextInput
                    ref={inputRef}
                    value={threshold}
                    onChangeText={handleThresholdChange}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={dismissKeyboard}
                    placeholder="0.00"
                    placeholderTextColor="#94a3b8"
                    maxLength={20}
                    className="flex-1 text-slate-900 dark:text-white text-xl p-4"
                  />
                </View>

                {/* Error message */}
                {error && (
                  <View className="bg-crypto-red/20 rounded-lg p-3 mb-4">
                    <Text className="text-crypto-red text-center">{error}</Text>
                  </View>
                )}

                {/* Action buttons */}
                <View className="flex-row gap-3">
                  {existingAlert && (
                    <Pressable
                      onPress={handleDelete}
                      className="flex-1 py-3 rounded-xl items-center bg-slate-200 dark:bg-slate-700"
                    >
                      <Text className="text-crypto-red font-semibold">Delete</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleClose}
                    className="flex-1 py-3 rounded-xl items-center bg-slate-200 dark:bg-slate-700"
                  >
                    <Text className="text-slate-600 dark:text-slate-300 font-semibold">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSave}
                    className="flex-1 py-3 rounded-xl items-center bg-blue-600 active:bg-blue-700"
                  >
                    <Text className="text-white font-semibold">
                      {existingAlert ? "Update" : "Save"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </Modal>
  );
}
