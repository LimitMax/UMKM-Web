import { Order } from '@/types';

export type PaymentStatusBadgeVariant = 'pending' | 'success' | 'danger' | 'neutral';

export interface PaymentMetadata {
  provider?: string | null;
  providerReferenceId?: string | null;
  paymentMethod?: string | null;
  paymentType?: string | null;
  amount?: number | null;
  status?: string | null;
  snapToken?: string | null;
  redirectUrl?: string | null;
  createdAt?: string | null;
  paidAt?: string | null;
}

export function formatPaymentMethod(method?: string | null): string {
  switch (method?.toLowerCase()) {
    case 'cash':
    case 'tunai':
      return 'Tunai';
    case 'non_cash':
    case 'non-cash':
      return 'Non-Tunai';
    case 'qris':
      return 'QRIS';
    case 'bank_transfer':
    case 'bank transfer':
      return 'Transfer Bank';
    default:
      return method || '-';
  }
}

export function formatPaymentStatus(status?: string | null): string {
  switch (status?.toLowerCase()) {
    case 'waiting for payment':
    case 'pending':
      return 'Menunggu Pembayaran';
    case 'paid':
      return 'Sudah Dibayar';
    case 'failed':
      return 'Gagal Dibayar';
    case 'expired':
      return 'Pembayaran Kedaluwarsa';
    case 'cancelled':
      return 'Pembayaran Dibatalkan';
    case 'refunded':
      return 'Dikembalikan';
    default:
      return status || '-';
  }
}

export function formatPaymentProvider(provider?: string | null, method?: string | null): string {
  const normMethod = method?.toLowerCase();
  if (provider === 'manual_override' || provider === 'manual') return 'Dibayar Manual oleh Kasir';
  if (normMethod === 'cash' || normMethod === 'tunai') return 'Kasir Manual';
  if (!provider) return 'Midtrans Sandbox';
  const normProvider = provider.toLowerCase();
  if (normProvider === 'midtrans' || normProvider === 'midtrans_snap_sandbox') return 'Midtrans Sandbox';
  if (normProvider === 'manual_override') return 'Dibayar Manual oleh Kasir';
  return provider;
}

export function formatMidtransPaymentType(paymentType?: string | null): string {
  switch (paymentType?.toLowerCase()) {
    case 'manual_override':
      return 'Dibayar Manual oleh Kasir';
    case 'qris':
      return 'QRIS';
    case 'gopay':
      return 'GoPay';
    case 'bank_transfer':
      return 'Virtual Account / Bank Transfer';
    case 'echannel':
      return 'Mandiri Bill';
    case 'cstore':
      return 'Convenience Store';
    case 'credit_card':
      return 'Kartu Kredit';
    case 'shopeepay':
      return 'ShopeePay';
    default:
      return paymentType ? paymentType.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : '-';
  }
}

export function getPaymentStatusBadgeVariant(status?: string | null): PaymentStatusBadgeVariant {
  switch (status?.toLowerCase()) {
    case 'paid':
      return 'success';
    case 'failed':
    case 'expired':
    case 'cancelled':
      return 'danger';
    case 'refunded':
      return 'neutral';
    default:
      return 'pending';
  }
}

export function getPaymentStatusDescription(order: Pick<Order, 'paymentMethod' | 'paymentStatus'>): string {
  const status = order.paymentStatus?.toLowerCase();
  const method = order.paymentMethod?.toLowerCase();
  if (status === 'paid') return 'Pesanan akan segera diproses.';
  if (status === 'failed') return 'Pembayaran belum berhasil. Silakan coba ulang atau hubungi kasir.';
  if (status === 'refunded') return 'Pembayaran sudah dikembalikan.';
  if (status === 'expired' || status === 'cancelled') return 'Silakan buat pesanan baru atau hubungi kasir.';
  if (method === 'cash' || method === 'tunai') return 'Silakan lakukan pembayaran langsung di kasir.';
  return 'Selesaikan pembayaran melalui Midtrans.';
}

export function canCashierProcessOrder(order: Pick<Order, 'paymentStatus'>): boolean {
  return order.paymentStatus?.toLowerCase() === 'paid';
}

export function canRetryPayment(order: Pick<Order, 'paymentMethod' | 'paymentStatus'>, payment?: PaymentMetadata | null): boolean {
  const method = order.paymentMethod?.toLowerCase();
  const status = order.paymentStatus?.toLowerCase();
  const hasTokenOrUrl = Boolean(payment?.snapToken || payment?.redirectUrl);
  return (
    (method === 'non_cash' || method === 'non-cash') &&
    status !== 'paid' &&
    status !== 'expired' &&
    status !== 'cancelled' &&
    status !== 'refunded' &&
    hasTokenOrUrl
  );
}

export function canManualConfirmPayment(order: Pick<Order, 'paymentStatus'>): boolean {
  return order.paymentStatus?.toLowerCase() !== 'paid';
}

