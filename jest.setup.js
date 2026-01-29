// Jest setup file for unit tests

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock notifications service (used by alertStore)
jest.mock('@/lib/services/notifications', () => ({
  sendAlertNotification: jest.fn(() => Promise.resolve()),
  requestNotificationPermissions: jest.fn(() => Promise.resolve(true)),
  areNotificationsEnabled: jest.fn(() => Promise.resolve(true)),
  cancelAllNotifications: jest.fn(() => Promise.resolve()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});
