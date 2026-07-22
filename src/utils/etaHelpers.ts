/**
 * etaHelpers.ts — Phase 6.8
 *
 * Centralized ETA calculation and formatting utilities for UMKM Pilot.
 * All calculations are rule-based (no real-time queue, no Maps API).
 * All functions are pure — no side effects, no imports from services.
 */

import { Order, OrderEtaSettings, FulfillmentType, EtaDisplayMode } from '../types';
import { DEFAULT_ETA_SETTINGS } from '../services/businessService';

// ─────────────────────────────────────────────────────────────────────────────
// Label helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the human-readable ETA label for the given fulfillment type.
 */
export function getEtaLabel(fulfillmentType?: FulfillmentType): string {
  switch (fulfillmentType) {
    case 'pickup':
      return 'Estimasi siap diambil';
    case 'delivery':
      return 'Estimasi sampai';
    case 'dine_in':
    default:
      return 'Estimasi disajikan';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats minutes as "±23 menit".
 */
export function formatEtaMinutes(minutes: number): string {
  return `±${Math.max(0, Math.round(minutes))} menit`;
}

/**
 * Formats an ISO date string as a short local time "HH.MM".
 */
export function formatEstimatedTime(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}.${mm}`;
  } catch {
    return '-';
  }
}

/**
 * Returns a combined ETA display string based on etaDisplayMode.
 *
 * - minutes_only  → "±37 menit"
 * - estimated_time → "Perkiraan 10.42"
 * - both           → "±37 menit • Perkiraan 10.42"
 */
export function formatEtaDisplay(
  minutes: number,
  estimatedAtIso: string | undefined,
  mode: EtaDisplayMode
): string {
  const minStr = formatEtaMinutes(minutes);
  const timeStr = estimatedAtIso ? `Perkiraan ${formatEstimatedTime(estimatedAtIso)}` : null;

  if (mode === 'minutes_only' || !timeStr) return minStr;
  if (mode === 'estimated_time') return timeStr;
  return `${minStr} • ${timeStr}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Core calculation
// ─────────────────────────────────────────────────────────────────────────────

export interface EtaCalculationResult {
  estimatedPreparationMinutes: number;
  estimatedDeliveryMinutes: number;
  estimatedTotalMinutes: number;
  estimatedReadyAt: string;
  estimatedArrivalAt: string;
  etaLabel: string;
  etaUpdatedAt: string;
  etaManuallyAdjusted: boolean;
  /** Whether the delivery distance was missing (delivery only) */
  distanceMissing: boolean;
}

/**
 * Core ETA calculation.
 *
 * @param fulfillmentType - Type of order fulfillment
 * @param createdAt       - Order creation ISO string (used as base time)
 * @param settings        - ETA settings from BusinessProfile
 * @param deliveryDistanceKm - Optional distance for delivery orders
 * @returns Full ETA calculation result
 */
export function calculateOrderEta(
  fulfillmentType: FulfillmentType,
  createdAt: string,
  settings: OrderEtaSettings,
  deliveryDistanceKm?: number
): EtaCalculationResult {
  const s = { ...DEFAULT_ETA_SETTINGS, ...settings };
  const base = new Date(createdAt).getTime();
  const now = new Date().toISOString();

  let estimatedPreparationMinutes = s.defaultPreparationMinutes + s.rushHourBufferMinutes;
  let estimatedDeliveryMinutes = 0;
  let distanceMissing = false;

  if (fulfillmentType === 'dine_in') {
    estimatedPreparationMinutes += s.dineInServingBufferMinutes;
  } else if (fulfillmentType === 'pickup') {
    estimatedPreparationMinutes += s.pickupBufferMinutes;
  } else if (fulfillmentType === 'delivery') {
    if (deliveryDistanceKm && deliveryDistanceKm > 0) {
      estimatedDeliveryMinutes = s.deliveryBaseMinutes + (deliveryDistanceKm * s.deliveryMinutesPerKm);
    } else {
      estimatedDeliveryMinutes = s.deliveryBaseMinutes;
      distanceMissing = true;
    }
  }

  // Total = prep + delivery (delivery only)
  const estimatedTotalMinutes = Math.max(
    0,
    Math.round(estimatedPreparationMinutes + estimatedDeliveryMinutes)
  );

  // estimatedReadyAt = createdAt + prep minutes (when food is ready)
  const estimatedReadyAt = new Date(
    base + Math.round(estimatedPreparationMinutes) * 60 * 1000
  ).toISOString();

  // estimatedArrivalAt = createdAt + total minutes (when item arrives at customer)
  const estimatedArrivalAt = new Date(
    base + estimatedTotalMinutes * 60 * 1000
  ).toISOString();

  const etaLabel = getEtaLabel(fulfillmentType);

  return {
    estimatedPreparationMinutes: Math.round(estimatedPreparationMinutes),
    estimatedDeliveryMinutes: Math.round(estimatedDeliveryMinutes),
    estimatedTotalMinutes,
    estimatedReadyAt,
    estimatedArrivalAt,
    etaLabel,
    etaUpdatedAt: now,
    etaManuallyAdjusted: false,
    distanceMissing,
  };
}

/**
 * Calculates a preview ETA purely from settings + inputs (no order needed).
 * Used in the customer order page before checkout.
 */
export function previewOrderEta(
  fulfillmentType: FulfillmentType,
  settings: OrderEtaSettings,
  deliveryDistanceKm?: number
): { totalMinutes: number; estimatedAtIso: string; distanceMissing: boolean } {
  const createdAt = new Date().toISOString();
  const result = calculateOrderEta(fulfillmentType, createdAt, settings, deliveryDistanceKm);
  return {
    totalMinutes: result.estimatedTotalMinutes,
    estimatedAtIso: result.estimatedArrivalAt,
    distanceMissing: result.distanceMissing,
  };
}

/**
 * Adjusts existing order ETA fields by a delta of minutes (can be negative).
 * Returns updated ETA fields to be merged back into the Order.
 *
 * @param order      - The existing order
 * @param deltaMins  - Minutes to add (positive) or subtract (negative)
 * @param reason     - Cashier-provided adjustment reason
 */
export function applyEtaAdjustment(
  order: Order,
  deltaMins: number,
  reason: string
): Partial<Order> {
  const now = new Date().toISOString();
  const currentTotal = order.estimatedTotalMinutes ?? 0;
  const newTotal = Math.max(0, Math.round(currentTotal + deltaMins));
  const base = new Date(order.createdAt).getTime();

  // Re-derive ready and arrival from new total
  const prepMins = order.estimatedPreparationMinutes ?? newTotal;
  const newReadyAt = new Date(base + Math.round(prepMins + deltaMins) * 60 * 1000).toISOString();
  const newArrivalAt = new Date(base + newTotal * 60 * 1000).toISOString();

  return {
    estimatedTotalMinutes: newTotal,
    estimatedReadyAt: newReadyAt,
    estimatedArrivalAt: newArrivalAt,
    etaManuallyAdjusted: true,
    etaAdjustmentReason: reason,
    etaUpdatedAt: now,
  };
}
