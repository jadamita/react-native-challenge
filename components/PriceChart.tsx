import { View, Text, Pressable, ActivityIndicator, Dimensions, ScrollView } from "react-native";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { LineChart } from "react-native-wagmi-charts";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  SlideInRight,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { usePriceStore } from "@/lib/stores/priceStore";
import { useSettingsStore } from "@/lib/stores/settingsStore";
import { formatPrice, formatVolume, getErrorMessage, isRetryableError } from "@/lib/api/coingecko";
import type { ChartTimeframe, ChartDataPoint, VolumeDataPoint, ApiError } from "@/lib/types";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HEIGHT = 180;
const VOLUME_HEIGHT = 50;

/**
 * All available timeframes
 */
const TIMEFRAMES: { value: ChartTimeframe; label: string }[] = [
  { value: "1h", label: "1H" },
  { value: "24h", label: "24H" },
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
];

/**
 * Sanitize chart data - remove invalid values and ensure proper ordering
 */
function sanitizeChartData<T extends { timestamp: number; value: number }>(data: T[]): T[] {
  return data
    .filter((point) => {
      if (typeof point.timestamp !== "number" || typeof point.value !== "number") {
        return false;
      }
      if (!isFinite(point.value) || isNaN(point.value)) {
        return false;
      }
      if (!isFinite(point.timestamp) || isNaN(point.timestamp)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
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

  if (min === max) {
    const padding = min * 0.01 || 1;
    return { min: min - padding, max: max + padding };
  }

  return { min, max };
}

interface ChartWithHapticsProps {
  chartColor: string;
}

/**
 * Chart component with haptic feedback on scrubbing and price tooltip
 */
function ChartWithHaptics({ chartColor }: ChartWithHapticsProps) {
  const lastIndexRef = useRef<number | null>(null);

  const triggerHaptic = useCallback(() => {
    Haptics.selectionAsync();
  }, []);

  const handleActivated = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleEnded = useCallback(() => {
    lastIndexRef.current = null;
  }, []);

  return (
    <LineChart
      height={CHART_HEIGHT}
      width={SCREEN_WIDTH - 32}
      onCurrentIndexChange={(index: number) => {
        if (lastIndexRef.current !== null && lastIndexRef.current !== index) {
          runOnJS(triggerHaptic)();
        }
        lastIndexRef.current = index;
      }}
    >
      <LineChart.Path color={chartColor} width={2}>
        <LineChart.Gradient color={chartColor} />
      </LineChart.Path>
      <LineChart.CursorCrosshair
        color={chartColor}
        onActivated={handleActivated}
        onEnded={handleEnded}
      >
        <LineChart.Tooltip
          textStyle={{
            color: "white",
            fontSize: 14,
            fontWeight: "600",
          }}
          style={{
            backgroundColor: "#1e293b",
            borderRadius: 8,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
        />
      </LineChart.CursorCrosshair>
    </LineChart>
  );
}

interface VolumeBarProps {
  volumes: VolumeDataPoint[];
  chartColor: string;
}

/**
 * Volume bars overlay component
 */
function VolumeBars({ volumes, chartColor }: VolumeBarProps) {
  const maxVolume = useMemo(() => {
    if (volumes.length === 0) return 0;
    return Math.max(...volumes.map((v) => v.value));
  }, [volumes]);

  const avgVolume = useMemo(() => {
    if (volumes.length === 0) return 0;
    return volumes.reduce((sum, v) => sum + v.value, 0) / volumes.length;
  }, [volumes]);

  if (volumes.length === 0 || maxVolume === 0) return null;

  // Sample volumes to fit width (max ~60 bars)
  const maxBars = 60;
  const step = Math.max(1, Math.floor(volumes.length / maxBars));
  const sampledVolumes = volumes.filter((_, i) => i % step === 0);
  const barWidth = (SCREEN_WIDTH - 32) / sampledVolumes.length;

  return (
    <View className="mt-1">
      <View className="flex-row items-end" style={{ height: VOLUME_HEIGHT }}>
        {sampledVolumes.map((vol, index) => {
          const heightPercent = (vol.value / maxVolume) * 100;
          return (
            <View
              key={index}
              style={{
                width: barWidth - 1,
                height: `${Math.max(heightPercent, 2)}%`,
                backgroundColor: chartColor,
                opacity: 0.3,
                marginRight: 1,
              }}
            />
          );
        })}
      </View>
      <View className="flex-row justify-between mt-1 px-1">
        <Text className="text-slate-400 dark:text-slate-500 text-xs">Vol</Text>
        <Text className="text-slate-400 dark:text-slate-500 text-xs">{formatVolume(avgVolume)} avg</Text>
      </View>
    </View>
  );
}

interface PriceChartProps {
  cryptoId: string;
  color?: string;
}

export function PriceChart({ cryptoId, color = "#3b82f6" }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("24h");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const getChartData = usePriceStore((state) => state.getChartData);
  const showVolumeChart = useSettingsStore((state) => state.showVolumeChart);

  // Load chart data
  const loadChart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await getChartData(cryptoId, timeframe);

    if (result.prices.length > 0) {
      const validPrices = sanitizeChartData(result.prices);
      const validVolumes = sanitizeChartData(result.volumes);

      if (validPrices.length > 0) {
        setChartData(validPrices);
        setVolumeData(validVolumes);
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
    <View className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
      {/* Timeframe selector - scrollable */}
      <View className="flex-row items-center p-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {TIMEFRAMES.map((tf) => (
            <TimeframeButton
              key={tf.value}
              label={tf.label}
              isActive={timeframe === tf.value}
              onPress={() => setTimeframe(tf.value)}
            />
          ))}
        </ScrollView>
        {!isLoading && chartData.length > 0 && (
          <Animated.Text
            entering={FadeIn.duration(300)}
            className={`font-semibold ml-3 ${
              isPositive ? "text-crypto-green" : "text-crypto-red"
            }`}
          >
            {isPositive ? "+" : ""}
            {priceChange.toFixed(2)}%
          </Animated.Text>
        )}
      </View>

      {/* Chart area */}
      <View style={{ minHeight: CHART_HEIGHT }} className="justify-center">
        {isLoading ? (
          <View className="items-center">
            <ActivityIndicator size="small" color={color} />
            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-2">Loading chart...</Text>
          </View>
        ) : error ? (
          <View className="items-center px-4">
            <Text className="text-slate-500 dark:text-slate-400 text-center mb-2">
              {getErrorMessage(error)}
            </Text>
            {isRetryableError(error) && (
              <Pressable
                onPress={handleRetry}
                className="bg-slate-200 dark:bg-slate-700 px-4 py-2 rounded-lg active:bg-slate-300 dark:active:bg-slate-600"
              >
                <Text className="text-slate-700 dark:text-slate-300 text-sm font-semibold">Retry</Text>
              </Pressable>
            )}
          </View>
        ) : chartData.length === 0 ? (
          <Animated.View entering={FadeIn.duration(200)} className="items-center">
            <Text className="text-slate-500 dark:text-slate-400">No data available</Text>
          </Animated.View>
        ) : chartData.length === 1 ? (
          <Animated.View entering={FadeIn.duration(300)} className="items-center">
            <Text className="text-slate-900 dark:text-white text-2xl font-bold">
              {formatPrice(chartData[0].value)}
            </Text>
            <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Single data point available
            </Text>
          </Animated.View>
        ) : (
          <Animated.View
            entering={FadeIn.duration(400).delay(100)}
            key={`chart-${timeframe}-${chartData.length}`}
          >
            <LineChart.Provider data={chartData}>
              <ChartWithHaptics chartColor={chartColor} />
              <AnimatedPriceLabels data={chartData} />
            </LineChart.Provider>
          </Animated.View>
        )}
      </View>

      {/* Volume bars - only show if enabled in settings */}
      {showVolumeChart && !isLoading && !error && volumeData.length > 0 && (
        <Animated.View
          entering={FadeIn.duration(400).delay(200)}
          className="px-4 pb-3"
        >
          <VolumeBars volumes={volumeData} chartColor={chartColor} />
        </Animated.View>
      )}
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
      className={`px-3 py-1.5 rounded-lg ${
        isActive ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-700"
      }`}
    >
      <Text
        className={`font-semibold text-xs ${
          isActive ? "text-white" : "text-slate-600 dark:text-slate-400"
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

function AnimatedPriceLabels({ data }: PriceLabelsProps) {
  if (data.length === 0) return null;

  const { min, max } = getSafeMinMax(data);

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
