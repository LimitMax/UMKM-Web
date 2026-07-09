import { DeliverySettings } from '../types';

export function calculateDeliveryFee(
  subtotal: number,
  settings: DeliverySettings
): { fee: number; freeApplied: boolean } {
  if (!settings.deliveryEnabled) {
    return { fee: 0, freeApplied: false };
  }
  if (!settings.deliveryFeeEnabled) {
    return { fee: 0, freeApplied: false };
  }
  if (settings.freeDeliveryEnabled && subtotal >= settings.freeDeliveryMinimumAmount) {
    return { fee: 0, freeApplied: true };
  }
  return { fee: settings.deliveryFeeAmount, freeApplied: false };
}

export function calculateDeliveryAdminFee(
  subtotal: number,
  settings: DeliverySettings
): number {
  if (!settings.deliveryEnabled || !settings.deliveryAdminFeeEnabled) {
    return 0;
  }
  if (settings.deliveryAdminFeeType === 'fixed') {
    return settings.deliveryAdminFeeValue;
  } else {
    // percentage fee from subtotal
    return Math.round(subtotal * (settings.deliveryAdminFeeValue / 100));
  }
}

export interface CalculateOrderTotalsParams {
  subtotal: number;
  fulfillmentType: 'dine_in' | 'pickup' | 'delivery';
  taxEnabled: boolean;
  taxPercentage: number;
  serviceChargeEnabled: boolean;
  serviceChargePercentage: number;
  deliverySettings?: DeliverySettings;
}

export function calculateOrderTotals(params: CalculateOrderTotalsParams): {
  subtotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  deliveryFeeAmount: number;
  deliveryAdminFeeAmount: number;
  freeDeliveryApplied: boolean;
  totalAmount: number;
} {
  const {
    subtotal,
    fulfillmentType,
    taxEnabled,
    taxPercentage,
    serviceChargeEnabled,
    serviceChargePercentage,
    deliverySettings,
  } = params;

  const serviceChargeAmount = serviceChargeEnabled
    ? Math.round(subtotal * (serviceChargePercentage / 100))
    : 0;

  const taxAmount = taxEnabled
    ? Math.round(subtotal * (taxPercentage / 100))
    : 0;

  let deliveryFeeAmount = 0;
  let deliveryAdminFeeAmount = 0;
  let freeDeliveryApplied = false;

  if (fulfillmentType === 'delivery' && deliverySettings) {
    const feeResult = calculateDeliveryFee(subtotal, deliverySettings);
    deliveryFeeAmount = feeResult.fee;
    freeDeliveryApplied = feeResult.freeApplied;
    deliveryAdminFeeAmount = calculateDeliveryAdminFee(subtotal, deliverySettings);
  }

  const rawTotal = subtotal + serviceChargeAmount + taxAmount + deliveryFeeAmount + deliveryAdminFeeAmount;
  const totalAmount = Math.max(0, rawTotal);

  return {
    subtotal,
    serviceChargeAmount,
    taxAmount,
    deliveryFeeAmount,
    deliveryAdminFeeAmount,
    freeDeliveryApplied,
    totalAmount,
  };
}
