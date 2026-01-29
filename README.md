# Stonkr

A React Native crypto price tracker built with Expo SDK 54.

## Download

- **Expo Build:** [Install on device](https://expo.dev/accounts/hadamita/projects/stonkr/builds/45b936c1-6f53-483e-ad09-fcbbe37621db)
- **APK:** [Download APK](https://github.com/jadamita/react-native-challenge/releases/download/rev1/stonkr.apk) <!-- Replace with actual link -->

---

## Overview

Stonkr displays interactive price charts for 10 cryptocurrencies, lets users set price alerts, and sends push notifications when alerts trigger. Users navigate via a drawer sorted by market cap and can review triggered alerts in a dedicated screen.

---

## Features

### Navigation

- **Drawer navigation** with all 10 cryptocurrencies listed by market cap
- Each crypto shows current price and 24h change directly in the drawer
- Visual indicator (purple dot) shows which cryptos have active alerts
- Bottom links for Alerts and Settings screens

### Crypto Detail Screen

- **Interactive price chart** with multiple timeframes (1H, 24H, 7D, 30D, 90D, 1Y)
- Haptic feedback when scrubbing the chart
- Current price display with 24h percentage change
- Market cap information
- **Price alert creation** - set alerts for price going above or below a threshold
- If alert exists, shows edit/delete options instead of create
- Pull-to-refresh for manual price updates
- Stale data warning when prices are old

### Alerts System

- **Notification bell icon** in the top-right header
- **Badge count** showing unviewed triggered alerts
- Tapping the bell opens the Alerts screen
- Lists all triggered alerts with:
  - Crypto name and symbol
  - Alert condition (above/below threshold)
  - Price when triggered
  - Timestamp (local time)
- "Mark All as Viewed" clears the badge
- "Clear All" removes triggered alerts from the list
- Active alerts section shows pending alerts that haven't triggered yet

### Push Notifications

- Sends local push notifications when alerts trigger
- Notification shows crypto name, condition, and triggered price
- Tapping notification opens the Alerts screen directly (deep linking)
- Works in background when app is running

---

## Technical Implementation

### Stack

| Layer         | Technology                      |
| ------------- | ------------------------------- |
| Framework     | React Native + Expo SDK 54      |
| Styling       | NativeWind (Tailwind for RN)    |
| State         | Zustand with persist middleware |
| Charts        | react-native-wagmi-charts       |
| Storage       | AsyncStorage                    |
| Notifications | expo-notifications              |

### Architecture

```
lib/
├── api/           # CoinGecko API client
├── data/          # Repository pattern for data access
├── stores/        # Zustand stores (prices, alerts, settings)
├── hooks/         # Custom React hooks
├── types/         # TypeScript interfaces
├── utils/         # Helper functions
└── constants/     # Crypto list, config

components/
├── chart/         # PriceChart, VolumeBars
├── alerts/        # AlertForm, AlertBadge
├── common/        # ErrorBanner, LoadingSkeleton
└── navigation/    # DrawerContent
```

### State Management

Three Zustand stores with persistence:

- **priceStore** - Prices, chart data caching, polling
- **alertStore** - Active alerts, triggered alerts
- **settingsStore** - Dark mode, volume chart toggle

All stores persist to AsyncStorage and rehydrate on app launch.

### Data Fetching

- Prices poll every 30 seconds via CoinGecko API
- Chart data cached for 5 minutes with LRU eviction (max 20 entries)
- Retry logic with exponential backoff for failed requests
- Graceful error handling with user-friendly messages

---

## Edge Cases Handled

| Scenario            | Handling                                                             |
| ------------------- | -------------------------------------------------------------------- |
| API failures        | Retry with backoff, show cached data, error banner with retry button |
| Network offline     | Offline banner, stale data warning, cached prices still displayed    |
| Invalid alert input | Input validation, error messages, prevents impossible alerts         |
| Rapid price changes | Alerts evaluate on each price update, only trigger once per alert    |
| App restart         | All state persisted and restored                                     |
| Empty states        | Helpful messages when no alerts exist                                |

---

## Bonus Features Implemented

- [x] **Chart animations** - Fade in on load, animated price labels
- [x] **Persist alert state** - Alerts survive app restarts via AsyncStorage
- [x] **Push notifications** - Local notifications when alerts trigger
- [x] **Deep linking** - Tapping notification opens Alerts screen
- [x] **Dark mode** - Toggle in settings, persisted preference
- [x] **Volume chart** - Optional volume bars overlay (toggle in settings)
- [x] **Haptic feedback** - When scrubbing chart and pressing buttons

---

## Running Locally

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on specific platform
npm run ios
npm run android
```

### Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage
```

107 unit tests covering stores and API functions.

---

## Limitations

- **CoinGecko free tier** - Rate limited, prices poll every 30s (not real-time WebSocket)
- **10 cryptos hardcoded** - List in `lib/constants/cryptos.ts`
- **Local storage only** - No user accounts, alerts don't sync across devices
- **USD only** - No currency selection

See [OVERVIEW.md](OVERVIEW.md) for more details on technical decisions and trade-offs.
