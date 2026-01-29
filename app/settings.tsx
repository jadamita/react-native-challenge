import { View, Text, Switch, ScrollView } from "react-native";
import { useSettingsStore } from "@/lib/stores/settingsStore";

export default function SettingsScreen() {
  const showVolumeChart = useSettingsStore((state) => state.showVolumeChart);
  const setShowVolumeChart = useSettingsStore((state) => state.setShowVolumeChart);
  const isDarkMode = useSettingsStore((state) => state.isDarkMode);
  const setIsDarkMode = useSettingsStore((state) => state.setIsDarkMode);

  return (
    <ScrollView className="flex-1 bg-slate-100 dark:bg-slate-900">
      <View className="p-4">
        {/* Appearance Section */}
        <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase mb-3">
          Appearance
        </Text>
        <View className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
          <SettingRow
            title="Dark Mode"
            description="Use dark color theme"
            value={isDarkMode}
            onValueChange={setIsDarkMode}
          />
        </View>

        {/* Chart Settings Section */}
        <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase mb-3 mt-6">
          Chart
        </Text>
        <View className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden">
          <SettingRow
            title="Show Volume Chart"
            description="Display trading volume bars below the price chart"
            value={showVolumeChart}
            onValueChange={setShowVolumeChart}
          />
        </View>

        {/* About Section */}
        <Text className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase mb-3 mt-6">
          About
        </Text>
        <View className="bg-white dark:bg-slate-800 rounded-xl p-4">
          <Text className="text-slate-900 dark:text-white font-semibold text-base">Stonkr</Text>
          <Text className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Crypto price tracker with alerts
          </Text>
          <Text className="text-slate-400 dark:text-slate-500 text-xs mt-3">
            Data provided by CoinGecko API
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

interface SettingRowProps {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}

function SettingRow({ title, description, value, onValueChange }: SettingRowProps) {
  return (
    <View className="flex-row items-center justify-between p-4">
      <View className="flex-1 mr-4">
        <Text className="text-slate-900 dark:text-white font-medium">{title}</Text>
        {description && (
          <Text className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">{description}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#cbd5e1", true: "#3b82f6" }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
