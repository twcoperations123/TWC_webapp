import { supabase } from '../lib/supabase';

export interface DayHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface DeliverySettings {
  enabled: boolean;
  deliverySlotDuration: number; // in minutes (e.g., 120 for 2-hour slots)
  advanceNoticeHours: number; // minimum hours in advance for booking
  maxDaysInAdvance: number; // how many days ahead customers can book
  unavailableDates: string[]; // array of dates in YYYY-MM-DD format
}

export interface AdminSettingsData {
  adminEmail: string;
  phoneNumber: string;
  enableEmailNotifications: boolean;
  enableSMSNotifications: boolean;
  notificationEmail: string;
  profileImage: string;
  displayName: string;
  businessHours: {
    monday: DayHours;
    tuesday: DayHours;
    wednesday: DayHours;
    thursday: DayHours;
    friday: DayHours;
    saturday: DayHours;
    sunday: DayHours;
  };
  deliverySettings: DeliverySettings;
}

export const getDefaultSettings = (): AdminSettingsData => ({
  adminEmail: "admin@gmail.com",
  phoneNumber: "",
  enableEmailNotifications: true,
  enableSMSNotifications: false,
  notificationEmail: "",
  profileImage: "",
  displayName: "Admin User",
  businessHours: {
    monday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    tuesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    wednesday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    thursday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    friday: { isOpen: true, openTime: "09:00", closeTime: "17:00" },
    saturday: { isOpen: true, openTime: "10:00", closeTime: "22:00" },
    sunday: { isOpen: false, openTime: "09:00", closeTime: "17:00" }
  },
  deliverySettings: {
    enabled: true,
    deliverySlotDuration: 120, // 2-hour delivery slots
    advanceNoticeHours: 24, // 24 hours advance notice
    maxDaysInAdvance: 7, // can book up to 7 days ahead
    unavailableDates: [] // no blackout dates by default
  }
});

export class AdminSettingsService {
  static async getSettings(): Promise<AdminSettingsData> {
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single();

    if (error) {
      console.error('Failed to load settings from Supabase:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No admin settings found');
    }

    // Map database fields to component state
    return {
      adminEmail: data.admin_email,
      phoneNumber: data.phone_number || '',
      enableEmailNotifications: data.enable_email_notifications,
      enableSMSNotifications: data.enable_sms_notifications,
      notificationEmail: data.notification_email || '',
      profileImage: data.profile_image || '',
      displayName: data.display_name || 'Admin User',
      businessHours: data.business_hours || getDefaultSettings().businessHours,
      deliverySettings: data.delivery_settings || getDefaultSettings().deliverySettings
    };
  }

  static async updateSettings(settings: AdminSettingsData): Promise<void> {
    // Get the first (and only) admin settings record
    const { data: existingData, error: fetchError } = await supabase
      .from('admin_settings')
      .select('id')
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Map component state to database fields
    const dbSettings = {
      admin_email: settings.adminEmail,
      phone_number: settings.phoneNumber || null,
      enable_email_notifications: settings.enableEmailNotifications,
      enable_sms_notifications: settings.enableSMSNotifications,
      notification_email: settings.notificationEmail || null,
      profile_image: settings.profileImage || null,
      display_name: settings.displayName || null,
      business_hours: settings.businessHours,
      delivery_settings: settings.deliverySettings
    };

    const { error } = await supabase
      .from('admin_settings')
      .update(dbSettings)
      .eq('id', existingData.id);

    if (error) {
      throw error;
    }
  }

  static async resetToDefaults(): Promise<void> {
    const defaultSettings = getDefaultSettings();
    await this.updateSettings(defaultSettings);
  }

  static async initializeSettings(): Promise<void> {
    // Check if settings already exist
    const { error } = await supabase
      .from('admin_settings')
      .select('id')
      .single();

    // If no settings exist, create default ones
    if (error && error.code === 'PGRST116') {
      const defaultSettings = getDefaultSettings();
      const dbSettings = {
        admin_email: defaultSettings.adminEmail,
        phone_number: defaultSettings.phoneNumber || null,
        enable_email_notifications: defaultSettings.enableEmailNotifications,
        enable_sms_notifications: defaultSettings.enableSMSNotifications,
        notification_email: defaultSettings.notificationEmail || null,
        profile_image: defaultSettings.profileImage || null,
        display_name: defaultSettings.displayName || null,
        business_hours: defaultSettings.businessHours,
        delivery_settings: defaultSettings.deliverySettings
      };

      const { error: insertError } = await supabase
        .from('admin_settings')
        .insert([dbSettings]);

      if (insertError) {
        throw insertError;
      }
    } else if (error) {
      throw error;
    }
  }

  /**
   * Update admin account email, password, and username
   * This updates both the Supabase Auth user and the users table
   */
  static async updateAdminAccount(data: {
    newEmail?: string;
    newPassword?: string;
    newUsername?: string;
    currentPassword: string;
  }): Promise<void> {
    // First, verify the current password by attempting to sign in
    const { data: currentUser, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError || !currentUser.user) {
      throw new Error('Failed to get current user');
    }

    // Re-authenticate with current password to verify it
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: currentUser.user.email!,
      password: data.currentPassword
    });

    if (authError) {
      throw new Error('Current password is incorrect');
    }

    // Update email in Supabase Auth if provided
    if (data.newEmail) {
      const { error: emailError } = await supabase.auth.updateUser({
        email: data.newEmail
      });

      if (emailError) {
        throw new Error(`Failed to update email: ${emailError.message}`);
      }

      // Update email in the users table as well
      const { error: updateUserError } = await supabase
        .from('users')
        .update({ email: data.newEmail })
        .eq('email', currentUser.user.email!);

      if (updateUserError) {
        throw new Error(`Failed to update user email in database: ${updateUserError.message}`);
      }
    }

    // Update username in the users table if provided
    if (data.newUsername) {
      // Check if username is already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('username', data.newUsername)
        .neq('email', currentUser.user.email!)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw new Error('Failed to check username availability');
      }

      if (existingUser) {
        throw new Error('Username is already taken');
      }

      // Update username in the users table
      const { error: updateUsernameError } = await supabase
        .from('users')
        .update({ username: data.newUsername })
        .eq('email', currentUser.user.email!);

      if (updateUsernameError) {
        throw new Error(`Failed to update username: ${updateUsernameError.message}`);
      }
    }

    // Update password in Supabase Auth if provided
    if (data.newPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (passwordError) {
        throw new Error(`Failed to update password: ${passwordError.message}`);
      }
    }
  }

  /**
   * Get current admin user info
   */
  static async getCurrentAdminUser(): Promise<{ email: string; username: string } | null> {
    const { data: currentUser, error: getUserError } = await supabase.auth.getUser();
    
    if (getUserError || !currentUser.user) {
      return null;
    }

    // Get additional user info from users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('username, email')
      .eq('email', currentUser.user.email!)
      .single();

    if (profileError || !userProfile) {
      return { email: currentUser.user.email!, username: '' };
    }

    return {
      email: userProfile.email,
      username: userProfile.username
    };
  }
}
