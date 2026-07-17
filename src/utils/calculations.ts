import { DeliverySettings, DistanceRoundingMode } from '../types';

export function calculateDeliveryDistance(
  distance: number,
  roundingMode: DistanceRoundingMode
): number {
  if (roundingMode === 'ceil') {
    return Math.ceil(distance);
  } else if (roundingMode === 'floor') {
    return Math.floor(distance);
  } else {
    return Math.round(distance);
  }
}

export function calculateDistanceBasedDeliveryFee(
  distance: number,
  settings: DeliverySettings
): number {
  const roundingMode = settings.distanceRoundingMode || 'ceil';
  const roundedDistance = calculateDeliveryDistance(distance, roundingMode);
  
  const baseDist = settings.baseDeliveryDistanceKm ?? 2;
  const baseFee = settings.baseDeliveryFee ?? 8000;
  const feePerKm = settings.deliveryFeePerKm ?? 2500;
  
  if (roundedDistance <= baseDist) {
    return baseFee;
  }
  return baseFee + (roundedDistance - baseDist) * feePerKm;
}

export function calculateDeliveryFee(
  subtotal: number,
  settings: DeliverySettings,
  distanceKm?: number
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

  const calcType = settings.deliveryFeeCalculationType || 'fixed';
  if (calcType === 'distance_based') {
    const distance = distanceKm !== undefined ? distanceKm : 0;
    const fee = calculateDistanceBasedDeliveryFee(distance, settings);
    return { fee, freeApplied: false };
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
  deliveryDistanceKm?: number;
  voucherDiscountAmount?: number;
}

export function calculateOrderTotals(params: CalculateOrderTotalsParams): {
  subtotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  deliveryFeeAmount: number;
  deliveryAdminFeeAmount: number;
  freeDeliveryApplied: boolean;
  totalAmount: number;
  voucherDiscountAmount: number;
} {
  const {
    subtotal,
    fulfillmentType,
    taxEnabled,
    taxPercentage,
    serviceChargeEnabled,
    serviceChargePercentage,
    deliverySettings,
    deliveryDistanceKm,
    voucherDiscountAmount = 0,
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
    const feeResult = calculateDeliveryFee(subtotal, deliverySettings, deliveryDistanceKm);
    deliveryFeeAmount = feeResult.fee;
    freeDeliveryApplied = feeResult.freeApplied;
    deliveryAdminFeeAmount = calculateDeliveryAdminFee(subtotal, deliverySettings);
  }

  const rawTotal = subtotal + serviceChargeAmount + taxAmount + deliveryFeeAmount + deliveryAdminFeeAmount - voucherDiscountAmount;
  const totalAmount = Math.max(0, rawTotal);

  return {
    subtotal,
    serviceChargeAmount,
    taxAmount,
    deliveryFeeAmount,
    deliveryAdminFeeAmount,
    freeDeliveryApplied,
    totalAmount,
    voucherDiscountAmount,
  };
}
