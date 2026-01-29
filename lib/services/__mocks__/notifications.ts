// Manual mock for notifications service
// Using plain functions that return Promises, Jest will still track them

const mockFn = () => Promise.resolve();

export const sendAlertNotification = jest.fn().mockImplementation(() => Promise.resolve());
export const requestNotificationPermissions = jest.fn().mockImplementation(() => Promise.resolve(true));
export const areNotificationsEnabled = jest.fn().mockImplementation(() => Promise.resolve(true));
export const cancelAllNotifications = jest.fn().mockImplementation(() => Promise.resolve());
export const getInitialNotification = jest.fn().mockImplementation(() => Promise.resolve(null));
export const addNotificationReceivedListener = jest.fn().mockImplementation(() => ({ remove: jest.fn() }));
export const addNotificationResponseListener = jest.fn().mockImplementation(() => ({ remove: jest.fn() }));
