import { View, Text, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { useState, useEffect } from "react";
import { LineChart } from "react-native-wagmi-charts";
import { usePriceStore } from "@/lib/stores/priceStore";
import { formatPrice } from "@/lib/api/coingecko";
import type { ChartTimeframe, ChartDataPoint } from "@/lib/types";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CHART_HEIGHT = 200;

interface PriceChartProps {
  cryptoId: string;
  color?: string;
}

export function PriceChart({ cryptoId, color = "#3b82f6" }: PriceChartProps) {
  const [timeframe, setTimeframe] = useState<ChartTimeframe>("24h");
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getChartData = usePriceStore((state) => state.getChartData);

  // Fetch chart data when timeframe changes
  useEffect(() => {
    let isMounted = true;

    async function loadChart() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getChartData(cryptoId, timeframe);
        if (isMounted) {
          if (data.length > 0) {
            setChartData(data);
          } else {
            setError("No chart data available");
          }
        }
      } catch (err) {
        if (isMounted) {
          setError("Failed to load chart");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadChart();

    return () => {
      isMounted = false;
    };
  }, [cryptoId, timeframe, getChartData]);

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
          <Text
            className={`font-semibold self-center ${
              isPositive ? "text-crypto-green" : "text-crypto-red"
            }`}
          >
            {isPositive ? "+" : ""}
            {priceChange.toFixed(2)}%
          </Text>
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
            <Text className="text-slate-400 text-center">{error}</Text>
          </View>
        ) : chartData.length > 0 ? (
          <LineChart.Provider data={chartData}>
            <LineChart height={CHART_HEIGHT} width={SCREEN_WIDTH - 32}>
              <LineChart.Path color={chartColor} width={2}>
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
            <PriceLabels data={chartData} />
          </LineChart.Provider>
        ) : (
          <View className="items-center">
            <Text className="text-slate-400">No data</Text>
          </View>
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
  return (
    <Pressable
      onPress={onPress}
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
    </Pressable>
  );
}

interface PriceLabelsProps {
  data: ChartDataPoint[];
}

function PriceLabels({ data }: PriceLabelsProps) {
  if (data.length === 0) return null;

  const maxPrice = Math.max(...data.map((d) => d.value));
  const minPrice = Math.min(...data.map((d) => d.value));

  return (
    <View className="absolute right-2 top-0 bottom-0 justify-between py-2">
      <Text className="text-slate-500 text-xs">{formatPrice(maxPrice)}</Text>
      <Text className="text-slate-500 text-xs">{formatPrice(minPrice)}</Text>
    </View>
  );
}
