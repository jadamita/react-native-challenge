import { View, Text, Pressable, ActivityIndicator, type DimensionValue } from "react-native";
import type { ApiError } from "@/lib/types";
import { getErrorIcon, isRetryableError } from "@/lib/api/coingecko";

interface ErrorBannerProps {
  error: ApiError;
  onRetry?: () => void;
  isRetrying?: boolean;
  compact?: boolean;
}

export function ErrorBanner({
  error,
  onRetry,
  isRetrying = false,
  compact = false,
}: ErrorBannerProps) {
  const icon = getErrorIcon(error);
  const canRetry = isRetryableError(error) && onRetry;

  if (compact) {
    return (
      <View className="flex-row items-center bg-crypto-red/20 rounded-lg px-3 py-2">
        <Text className="mr-2">{icon}</Text>
        <Text className="text-crypto-red text-sm flex-1" numberOfLines={1}>
          {error.message}
        </Text>
        {canRetry && (
          <Pressable
            onPress={onRetry}
            disabled={isRetrying}
            className="ml-2 bg-crypto-red/30 px-2 py-1 rounded active:bg-crypto-red/50"
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color="#ea3943" />
            ) : (
              <Text className="text-crypto-red text-xs font-semibold">Retry</Text>
            )}
          </Pressable>
        )}
      </View>
    );
  }

  return (
    <View className="bg-crypto-red/20 rounded-xl p-4 border border-crypto-red/30">
      <View className="flex-row items-start">
        <Text className="text-2xl mr-3">{icon}</Text>
        <View className="flex-1">
          <Text className="text-crypto-red font-semibold mb-1">
            {getErrorTitle(error.type)}
          </Text>
          <Text className="text-crypto-red/80 text-sm">{error.message}</Text>
        </View>
      </View>
      {canRetry && (
        <Pressable
          onPress={onRetry}
          disabled={isRetrying}
          className="mt-3 bg-crypto-red/30 py-2 rounded-lg items-center active:bg-crypto-red/50"
        >
          {isRetrying ? (
            <ActivityIndicator size="small" color="#ea3943" />
          ) : (
            <Text className="text-crypto-red font-semibold">Try Again</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function getErrorTitle(type: ApiError["type"]): string {
  switch (type) {
    case "NETWORK":
      return "Connection Error";
    case "TIMEOUT":
      return "Request Timed Out";
    case "RATE_LIMIT":
      return "Too Many Requests";
    case "SERVER_ERROR":
      return "Server Error";
    case "NOT_FOUND":
      return "Not Found";
    case "PARSE_ERROR":
      return "Data Error";
    default:
      return "Error";
  }
}

interface StaleDataBannerProps {
  lastUpdated: number;
  onRefresh?: () => void;
}

export function StaleDataBanner({ lastUpdated, onRefresh }: StaleDataBannerProps) {
  const minutesAgo = Math.floor((Date.now() - lastUpdated) / 60000);

  return (
    <Pressable
      onPress={onRefresh}
      className="flex-row items-center bg-yellow-500/20 rounded-lg px-3 py-2 active:bg-yellow-500/30"
    >
      <Text className="mr-2">⚠️</Text>
      <Text className="text-yellow-500 text-sm flex-1">
        Data is {minutesAgo}+ min old. Tap to refresh.
      </Text>
    </Pressable>
  );
}

interface LoadingSkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
}

export function LoadingSkeleton({ width = "100%", height = 16 }: LoadingSkeletonProps) {
  return (
    <View
      className="bg-slate-700 rounded animate-pulse"
      style={{ width, height }}
    />
  );
}
