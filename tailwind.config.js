/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Crypto-themed colors
        crypto: {
          green: "#16c784",
          red: "#ea3943",
          gold: "#f7931a", // Bitcoin orange
        },
      },
    },
  },
  plugins: [],
};
