import { RealtimeChannel } from '@supabase/supabase-js';
import { supabaseClient } from '../supabase/client';

export interface RealtimeChangesPayload {
  eventType: string;
  new: Record<string, unknown>;
  old: Record<string, unknown>;
}

type RealtimeCallback = Parameters<RealtimeChannel['on']>[2];

export const realtimeService = {
  /**
   * Subscribe to changes in the orders table for a specific business ID
   */
  subscribeToOrdersByBusinessId(
    businessId: string,
    callback: (payload: RealtimeChangesPayload) => void
  ): RealtimeChannel {
    const channel = supabaseClient
      .channel(`orders-biz-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `business_id=eq.${businessId}`
        },
        callback as unknown as RealtimeCallback
      )
      .subscribe();
    return channel;
  },

  /**
   * Subscribe to changes for a specific order ID (mainly status updates)
   */
  subscribeToOrderById(
    orderId: string,
    callback: (payload: RealtimeChangesPayload) => void
  ): RealtimeChannel {
    const channel = supabaseClient
      .channel(`order-detail-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        callback as unknown as RealtimeCallback
      )
      .subscribe();
    return channel;
  },

  /**
   * Subscribe to changes in the order_items table for a specific order ID
   */
  subscribeToOrderItemsByOrderId(
    orderId: string,
    callback: (payload: RealtimeChangesPayload) => void
  ): RealtimeChannel {
    const channel = supabaseClient
      .channel(`order-items-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'order_items',
          filter: `order_id=eq.${orderId}`
        },
        callback as unknown as RealtimeCallback
      )
      .subscribe();
    return channel;
  },

  /**
   * Subscribe to changes in the transactions table for a specific business ID
   */
  subscribeToTransactionsByBusinessId(
    businessId: string,
    callback: (payload: RealtimeChangesPayload) => void
  ): RealtimeChannel {
    const channel = supabaseClient
      .channel(`transactions-biz-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `business_id=eq.${businessId}`
        },
        callback as unknown as RealtimeCallback
      )
      .subscribe();
    return channel;
  },

  /**
   * Subscribe to changes in the products table for a specific business ID
   */
  subscribeToProductsByBusinessId(
    businessId: string,
    callback: (payload: RealtimeChangesPayload) => void
  ): RealtimeChannel {
    const channel = supabaseClient
      .channel(`products-biz-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `business_id=eq.${businessId}`
        },
        callback as unknown as RealtimeCallback
      )
      .subscribe();
    return channel;
  },

  /**
   * Safely unsubscribe from a realtime channel
   */
  async unsubscribeChannel(channel: RealtimeChannel): Promise<void> {
    if (channel) {
      await supabaseClient.removeChannel(channel);
    }
  }
};

export type { RealtimeChannel };
