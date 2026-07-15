export const TRIAL_DAYS = 7;

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'cancelled' | string;

export interface SubscriptionStateInput {
  plan_code?: string | null;
  subscription_status?: SubscriptionStatus | null;
  trial_ends_at?: string | null;
}

export interface SubscriptionAccessState {
  planCode: string;
  status: SubscriptionStatus;
  effectiveStatus: SubscriptionStatus;
  isLocked: boolean;
  isTrialing: boolean;
  isTrialExpired: boolean;
  trialEndsAt: string | null;
  daysRemaining: number | null;
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getTrialEndDate(from = new Date()): Date {
  return new Date(from.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function normalizeOwnerEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function getSubscriptionAccessState(
  input?: SubscriptionStateInput | null,
  now = new Date()
): SubscriptionAccessState {
  const hasSubscriptionInput = Boolean(
    input?.plan_code || input?.subscription_status || input?.trial_ends_at
  );
  const status = input?.subscription_status || (hasSubscriptionInput ? 'past_due' : 'active');
  const planCode = input?.plan_code || 'starter';
  const trialEndsAt = input?.trial_ends_at || null;
  const trialEndDate = parseDate(trialEndsAt);
  const hasActiveTrialWindow = Boolean(trialEndDate && trialEndDate.getTime() > now.getTime());
  const isTrialing = status === 'trialing' || (status === 'past_due' && hasActiveTrialWindow);
  const isTrialExpired = Boolean(
    (status === 'trialing' || status === 'past_due') &&
      trialEndDate &&
      trialEndDate.getTime() <= now.getTime()
  );
  const isLocked = status === 'cancelled' || (!hasActiveTrialWindow && (status === 'past_due' || isTrialExpired));
  const daysRemaining = trialEndDate
    ? Math.max(0, Math.ceil((trialEndDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  return {
    planCode,
    status,
    effectiveStatus: isTrialExpired ? 'past_due' : isTrialing ? 'trialing' : status,
    isLocked,
    isTrialing,
    isTrialExpired,
    trialEndsAt,
    daysRemaining,
  };
}
