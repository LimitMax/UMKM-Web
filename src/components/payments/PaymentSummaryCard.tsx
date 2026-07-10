'use client';

import { CreditCard } from 'lucide-react';
import { formatDate, formatRupiah } from '@/utils/format';
import {
  formatMidtransPaymentType,
  formatPaymentMethod,
  formatPaymentProvider,
  formatPaymentStatus,
  getPaymentStatusBadgeVariant,
  PaymentMetadata,
} from '@/utils/paymentHelpers';

interface PaymentSummaryCardProps {
  method: string;
  status: string;
  totalAmount: number;
  payment?: PaymentMetadata | null;
  compact?: boolean;
}

function badgeClass(variant: ReturnType<typeof getPaymentStatusBadgeVariant>): string {
  switch (variant) {
    case 'success':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'danger':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    case 'neutral':
      return 'bg-slate-700/60 text-slate-300 border-slate-600/50';
    default:
      return 'bg-amber-500/10 text-amber-300 border-amber-500/20';
  }
}

export default function PaymentSummaryCard({
  method,
  status,
  totalAmount,
  payment,
  compact = false,
}: PaymentSummaryCardProps) {
  const effectiveStatus = payment?.status || status;
  const provider = formatPaymentProvider(payment?.provider, method);
  const variant = getPaymentStatusBadgeVariant(effectiveStatus);

  const rows = [
    ['Metode Pembayaran', formatPaymentMethod(method)],
    ['Status Pembayaran', formatPaymentStatus(effectiveStatus)],
    ['Provider', provider],
    ['Channel Aktual', formatMidtransPaymentType(payment?.paymentType)],
    ['Referensi Provider', payment?.providerReferenceId || '-'],
    ['Waktu Dibayar', payment?.paidAt ? formatDate(payment.paidAt) : '-'],
    ['Total Pembayaran', formatRupiah(payment?.amount || totalAmount)],
  ];

  return (
    <div className={`rounded-2xl border border-slate-800 bg-slate-900/80 ${compact ? 'p-3' : 'p-4'} text-xs`}>
      <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CreditCard className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-white">Ringkasan Pembayaran</h3>
            <p className="text-[10px] text-slate-500">{provider}</p>
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full border text-[9px] font-black uppercase tracking-wider ${badgeClass(variant)}`}>
          {formatPaymentStatus(effectiveStatus)}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="text-slate-500">{label}</span>
            <span className="text-right font-semibold text-slate-200 break-all">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
