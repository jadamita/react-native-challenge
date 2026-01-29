import { View, Text, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { useState, useEffect, useCallback } from "react";
import { LineChart } from "react-native-wagmi-charts";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { usePriceStore } from "@/lib/stores/priceStore";
import { formatPrice, getErrorMessage, isRetryableError } from "@/lib/api/coingecko";
import type { ChartTimeframe, ChartDataPoint, ApiError } from "@/lib/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HEIGHT = 200;

/**
 * Sanitize chart data - remove invalid values and ensure proper ordering
 */
function sanitizeChartData(data: ChartDataPoint[]): ChartDataPoint[] {
  return data
    .filter((point) => {
      // Remove invalid data points
      if (typeof point.timestamp !== "number" || typeof point.value !== "number") {
        return false;
      }
      if (!isFinite(point.value) || isNaN(point.value) || point.value <= 0) {
        return false;
      }
      if (!isFinite(point.timestamp) || isNaN(point.timestamp)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.timestamp - b.timestamp); // Ensure chronological order
}

/**
 * Calculate safe min/max for price labels
 */
function getSafeMinMax(data: ChartDataPoint[]): { min: number; max: number } {
  if (data.length === 0) {
    return { min: 0, max: 0 };
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);

  // Handle edge case where min === max (flat line)
  if (min === max) {
    const padding = min * 0.01 || 1; // 1% padding or 1 if value is 0
    return { min: min - padding, max: max + padding };
  }

  return { min, max };
}

interface PriceChartProps {
  cryptoId: string;
  color?: string;
}

export function PriceChart({ cryptoId, color = "#3b82f6" }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("24h");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const getChartData = usePriceStore((state) => state.getChartData);

  // Load chart data
  const loadChart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getChartData(cryptoId, timeframe);

    if (result.data.length > 0) {
      // Validate and sanitize data
      const validData = sanitizeChartData(result.data);
      if (validData.length > 0) {
        setChartData(validData);
        setError(null);
      } else {
        setError({
          type: "PARSE_ERROR",
          message: "No valid chart data available",
          retryable: true,
        });
      }
    } else if (result.error) {
      setError(result.error);
    } else {
      setError({
        type: "PARSE_ERROR",
        message: "No chart data available",
        retryable: true,
      });
    }

    setIsLoading(false);
  }, [cryptoId, timeframe, getChartData]);

  // Fetch chart data when timeframe changes or retry triggered
  useEffect(() => {
    loadChart();
  }, [loadChart, retryCount]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  // Calculate price change for the chart period
  const priceChange =
    chartData.length > 1
      ? ((chartData[chartData.length - 1].value - chartData[0].value) /
          chartData[0].value) *
        100
      : 0;

  const isPositive = priceChange >= 0;
  const chartColor = isPositive ? "#16c784" : "#ea3943";

  return (
    <View className="bg-slate-800 rounded-xl overflow-hidden">
      {/* Timeframe selector */}
      <View className="flex-row p-3 gap-2">
        <TimeframeButton
          label="24H"
          isActive={timeframe === "24h"}
          onPress={() => setTimeframe("24h")}
        />
        <TimeframeButton
          label="7D"
          isActive={timeframe === "7d"}
          onPress={() => setTimeframe("7d")}
        />
        <View className="flex-1" />
        {!isLoading && chartData.length > 0 && (
          <Animated.Text
            entering={FadeIn.duration(300)}
            className={`font-semibold self-center ${
              isPositive ? "text-crypto-green" : "text-crypto-red"
            }`}
          >
            {isPositive ? "+" : ""}
            {priceChange.toFixed(2)}%
          </Animated.Text>
        )}
      </View>

      {/* Chart area */}
      <View style={{ height: CHART_HEIGHT }} className="justify-center">
        {isLoading ? (
          <View className="items-center">
            <ActivityIndicator size="small" color={color} />
            <Text className="text-slate-400 text-sm mt-2">Loading chart...</Text>
          </View>
        ) : error ? (
          <View className="items-center px-4">
            <Text className="text-slate-400 text-center mb-2">
              {getErrorMessage(error)}
            </Text>
            {isRetryableError(error) && (
              <Pressable
                onPress={handleRetry}
                className="bg-slate-700 px-4 py-2 rounded-lg active:bg-slate-600"
              >
                <Text className="text-slate-300 text-sm font-semibold">Retry</Text>
              </Pressable>
            )}
          </View>
        ) : chartData.length === 0 ? (
          <Animated.View entering={FadeIn.duration(200)} className="items-center">
            <Text className="text-slate-400">No data available</Text>
          </Animated.View>
        ) : chartData.length === 1 ? (
          // Handle single data point - show as centered value
          <Animated.View entering={FadeIn.duration(300)} className="items-center">
            <Text className="text-white text-2xl font-bold">
              {formatPrice(chartData[0].value)}
            </Text>
            <Text className="text-slate-400 text-sm mt-1">
              Single data point available
            </Text>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(400).delay(100)}
            key={`chart-${timeframe}-${chartData.length}`}
          >
            <LineChart.Provider data={chartData}>
              <LineChart height={CHART_HEIGHT} width={SCREEN_WIDTH - 32}>
                <LineChart.Path
                  color={chartColor}
                  width={2}
                >
                  <LineChart.Gradient color={chartColor} />
                </LineChart.Path>
                <LineChart.CursorCrosshair color={chartColor}>
                  <LineChart.Tooltip
                    textStyle={{
                      color: "white",
                      fontSize: 14,
                      fontWeight: "600",
                    }}
                    style={{
                      backgroundColor: "#1e293b",
                      borderRadius: 8,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  />
                </LineChart.CursorCrosshair>
              </LineChart>
              {/* Price labels */}
              <AnimatedPriceLabels data={chartData} />
            </LineChart.Provider>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

interface TimeframeButtonProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function TimeframeButton({ label, isActive, onPress }: TimeframeButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
      className={`px-4 py-2 rounded-lg ${
        isActive ? "bg-blue-600" : "bg-slate-700"
      }`}
    >
      <Text
        className={`font-semibold text-sm ${
          isActive ? "text-white" : "text-slate-400"
        }`}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

interface PriceLabelsProps {
  data: ChartDataPoint[];
}

function PriceLabels({ data }: PriceLabelsProps) {
  if (data.length === 0) return null;

  const { min, max } = getSafeMinMax(data);

  // Don't show labels if values are invalid
  if (!isFinite(min) || !isFinite(max)) return null;

  return (
    <View className="absolute right-2 top-0 bottom-0 justify-between py-2">
      <Text className="text-slate-500 text-xs">{formatPrice(max)}</Text>
      <Text className="text-slate-500 text-xs">{formatPrice(min)}</Text>
    </View>
  );
}

function AnimatedPriceLabels({ data }: PriceLabelsProps) {
  if (data.length === 0) return null;

  const { min, max } = getSafeMinMax(data);

  // Don't show labels if values are invalid
  if (!isFinite(min) || !isFinite(max)) return null;

  return (
    <Animated.View
      entering={SlideInRight.duration(400).delay(300)}
      className="absolute right-2 top-0 bottom-0 justify-between py-2"
    >
      <Text className="text-slate-500 text-xs">{formatPrice(max)}</Text>
      <Text className="text-slate-500 text-xs">{formatPrice(min)}</Text>
    </Animated.View>
  );
}
