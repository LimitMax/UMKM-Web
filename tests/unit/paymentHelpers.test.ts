import { describe, it, expect } from 'vitest';
import { mapMidtransPaymentTypeToDb } from '@/utils/paymentHelpers';

describe('mapMidtransPaymentTypeToDb', () => {
  it('should map cash correctly', () => {
    expect(mapMidtransPaymentTypeToDb('cash')).toBe('cash');
    expect(mapMidtransPaymentTypeToDb('CASH')).toBe('cash');
  });

  it('should map e-wallets and QRIS to qris', () => {
    expect(mapMidtransPaymentTypeToDb('qris')).toBe('qris');
    expect(mapMidtransPaymentTypeToDb('gopay')).toBe('qris');
    expect(mapMidtransPaymentTypeToDb('shopeepay')).toBe('qris');
  });

  it('should map virtual accounts and bank transfers to bank_transfer', () => {
    expect(mapMidtransPaymentTypeToDb('bank_transfer')).toBe('bank_transfer');
    expect(mapMidtransPaymentTypeToDb('bca_va')).toBe('bank_transfer');
    expect(mapMidtransPaymentTypeToDb('bni_va')).toBe('bank_transfer');
    expect(mapMidtransPaymentTypeToDb('bri_va')).toBe('bank_transfer');
    expect(mapMidtransPaymentTypeToDb('permata_va')).toBe('bank_transfer');
    expect(mapMidtransPaymentTypeToDb('echannel')).toBe('bank_transfer');
    expect(mapMidtransPaymentTypeToDb('cimb_va')).toBe('bank_transfer');
  });

  it('should fallback credit card and unknown payment types to non_cash', () => {
    expect(mapMidtransPaymentTypeToDb('credit_card')).toBe('non_cash');
    expect(mapMidtransPaymentTypeToDb('kredivo')).toBe('non_cash');
    expect(mapMidtransPaymentTypeToDb('')).toBe('non_cash');
    expect(mapMidtransPaymentTypeToDb(undefined)).toBe('non_cash');
  });
});
