import { supabaseClient } from '../supabase/client';
import { profileService } from './profileService';
import { User } from '@supabase/supabase-js';

export const authService = {
  /**
   * Signs in a user using email and password via Supabase Auth.
   */
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  /**
   * Registers a user via Supabase Auth, verifies business existence,
   * and inserts their user profile.
   */
  async signUpWithEmail(
    email: string,
    password: string,
    fullName: string,
    role: 'admin' | 'cashier',
    businessId = 'biz-1'
  ) {
    // Check if the business exists in businesses table
    const { data: business, error: bizError } = await supabaseClient
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .maybeSingle();

    if (bizError) {
      console.error('Error checking business existence:', bizError);
    }

    if (!business) {
      throw new Error(
        'Bisnis default ("biz-1") tidak ditemukan di database. Silakan jalankan script seed.sql terlebih dahulu di SQL Editor Supabase Anda.'
      );
    }

    // Sign up user
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) throw error;

    const user = data.user;
    if (!user) {
      throw new Error('Pendaftaran akun gagal. Silakan coba kembali.');
    }

    // Create the profile record
    try {
      await profileService.createProfileForUser(user.id, businessId, fullName, email, role);
    } catch (profileError) {
      console.error('Error creating profile for user:', profileError);
      throw profileError;
    }

    return data;
  },

  /**
   * Sign out the active user session.
   */
  async signOut() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) throw error;
  },

  /**
   * Retrieves the currently active auth user data.
   */
  async getCurrentUser(): Promise<User | null> {
    const { data: { user } } = await supabaseClient.auth.getUser();
    return user;
  },

  /**
   * Retrieves the current session.
   */
  async getCurrentSession() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    return session;
  },

  /**
   * Retrieves the current user's profile from the database.
   */
  async getCurrentProfile() {
    const user = await this.getCurrentUser();
    if (!user) return null;
    return profileService.getProfileByUserId(user.id);
  },

  /**
   * Helper to retrieve the current user's authorization role.
   */
  async getUserRole(): Promise<'admin' | 'cashier' | null> {
    const profile = await this.getCurrentProfile();
    return profile ? profile.role : null;
  },

  /**
   * Checks if user is currently authenticated.
   */
  async isAuthenticated(): Promise<boolean> {
    const user = await this.getCurrentUser();
    return user !== null;
  },

  /**
   * Helper checking if the authenticated user is an admin.
   */
  async isAdmin(): Promise<boolean> {
    const role = await this.getUserRole();
    return role === 'admin';
  },

  /**
   * Helper checking if the authenticated user is a cashier.
   */
  async isCashier(): Promise<boolean> {
    const role = await this.getUserRole();
    return role === 'cashier';
  },
};
