// src/lib/services/planService.ts

import { supabaseClient } from '../supabase/client';
import { Plan, BusinessSubscription } from '../../types';

export const planService = {
  /**
   * Fetches all active plans from Supabase.
   */
  async getActivePlans(): Promise<Plan[]> {
    const { data, error } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching plans:', error.message);
      throw error;
    }

    return (data || []).map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      priceMonthly: row.price_monthly,
      productLimit: row.product_limit,
      orderLimitMonthly: row.order_limit_monthly,
      cashierLimit: row.cashier_limit,
      aiEnabled: row.ai_enabled,
      midtransEnabled: row.midtrans_enabled,
      reportExportEnabled: row.report_export_enabled,
      isActive: row.is_active,
      sortOrder: row.sort_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  /**
   * Fetches the current subscription details for a business.
   */
  async getBusinessSubscription(businessId: string): Promise<BusinessSubscription | null> {
    const { data, error } = await supabaseClient
      .from('business_subscriptions')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching business subscription:', error.message);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      businessId: data.business_id,
      planId: data.plan_id,
      status: data.status,
      startedAt: data.started_at,
      trialEndsAt: data.trial_ends_at,
      currentPeriodStart: data.current_period_start,
      currentPeriodEnd: data.current_period_end,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /**
   * Retrieves a plan by its plan code.
   */
  async getPlanByCode(code: string): Promise<Plan | null> {
    const { data, error } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('Error fetching plan by code:', error.message);
      throw error;
    }

    if (!data) return null;

    return {
      id: data.id,
      code: data.code,
      name: data.name,
      description: data.description,
      priceMonthly: data.price_monthly,
      productLimit: data.product_limit,
      orderLimitMonthly: data.order_limit_monthly,
      cashierLimit: data.cashier_limit,
      aiEnabled: data.ai_enabled,
      midtransEnabled: data.midtrans_enabled,
      reportExportEnabled: data.report_export_enabled,
      isActive: data.is_active,
      sortOrder: data.sort_order,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  canUseAI(plan?: Plan | null): boolean {
    return plan?.aiEnabled ?? false;
  },

  canUseMidtrans(plan?: Plan | null): boolean {
    return plan?.midtransEnabled ?? false;
  },

  canExportReport(plan?: Plan | null): boolean {
    return plan?.reportExportEnabled ?? false;
  },

  getProductLimit(plan?: Plan | null): number {
    return plan?.productLimit ?? 20;
  },

  getOrderLimit(plan?: Plan | null): number {
    return plan?.orderLimitMonthly ?? 100;
  }
};
