import { describe, it, expect } from 'vitest';
import {
  getEtaLabel,
  formatEtaMinutes,
  formatEstimatedTime,
  formatEtaDisplay,
} from '@/utils/etaHelpers';

describe('etaHelpers utilities', () => {
  describe('getEtaLabel', () => {
    it('should return correct ETA labels for fulfillment types', () => {
      expect(getEtaLabel('pickup')).toBe('Estimasi siap diambil');
      expect(getEtaLabel('delivery')).toBe('Estimasi sampai');
      expect(getEtaLabel('dine_in')).toBe('Estimasi disajikan');
      expect(getEtaLabel(undefined)).toBe('Estimasi disajikan');
    });
  });

  describe('formatEtaMinutes', () => {
    it('should format minutes string correctly', () => {
      expect(formatEtaMinutes(25)).toBe('±25 menit');
      expect(formatEtaMinutes(0)).toBe('±0 menit');
      expect(formatEtaMinutes(-5)).toBe('±0 menit');
    });
  });

  describe('formatEstimatedTime', () => {
    it('should format ISO timestamp to HH.MM format', () => {
      const iso = new Date('2026-07-22T14:30:00.000Z').toISOString();
      const formatted = formatEstimatedTime(iso);
      expect(formatted).toMatch(/^\d{2}\.\d{2}$/);
    });

    it('should return fallback dash for invalid dates', () => {
      expect(formatEstimatedTime(undefined)).toBe('-');
      expect(formatEstimatedTime('invalid-date')).toBe('-');
    });
  });

  describe('formatEtaDisplay', () => {
    it('should format according to display mode', () => {
      const iso = '2026-07-22T14:30:00.000Z';
      expect(formatEtaDisplay(20, iso, 'minutes_only')).toBe('±20 menit');
      expect(formatEtaDisplay(20, iso, 'both')).toContain('±20 menit');
      expect(formatEtaDisplay(20, iso, 'both')).toContain('Perkiraan');
    });
  });
});
