import { describe, it, expect } from 'vitest';
import {
  calculateDeliveryDistance,
  calculateDistanceBasedDeliveryFee,
  calculateDeliveryFee,
  calculateDeliveryAdminFee,
  calculateOrderTotals,
} from '@/utils/calculations';
import { DeliverySettings } from '@/types';

describe('calculations utilities', () => {
  const defaultDeliverySettings: DeliverySettings = {
    deliveryEnabled: true,
    deliveryFeeEnabled: true,
    deliveryFeeAmount: 10000,
    freeDeliveryEnabled: true,
    freeDeliveryMinimumAmount: 50000,
    deliveryFeeCalculationType: 'distance_based',
    baseDeliveryDistanceKm: 2,
    baseDeliveryFee: 8000,
    deliveryFeePerKm: 2500,
    distanceRoundingMode: 'ceil',
    deliveryAdminFeeEnabled: true,
    deliveryAdminFeeType: 'fixed',
    deliveryAdminFeeValue: 2000,
  };

  describe('calculateDeliveryDistance', () => {
    it('should round up distance when mode is ceil', () => {
      expect(calculateDeliveryDistance(2.1, 'ceil')).toBe(3);
      expect(calculateDeliveryDistance(2.0, 'ceil')).toBe(2);
    });

    it('should round down distance when mode is floor', () => {
      expect(calculateDeliveryDistance(2.9, 'floor')).toBe(2);
    });

    it('should round distance to nearest integer when mode is round', () => {
      expect(calculateDeliveryDistance(2.4, 'round')).toBe(2);
      expect(calculateDeliveryDistance(2.6, 'round')).toBe(3);
    });
  });

  describe('calculateDistanceBasedDeliveryFee', () => {
    it('should charge base fee for distances within base distance', () => {
      expect(calculateDistanceBasedDeliveryFee(1.5, defaultDeliverySettings)).toBe(8000);
      expect(calculateDistanceBasedDeliveryFee(2.0, defaultDeliverySettings)).toBe(8000);
    });

    it('should calculate additional per-km fee for excess distance', () => {
      // 3.2 km ceil rounded to 4 km. (4 - 2) * 2500 + 8000 = 13000
      expect(calculateDistanceBasedDeliveryFee(3.2, defaultDeliverySettings)).toBe(13000);
    });
  });

  describe('calculateDeliveryFee', () => {
    it('should return free delivery if subtotal exceeds minimum threshold', () => {
      const result = calculateDeliveryFee(60000, defaultDeliverySettings, 5);
      expect(result.fee).toBe(0);
      expect(result.freeApplied).toBe(true);
    });

    it('should return 0 fee if delivery is disabled', () => {
      const settings = { ...defaultDeliverySettings, deliveryEnabled: false };
      const result = calculateDeliveryFee(30000, settings, 5);
      expect(result.fee).toBe(0);
      expect(result.freeApplied).toBe(false);
    });
  });

  describe('calculateDeliveryAdminFee', () => {
    it('should return fixed or percentage admin fee based on settings', () => {
      expect(calculateDeliveryAdminFee(40000, defaultDeliverySettings)).toBe(2000);
      const percentageSettings = {
        ...defaultDeliverySettings,
        deliveryAdminFeeType: 'percentage' as const,
        deliveryAdminFeeValue: 5,
      };
      expect(calculateDeliveryAdminFee(40000, percentageSettings)).toBe(2000);
    });
  });

  describe('calculateOrderTotals', () => {
    it('should correctly calculate totals with tax, service charge, delivery, and vouchers', () => {
      const totals = calculateOrderTotals({
        subtotal: 40000,
        fulfillmentType: 'delivery',
        taxEnabled: true,
        taxPercentage: 10, // 4000
        serviceChargeEnabled: true,
        serviceChargePercentage: 5, // 2000
        deliverySettings: defaultDeliverySettings,
        deliveryDistanceKm: 3, // 3 km ceil -> 3 km. (3 - 2)*2500 + 8000 = 10500
        voucherDiscountAmount: 5000,
      });

      expect(totals.subtotal).toBe(40000);
      expect(totals.taxAmount).toBe(4000);
      expect(totals.serviceChargeAmount).toBe(2000);
      expect(totals.deliveryFeeAmount).toBe(10500);
      expect(totals.deliveryAdminFeeAmount).toBe(2000);
      expect(totals.voucherDiscountAmount).toBe(5000);
      // 40000 + 4000 + 2000 + 10500 + 2000 - 5000 = 53500
      expect(totals.totalAmount).toBe(53500);
    });
  });
});
