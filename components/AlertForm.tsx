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
import { useAlertStore } from "@/lib/stores/alertStore";
import { usePriceStore } from "@/lib/stores/priceStore";
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

  const { addAlert, removeAlert, getAlertForCrypto } = useAlertStore();
  const prices = usePriceStore((state) => state.prices);
  const currentPrice = prices[crypto.id]?.price;

  // Get existing alert for this crypto
  const existingAlert = getAlertForCrypto(crypto.id);

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

  const handleSave = () => {
    dismissKeyboard();
    setError(null);

    // Validate threshold
    const numThreshold = parseFloat(threshold);
    if (isNaN(numThreshold) || numThreshold <= 0) {
      setError("Please enter a valid price");
      return;
    }

    // Validate threshold makes sense
    if (currentPrice) {
      if (alertType === "above" && numThreshold <= currentPrice) {
        setError(`Price must be above current (${formatPrice(currentPrice)})`);
        return;
      }
      if (alertType === "below" && numThreshold >= currentPrice) {
        setError(`Price must be below current (${formatPrice(currentPrice)})`);
        return;
      }
    }

    // Add or update alert
    addAlert({
      cryptoId: crypto.id,
      type: alertType,
      threshold: numThreshold,
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
              <View className="bg-slate-800 rounded-2xl w-full max-w-sm p-6">
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
                    <Text className="text-white font-bold text-xl">
                      {existingAlert ? "Edit Alert" : "Set Alert"}
                    </Text>
                    <Text className="text-slate-400">{crypto.name}</Text>
                  </View>
                </View>

                {/* Current price */}
                {currentPrice && (
                  <View className="bg-slate-700/50 rounded-xl p-3 mb-4">
                    <Text className="text-slate-400 text-sm">Current Price</Text>
                    <Text className="text-white font-bold text-lg">
                      {formatPrice(currentPrice)}
                    </Text>
                  </View>
                )}

                {/* Alert type selector */}
                <Text className="text-slate-400 text-sm mb-2">
                  Notify me when price goes
                </Text>
                <View className="flex-row gap-3 mb-4">
                  <Pressable
                    onPress={() => {
                      dismissKeyboard();
                      setAlertType("above");
                    }}
                    className={`flex-1 py-3 rounded-xl items-center ${
                      alertType === "above" ? "bg-crypto-green" : "bg-slate-700"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        alertType === "above" ? "text-white" : "text-slate-400"
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
                      alertType === "below" ? "bg-crypto-red" : "bg-slate-700"
                    }`}
                  >
                    <Text
                      className={`font-semibold ${
                        alertType === "below" ? "text-white" : "text-slate-400"
                      }`}
                    >
                      ↓ Below
                    </Text>
                  </Pressable>
                </View>

                {/* Threshold input */}
                <Text className="text-slate-400 text-sm mb-2">
                  Target Price (USD)
                </Text>
                <View className="flex-row items-center bg-slate-700 rounded-xl mb-4">
                  <Text className="text-slate-400 text-xl pl-4">$</Text>
                  <TextInput
                    ref={inputRef}
                    value={threshold}
                    onChangeText={setThreshold}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={dismissKeyboard}
                    placeholder="0.00"
                    placeholderTextColor="#64748b"
                    className="flex-1 text-white text-xl p-4"
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
                      className="flex-1 py-3 rounded-xl items-center bg-slate-700"
                    >
                      <Text className="text-crypto-red font-semibold">Delete</Text>
                    </Pressable>
                  )}
                  <Pressable
                    onPress={handleClose}
                    className="flex-1 py-3 rounded-xl items-center bg-slate-700"
                  >
                    <Text className="text-slate-300 font-semibold">Cancel</Text>
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
