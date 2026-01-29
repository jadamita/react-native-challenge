import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useUnviewedAlertCount } from "@/lib/stores/alertStore";

interface AlertBadgeProps {
  onPress?: () => void;
}

/**
 * Bell icon with badge for header - navigates to alerts screen
 */
export function AlertBadge({ onPress }: AlertBadgeProps) {
  const router = useRouter();
  const unviewedCount = useUnviewedAlertCount();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push("/alerts");
    }
  };

  return (
    <Pressable
      onPress={handlePress}
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

interface SetAlertButtonProps {
  onPress: () => void;
  hasAlert?: boolean;
}

/**
 * Button to open alert form - used in crypto detail header
 */
export function SetAlertButton({ onPress, hasAlert }: SetAlertButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-10 h-10 items-center justify-center mr-2"
    >
      <View className="relative">
        <Text className="text-xl">{hasAlert ? "🔔" : "🔕"}</Text>
        {hasAlert && (
          <View className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-500 rounded-full border-2 border-slate-900" />
        )}
      </View>
    </Pressable>
  );
}
