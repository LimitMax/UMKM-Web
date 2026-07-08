export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatOrderStatus(status: string): string {
  switch (status) {
    case 'Waiting for Payment':
      return 'Menunggu Pembayaran';
    case 'Paid':
      return 'Sudah Dibayar';
    case 'Processing':
      return 'Sedang Diproses';
    case 'Ready':
      return 'Siap Diambil';
    case 'Completed':
      return 'Selesai';
    case 'Cancelled':
      return 'Dibatalkan';
    default:
      return status;
  }
}

export function formatPaymentStatus(status: string): string {
  switch (status) {
    case 'Pending':
      return 'Belum Bayar';
    case 'Paid':
      return 'Lunas';
    case 'Failed':
      return 'Gagal';
    default:
      return status;
  }
}
