# Stonkr

A React Native crypto price tracker built with Expo SDK 54.

## Approach

Went with Zustand over Redux for state management—way less boilerplate and the persist middleware makes AsyncStorage integration trivial. Split the stores by domain (prices, alerts, settings) to keep things focused.

The price data comes from CoinGecko's free API. Added a repository pattern (`lib/data/`) so swapping to a different provider later wouldn't require touching components. Probably overkill for 10 cryptos, but it's there if needed.

Components are organized by feature (`components/chart/`, `components/alerts/`, etc.) rather than by type. Makes it easier to find related code.

## Running the App

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Or run on specific platform
npm run ios
npm run android
```

For push notifications on iOS, you'll need a physical device—simulator doesn't support them.

## Running Tests

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # With coverage report
```

## Limitations & Trade-offs

**CoinGecko free tier** - Rate limited to 30 calls/min. Polling is set to 30 seconds to stay well under. No WebSocket support, so prices aren't truly real-time.

**No user accounts** - Everything is stored locally via AsyncStorage. Alerts won't sync across devices.

**Chart library quirks** - react-native-wagmi-charts requires data points to have `timestamp` and `value` keys specifically. Had to transform all the API responses to match.

**10 cryptos hardcoded** - The list is in `lib/constants/cryptos.ts`. Adding more is just adding to the array, but the drawer might get crowded.

**Expo managed workflow** - Can't add native modules that aren't in Expo's ecosystem without ejecting.

**No offline-first** - Prices are cached and persist across restarts, but there's no queue for failed requests or background sync. If you're offline, you just see stale data with a warning banner.

## Assumptions

- Users care about USD prices only (no currency selection)
- One alert per crypto is enough (didn't build alert stacking)
- Dark mode is the default because it's a crypto app
- 5-minute chart cache is acceptable staleness for historical data
