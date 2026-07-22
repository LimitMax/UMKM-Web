import { describe, it, expect } from 'vitest';
import { formatRupiah, formatOrderStatus, formatPaymentStatus, formatPaymentMethod } from '@/utils/format';

describe('format utilities', () => {
  it('should format numbers to Indonesian Rupiah', () => {
    const formatted = formatRupiah(15000);
    expect(formatted).toContain('15.000');
  });

  it('should format order status strings to Indonesian', () => {
    expect(formatOrderStatus('Waiting for Payment')).toBe('Menunggu Pembayaran');
    expect(formatOrderStatus('Paid')).toBe('Sudah Dibayar');
    expect(formatOrderStatus('Processing')).toBe('Sedang Diproses');
    expect(formatOrderStatus('Completed')).toBe('Selesai');
  });

  it('should format payment status strings', () => {
    expect(formatPaymentStatus('pending')).toBe('Belum Bayar');
    expect(formatPaymentStatus('paid')).toBe('Lunas');
    expect(formatPaymentStatus('failed')).toBe('Gagal');
  });

  it('should format payment methods', () => {
    expect(formatPaymentMethod('cash')).toBe('Tunai');
    expect(formatPaymentMethod('non_cash')).toBe('Non-Tunai');
    expect(formatPaymentMethod('qris')).toBe('QRIS');
  });
});
