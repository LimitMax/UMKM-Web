/* eslint-disable @typescript-eslint/no-explicit-any */
import { Order, OrderStatus, PaymentStatus, PaymentMethod, OrderItem } from '../types';

export function mapDbStatusToFrontend(dbStatus: string): OrderStatus {
  switch (dbStatus) {
    case 'pending': return 'Waiting for Payment';
    case 'paid': return 'Paid';
    case 'processing': return 'Processing';
    case 'ready': return 'Ready';
    case 'delivering': return 'delivering';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    default: return dbStatus as OrderStatus;
  }
}

export function mapFrontendStatusToDb(feStatus: string): string {
  switch (feStatus) {
    case 'Waiting for Payment': return 'pending';
    case 'Paid': return 'paid';
    case 'Processing': return 'processing';
    case 'Ready': return 'ready';
    case 'delivering': return 'delivering';
    case 'Completed': return 'completed';
    case 'Cancelled': return 'cancelled';
    default: return feStatus;
  }
}

export function mapDbPaymentStatusToFrontend(dbPaymentStatus: string): PaymentStatus {
  switch (dbPaymentStatus) {
    case 'pending': return 'Waiting for Payment';
    case 'paid': return 'Paid';
    case 'failed': return 'Failed';
    default: return dbPaymentStatus as PaymentStatus;
  }
}

export function mapFrontendPaymentStatusToDb(fePaymentStatus: string): string {
  switch (fePaymentStatus) {
    case 'Waiting for Payment': return 'pending';
    case 'Paid': return 'paid';
    case 'Failed': return 'failed';
    default: return fePaymentStatus;
  }
}

export function mapDbPaymentMethodToFrontend(dbPaymentMethod: string): PaymentMethod {
  switch (dbPaymentMethod) {
    case 'cash': return 'Cash';
    case 'qris': return 'QRIS';
    case 'bank_transfer': return 'Bank Transfer';
    default: return dbPaymentMethod as PaymentMethod;
  }
}

export function mapFrontendPaymentMethodToDb(fePaymentMethod: string): string {
  switch (fePaymentMethod) {
    case 'Cash': return 'cash';
    case 'QRIS': return 'qris';
    case 'Bank Transfer': return 'bank_transfer';
    default: return fePaymentMethod;
  }
}

export function mapDbOrderToOrder(dbOrder: any): Order {
  if (!dbOrder) return dbOrder;
  
  const items: OrderItem[] = (dbOrder.items || []).map((item: any) => ({
    productId: item.product_id,
    name: item.product_name || item.name,
    price: Number(item.price),
    quantity: item.quantity
  }));

  return {
    id: dbOrder.id,
    businessId: dbOrder.business_id,
    queueNumber: dbOrder.queue_number,
    customerName: dbOrder.customer_name,
    customerPhone: dbOrder.customer_phone,
    notes: dbOrder.notes || undefined,
    subtotal: dbOrder.subtotal !== null && dbOrder.subtotal !== undefined ? Number(dbOrder.subtotal) : undefined,
    serviceChargeAmount: dbOrder.service_charge_amount !== null && dbOrder.service_charge_amount !== undefined ? Number(dbOrder.service_charge_amount) : undefined,
    taxAmount: dbOrder.tax_amount !== null && dbOrder.tax_amount !== undefined ? Number(dbOrder.tax_amount) : undefined,
    totalAmount: Number(dbOrder.total_amount),
    paymentMethod: mapDbPaymentMethodToFrontend(dbOrder.payment_method),
    paymentStatus: mapDbPaymentStatusToFrontend(dbOrder.payment_status),
    status: mapDbStatusToFrontend(dbOrder.order_status || dbOrder.status),
    createdAt: dbOrder.created_at,
    fulfillmentType: (dbOrder.fulfillment_type || 'dine_in') as Order['fulfillmentType'],
    recipientName: dbOrder.recipient_name || undefined,
    deliveryPhone: dbOrder.delivery_phone || undefined,
    deliveryAddress: dbOrder.delivery_address || undefined,
    deliveryNotes: dbOrder.delivery_notes || undefined,
    deliveryFeeAmount: dbOrder.delivery_fee_amount !== null && dbOrder.delivery_fee_amount !== undefined ? Number(dbOrder.delivery_fee_amount) : undefined,
    deliveryAdminFeeAmount: dbOrder.delivery_admin_fee_amount !== null && dbOrder.delivery_admin_fee_amount !== undefined ? Number(dbOrder.delivery_admin_fee_amount) : undefined,
    freeDeliveryApplied: dbOrder.free_delivery_applied !== null && dbOrder.free_delivery_applied !== undefined ? dbOrder.free_delivery_applied : undefined,
    deliveryDistanceKm: dbOrder.delivery_distance_km !== null && dbOrder.delivery_distance_km !== undefined ? Number(dbOrder.delivery_distance_km) : undefined,
    deliveryDistanceSource: dbOrder.delivery_distance_source || undefined,
    deliveryFeeCalculationType: (dbOrder.delivery_fee_calculation_type || undefined) as Order['deliveryFeeCalculationType'],
    
    // ETA fields
    estimatedPreparationMinutes: dbOrder.estimated_preparation_minutes !== null && dbOrder.estimated_preparation_minutes !== undefined ? dbOrder.estimated_preparation_minutes : undefined,
    estimatedDeliveryMinutes: dbOrder.estimated_delivery_minutes !== null && dbOrder.estimated_delivery_minutes !== undefined ? dbOrder.estimated_delivery_minutes : undefined,
    estimatedTotalMinutes: dbOrder.estimated_total_minutes !== null && dbOrder.estimated_total_minutes !== undefined ? dbOrder.estimated_total_minutes : undefined,
    estimatedReadyAt: dbOrder.estimated_ready_at || undefined,
    estimatedArrivalAt: dbOrder.estimated_arrival_at || undefined,
    etaLabel: dbOrder.eta_label || undefined,
    etaUpdatedAt: dbOrder.eta_updated_at || undefined,
    etaManuallyAdjusted: dbOrder.eta_manually_adjusted !== null && dbOrder.eta_manually_adjusted !== undefined ? dbOrder.eta_manually_adjusted : false,
    etaAdjustmentReason: dbOrder.eta_adjustment_reason || undefined,
    itemsError: dbOrder.items_error || undefined,
    items
  };
}
