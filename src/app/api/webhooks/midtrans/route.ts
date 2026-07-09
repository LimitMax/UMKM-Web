import { NextResponse } from 'next/server';
import { processMidtransPaymentNotification } from '@/lib/payments/midtransStatusProcessor';
import { MidtransNotificationPayload, verifyMidtransNotification } from '@/lib/payments/midtransClient';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as MidtransNotificationPayload;

    if (!verifyMidtransNotification(payload)) {
      console.warn('[Midtrans webhook] Invalid signature', {
        orderId: payload.order_id,
        transactionStatus: payload.transaction_status,
      });
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const result = await processMidtransPaymentNotification(payload);

    return NextResponse.json({
      ok: true,
      orderId: result.orderId,
      paymentStatus: result.paymentStatus,
      transactionCreated: result.transactionCreated,
    });
  } catch (error) {
    console.error('[Midtrans webhook] Processing failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

