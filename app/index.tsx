import { View, Text, Pressable } from "react-native";
import { useState } from "react";

export default function TestScreen() {
  const [count, setCount] = useState(0);

  return (
    <View className="flex-1 bg-slate-900 items-center justify-center p-4">
      <Text className="text-3xl font-bold text-white mb-4">
        NativeWind Test
      </Text>

      <Text className="text-lg text-slate-300 mb-8 text-center">
        If you see styled text with a dark background, NativeWind is working!
      </Text>

      {/* Test custom crypto colors */}
      <View className="flex-row gap-4 mb-8">
        <View className="bg-crypto-green px-4 py-2 rounded-lg">
          <Text className="text-white font-semibold">+5.24%</Text>
        </View>
        <View className="bg-crypto-red px-4 py-2 rounded-lg">
          <Text className="text-white font-semibold">-2.18%</Text>
        </View>
        <View className="bg-crypto-gold px-4 py-2 rounded-lg">
          <Text className="text-white font-semibold">BTC</Text>
        </View>
      </View>

      {/* Test interactive element */}
      <Pressable
        onPress={() => setCount((c) => c + 1)}
        className="bg-blue-600 active:bg-blue-700 px-6 py-3 rounded-xl"
      >
        <Text className="text-white font-semibold text-lg">
          Pressed {count} times
        </Text>
      </Pressable>

      <Text className="text-slate-500 mt-8 text-sm">
        Chunk 1 Complete - Ready for Chunk 2
      </Text>
    </View>
  );
}
