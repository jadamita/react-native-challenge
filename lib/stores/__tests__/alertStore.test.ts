import type { PriceData } from '@/lib/types';

// Mock notifications before importing the store
jest.mock('@/lib/services/notifications', () => ({
  sendAlertNotification: jest.fn(() => Promise.resolve()),
}));

// Import after mock is set up
import { useAlertStore } from '../alertStore';

describe('alertStore', () => {
  // Reset store state before each test
  beforeEach(() => {
    useAlertStore.setState({
      activeAlerts: [],
      triggeredAlerts: [],
      _hasHydrated: false,
    });
  });

  describe('addAlert', () => {
    it('creates a new alert', () => {
      const alertId = useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      const { activeAlerts } = useAlertStore.getState();

      expect(alertId).toBeDefined();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].cryptoId).toBe('bitcoin');
      expect(activeAlerts[0].type).toBe('above');
      expect(activeAlerts[0].threshold).toBe(100000);
      expect(activeAlerts[0].id).toBe(alertId);
      expect(activeAlerts[0].createdAt).toBeDefined();
    });

    it('replaces existing alert for the same crypto', () => {
      // Add first alert
      useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      // Add second alert for same crypto
      const newAlertId = useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'below',
        threshold: 50000,
      });

      const { activeAlerts } = useAlertStore.getState();

      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].id).toBe(newAlertId);
      expect(activeAlerts[0].type).toBe('below');
      expect(activeAlerts[0].threshold).toBe(50000);
    });

    it('allows multiple alerts for different cryptos', () => {
      useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      useAlertStore.getState().addAlert({
        cryptoId: 'ethereum',
        type: 'below',
        threshold: 2000,
      });

      const { activeAlerts } = useAlertStore.getState();

      expect(activeAlerts).toHaveLength(2);
      expect(activeAlerts.find(a => a.cryptoId === 'bitcoin')).toBeDefined();
      expect(activeAlerts.find(a => a.cryptoId === 'ethereum')).toBeDefined();
    });
  });

  describe('removeAlert', () => {
    it('removes an alert by ID', () => {
      const alertId = useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      useAlertStore.getState().removeAlert(alertId);

      const { activeAlerts } = useAlertStore.getState();
      expect(activeAlerts).toHaveLength(0);
    });

    it('does not affect other alerts', () => {
      const bitcoinAlertId = useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      useAlertStore.getState().addAlert({
        cryptoId: 'ethereum',
        type: 'below',
        threshold: 2000,
      });

      useAlertStore.getState().removeAlert(bitcoinAlertId);

      const { activeAlerts } = useAlertStore.getState();
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].cryptoId).toBe('ethereum');
    });
  });

  describe('updateAlert', () => {
    it('updates alert threshold', () => {
      const alertId = useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      useAlertStore.getState().updateAlert(alertId, { threshold: 150000 });

      const { activeAlerts } = useAlertStore.getState();
      expect(activeAlerts[0].threshold).toBe(150000);
    });

    it('updates alert type', () => {
      const alertId = useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      useAlertStore.getState().updateAlert(alertId, { type: 'below' });

      const { activeAlerts } = useAlertStore.getState();
      expect(activeAlerts[0].type).toBe('below');
    });
  });

  describe('getAlertForCrypto', () => {
    it('returns alert for crypto if exists', () => {
      useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      const alert = useAlertStore.getState().getAlertForCrypto('bitcoin');

      expect(alert).toBeDefined();
      expect(alert?.cryptoId).toBe('bitcoin');
    });

    it('returns undefined if no alert exists', () => {
      const alert = useAlertStore.getState().getAlertForCrypto('bitcoin');
      expect(alert).toBeUndefined();
    });
  });

  describe('evaluateAlerts', () => {
    it('triggers alert when price goes above threshold', () => {
      useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      const prices: Record<string, PriceData> = {
        bitcoin: {
          cryptoId: 'bitcoin',
          price: 105000, // Above threshold
          priceChange24h: 5,
          marketCap: 2000000000000,
          lastUpdated: Date.now(),
        },
      };

      useAlertStore.getState().evaluateAlerts(prices);

      const { activeAlerts, triggeredAlerts } = useAlertStore.getState();

      expect(activeAlerts).toHaveLength(0);
      expect(triggeredAlerts).toHaveLength(1);
      expect(triggeredAlerts[0].alert.cryptoId).toBe('bitcoin');
      expect(triggeredAlerts[0].triggeredPrice).toBe(105000);
      expect(triggeredAlerts[0].viewed).toBe(false);
    });

    it('triggers alert when price goes below threshold', () => {
      useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'below',
        threshold: 50000,
      });

      const prices: Record<string, PriceData> = {
        bitcoin: {
          cryptoId: 'bitcoin',
          price: 45000, // Below threshold
          priceChange24h: -5,
          marketCap: 900000000000,
          lastUpdated: Date.now(),
        },
      };

      useAlertStore.getState().evaluateAlerts(prices);

      const { activeAlerts, triggeredAlerts } = useAlertStore.getState();

      expect(activeAlerts).toHaveLength(0);
      expect(triggeredAlerts).toHaveLength(1);
      expect(triggeredAlerts[0].triggeredPrice).toBe(45000);
    });

    it('does not trigger alert when price does not cross threshold', () => {
      useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      const prices: Record<string, PriceData> = {
        bitcoin: {
          cryptoId: 'bitcoin',
          price: 95000, // Below threshold
          priceChange24h: 2,
          marketCap: 1800000000000,
          lastUpdated: Date.now(),
        },
      };

      useAlertStore.getState().evaluateAlerts(prices);

      const { activeAlerts, triggeredAlerts } = useAlertStore.getState();

      expect(activeAlerts).toHaveLength(1);
      expect(triggeredAlerts).toHaveLength(0);
    });

    it('triggers when price equals threshold (above)', () => {
      useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      const prices: Record<string, PriceData> = {
        bitcoin: {
          cryptoId: 'bitcoin',
          price: 100000, // Exactly at threshold
          priceChange24h: 0,
          marketCap: 1900000000000,
          lastUpdated: Date.now(),
        },
      };

      useAlertStore.getState().evaluateAlerts(prices);

      const { triggeredAlerts } = useAlertStore.getState();
      expect(triggeredAlerts).toHaveLength(1);
    });

    it('ignores alerts for cryptos without price data', () => {
      useAlertStore.getState().addAlert({
        cryptoId: 'bitcoin',
        type: 'above',
        threshold: 100000,
      });

      useAlertStore.getState().evaluateAlerts({}); // Empty prices

      const { activeAlerts, triggeredAlerts } = useAlertStore.getState();

      expect(activeAlerts).toHaveLength(1);
      expect(triggeredAlerts).toHaveLength(0);
    });
  });

  describe('markAllAsViewed', () => {
    it('marks all triggered alerts as viewed', () => {
      // Set up triggered alerts directly
      useAlertStore.setState({
        triggeredAlerts: [
          {
            id: 'triggered-1',
            alert: { id: 'alert-1', cryptoId: 'bitcoin', type: 'above', threshold: 100000, createdAt: Date.now() },
            triggeredPrice: 105000,
            triggeredAt: Date.now(),
            viewed: false,
          },
          {
            id: 'triggered-2',
            alert: { id: 'alert-2', cryptoId: 'ethereum', type: 'below', threshold: 2000, createdAt: Date.now() },
            triggeredPrice: 1800,
            triggeredAt: Date.now(),
            viewed: false,
          },
        ],
      });

      useAlertStore.getState().markAllAsViewed();

      const { triggeredAlerts } = useAlertStore.getState();

      expect(triggeredAlerts).toHaveLength(2);
      expect(triggeredAlerts.every(t => t.viewed)).toBe(true);
    });
  });

  describe('clearTriggeredAlerts', () => {
    it('clears all triggered alerts', () => {
      useAlertStore.setState({
        triggeredAlerts: [
          {
            id: 'triggered-1',
            alert: { id: 'alert-1', cryptoId: 'bitcoin', type: 'above', threshold: 100000, createdAt: Date.now() },
            triggeredPrice: 105000,
            triggeredAt: Date.now(),
            viewed: true,
          },
        ],
      });

      useAlertStore.getState().clearTriggeredAlerts();

      const { triggeredAlerts } = useAlertStore.getState();
      expect(triggeredAlerts).toHaveLength(0);
    });
  });

  describe('hydration', () => {
    it('sets hydration state', () => {
      expect(useAlertStore.getState()._hasHydrated).toBe(false);

      useAlertStore.getState().setHasHydrated(true);

      expect(useAlertStore.getState()._hasHydrated).toBe(true);
    });
  });
});
