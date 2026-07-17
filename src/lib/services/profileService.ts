import { supabaseClient } from '../supabase/client';

export interface SupabaseProfile {
  id: string;
  business_id: string | null; // NULL for platform_owner
  full_name: string;
  role: 'admin' | 'cashier' | 'platform_owner';
  email: string;
  created_at: string;
  updated_at: string;
}

export const profileService = {
  /**
   * Fetches the user profile by the Supabase auth user ID.
   */
  async getProfileByUserId(userId: string): Promise<SupabaseProfile | null> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // PostgrestError: 0 rows returned
        return null;
      }
      console.error('getProfileByUserId error:', error.message);
      throw error;
    }
    return data as SupabaseProfile;
  },

  /**
   * Creates a new profile record for a registered business user.
   */
  async createProfileForUser(
    userId: string,
    businessId: string,
    fullName: string,
    email: string,
    role: 'admin' | 'cashier'
  ): Promise<SupabaseProfile> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .insert([
        {
          id: userId,
          business_id: businessId,
          full_name: fullName,
          email: email.trim().toLowerCase(),
          role,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('createProfileForUser error:', error.message);
      throw error;
    }
    return data as SupabaseProfile;
  },

  /**
   * Updates an existing profile record.
   */
  async updateProfile(
    userId: string,
    updates: Partial<Omit<SupabaseProfile, 'id' | 'created_at'>>
  ): Promise<SupabaseProfile> {
    const { data, error } = await supabaseClient
      .from('profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('updateProfile error:', error.message);
      throw error;
    }
    return data as SupabaseProfile;
  },

  /**
   * Returns the business ID associated with the current user.
   * Returns null for platform_owner accounts.
   */
  async getCurrentUserBusinessId(userId: string): Promise<string | null> {
    const profile = await this.getProfileByUserId(userId);
    return profile ? profile.business_id : null;
  },
};
