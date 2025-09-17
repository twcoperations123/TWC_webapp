import { useState, useEffect } from "react";
import { 
  Settings as SettingsIcon, 
  User, 
  Bell, 
  Camera,
  Save,
  RefreshCw,
  Phone,
  Clock,
  Shield,
  Eye,
  EyeOff
} from "lucide-react";
import { AdminSettingsService, getDefaultSettings, type AdminSettingsData, type DayHours } from "../../services/adminSettingsService";
import { useNavigationProgress } from "../../contexts/NavigationProgressContext";
import { supabase } from "../../lib/supabase";

export default function AdminSettings() {
  const { getPreloadedData } = useNavigationProgress();
  const defaultSettings = getDefaultSettings();

  // Try to get preloaded settings first, then fall back to defaults
  const preloadedSettings = getPreloadedData('admin-settings-page');
  const initialSettings = preloadedSettings || defaultSettings;

  const [settings, setSettings] = useState<AdminSettingsData>(initialSettings);
  const [originalSettings, setOriginalSettings] = useState<AdminSettingsData>(initialSettings);
  const [isLoadingSettings, setIsLoadingSettings] = useState(!preloadedSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Account management state
  const [currentAdminUser, setCurrentAdminUser] = useState<{ email: string; username: string } | null>(null);
  const [accountForm, setAccountForm] = useState({
    newEmail: '',
    newUsername: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    newPassword: false,
    confirmPassword: false
  });

  // Password confirmation modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalType, setPasswordModalType] = useState<'save' | 'reset'>('save');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);

  // Check if there are unsaved changes
  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings) ||
    accountForm.newEmail.length > 0 ||
    accountForm.newUsername.length > 0 ||
    accountForm.newPassword.length > 0;

  const handleBusinessHoursChange = (day: keyof AdminSettingsData['businessHours'], field: keyof DayHours, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day],
          [field]: value
        }
      }
    }));
  };

  const handleDeliverySettingsChange = (field: keyof AdminSettingsData['deliverySettings'], value: string | boolean | number | string[]) => {
    setSettings(prev => ({
      ...prev,
      deliverySettings: {
        ...prev.deliverySettings,
        [field]: value
      }
    }));
  };

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        handleInputChange('profileImage', result);
        
        // Note: The profile image will be saved to Supabase when the user clicks "Save Changes"
        // We don't immediately update other components here to avoid localStorage dependency
      };
      reader.readAsDataURL(file);
    }
  };

  // Load settings from Supabase on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // If we have preloaded settings, use them and skip the API call
        if (preloadedSettings) {
          console.log('Using preloaded admin settings');
          setSettings(preloadedSettings);
          setOriginalSettings(preloadedSettings);
          setIsLoadingSettings(false);
          
          // Still load admin user info since it wasn't preloaded
          try {
            const adminUser = await AdminSettingsService.getCurrentAdminUser();
            setCurrentAdminUser(adminUser);
            if (adminUser) {
              setAccountForm(prev => ({ 
                ...prev, 
                newEmail: '', 
                newUsername: ''
              }));
            }
          } catch (userError) {
            console.log('Failed to load admin user info:', userError);
          }
          
          setLastSaved(new Date());
          return;
        }

        // No preloaded data, load normally
        console.log('Loading admin settings from API');
        setIsLoadingSettings(true);
        
        // Initialize settings if they don't exist
        await AdminSettingsService.initializeSettings();
        
        // Load the settings
        const loadedSettings = await AdminSettingsService.getSettings();
        setSettings(loadedSettings);
        setOriginalSettings(loadedSettings); // Track original state for unsaved changes
        
        // Load current admin user info
        const adminUser = await AdminSettingsService.getCurrentAdminUser();
        setCurrentAdminUser(adminUser);
        if (adminUser) {
          setAccountForm(prev => ({ 
            ...prev, 
            newEmail: '', // Start with empty field for new email
            newUsername: '' // Start with empty field for new username too
          }));
        }
        
        setLastSaved(new Date());
        setIsLoadingSettings(false);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSaveMessage({ type: 'error', text: 'Failed to load settings from database' });
        const defaults = getDefaultSettings();
        setSettings(defaults);
        setOriginalSettings(defaults);
        setIsLoadingSettings(false);
      }
    };

    loadSettings();
  }, [preloadedSettings]); // Depend on preloadedSettings

  const handleInputChange = (field: keyof AdminSettingsData, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Apply formatting based on number of digits
    if (digits.length <= 3) {
      return digits;
    } else if (digits.length <= 6) {
      return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    } else if (digits.length <= 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    } else {
      // For numbers longer than 10 digits, shift the pattern forward
      // 11 digits: 1-234-567-8900 (1 + 3 + 3 + 4 = 11)
      // 12 digits: 12-345-678-9012 (2 + 3 + 3 + 4 = 12)
      // 13 digits: 123-456-789-0123 (3 + 3 + 3 + 4 = 13)
      
      const lastGroupSize = 4;
      const remainingDigits = digits.length - lastGroupSize;
      
      if (remainingDigits <= 3) {
        // Simple case: first group gets all remaining digits
        const firstGroup = digits.slice(0, remainingDigits);
        const lastGroup = digits.slice(remainingDigits);
        return `${firstGroup}-${lastGroup}`;
      } else if (remainingDigits <= 6) {
        // Two groups before the last group
        const firstGroupSize = remainingDigits - 3;
        const firstGroup = digits.slice(0, firstGroupSize);
        const secondGroup = digits.slice(firstGroupSize, firstGroupSize + 3);
        const lastGroup = digits.slice(firstGroupSize + 3);
        return `${firstGroup}-${secondGroup}-${lastGroup}`;
      } else {
        // Three groups before the last group (our main case)
        const firstGroupSize = remainingDigits - 6; // For 11 digits: 7 - 6 = 1
        const firstGroup = digits.slice(0, firstGroupSize);
        const secondGroup = digits.slice(firstGroupSize, firstGroupSize + 3);
        const thirdGroup = digits.slice(firstGroupSize + 3, firstGroupSize + 6);
        const lastGroup = digits.slice(firstGroupSize + 6);
        return `${firstGroup}-${secondGroup}-${thirdGroup}-${lastGroup}`;
      }
    }
  };

  const handlePhoneNumberChange = (value: string) => {
    const formatted = formatPhoneNumber(value);
    handleInputChange('phoneNumber', formatted);
  };

  const handleSave = async () => {
    // Validate account changes first
    const usernameChanged = accountForm.newUsername.length > 0 && currentAdminUser && accountForm.newUsername !== currentAdminUser.username;
    const passwordChanged = accountForm.newPassword.length > 0;
    
    // Validate account changes if any
    if (usernameChanged) {
      if (accountForm.newUsername.length < 3) {
        setSaveMessage({ type: 'error', text: 'Username must be at least 3 characters long' });
        return;
      }
      
      if (!/^[a-zA-Z0-9_]+$/.test(accountForm.newUsername)) {
        setSaveMessage({ type: 'error', text: 'Username can only contain letters, numbers, and underscores' });
        return;
      }
    }

    if (passwordChanged) {
      if (accountForm.newPassword.length < 6) {
        setSaveMessage({ type: 'error', text: 'New password must be at least 6 characters long' });
        return;
      }

      if (accountForm.newPassword !== accountForm.confirmPassword) {
        setSaveMessage({ type: 'error', text: 'New password and confirmation do not match' });
        return;
      }
    }

    // Show password confirmation modal
    setPasswordModalType('save');
    setShowPasswordModal(true);
  };

  const handleReset = async () => {
    // Show password confirmation modal for reset
    setPasswordModalType('reset');
    setShowPasswordModal(true);
  };

  const handlePasswordConfirm = async () => {
    if (!currentPasswordInput) {
      setSaveMessage({ type: 'error', text: 'Current password is required' });
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);
    
    try {
      // Verify password by attempting authentication
      const currentUser = await AdminSettingsService.getCurrentAdminUser();
      if (!currentUser) {
        throw new Error('Failed to get current user');
      }

      // Test authentication with provided password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: currentPasswordInput
      });

      if (authError) {
        throw new Error('Current password is incorrect');
      }

      if (passwordModalType === 'save') {
        await handleSaveWithPassword();
      } else {
        await handleResetWithPassword();
      }

      // Close modal and clear password
      setShowPasswordModal(false);
      setCurrentPasswordInput('');
      
    } catch (error: any) {
      console.error('Failed to verify password:', error);
      setSaveMessage({ type: 'error', text: error.message || 'Failed to verify password. Please try again.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveWithPassword = async () => {
    // Check if there are account changes to save
    const emailChanged = accountForm.newEmail.length > 0 && currentAdminUser && accountForm.newEmail !== currentAdminUser.email;
    const usernameChanged = accountForm.newUsername.length > 0 && currentAdminUser && accountForm.newUsername !== currentAdminUser.username;
    const passwordChanged = accountForm.newPassword.length > 0;

    // Save general settings first
    await AdminSettingsService.updateSettings(settings);

    // Save account changes if any
    if (emailChanged || usernameChanged || passwordChanged) {
      const updateData: {
        currentPassword: string;
        newEmail?: string;
        newUsername?: string;
        newPassword?: string;
      } = {
        currentPassword: currentPasswordInput
      };

      if (emailChanged) {
        updateData.newEmail = accountForm.newEmail;
      }

      if (usernameChanged) {
        updateData.newUsername = accountForm.newUsername;
      }

      if (passwordChanged) {
        updateData.newPassword = accountForm.newPassword;
      }

      await AdminSettingsService.updateAdminAccount(updateData);

      // Update current user info
      const updatedUser = await AdminSettingsService.getCurrentAdminUser();
      setCurrentAdminUser(updatedUser);

      // Clear the account form
      setAccountForm({
        newEmail: '',
        newUsername: '',
        newPassword: '',
        confirmPassword: ''
      });
    }

    const now = new Date();
    setLastSaved(now);
    setOriginalSettings(settings); // Update original settings after successful save
    
    // Trigger custom event to notify other components of the update
    window.dispatchEvent(new CustomEvent('adminSettingsUpdated', {
      detail: settings
    }));
    
    let successMessage = 'Settings saved successfully!';
    if (emailChanged) {
      successMessage += ' Please check your new email for verification.';
    }
    
    setSaveMessage({ type: 'success', text: successMessage });
    
    // Clear success message after 3 seconds
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleResetWithPassword = async () => {
    await AdminSettingsService.resetToDefaults();
    
    const defaultSettings = getDefaultSettings();
    setSettings(defaultSettings);
    setOriginalSettings(defaultSettings); // Update original settings after reset
    setSaveMessage({ type: 'success', text: 'Settings reset to defaults' });
    setTimeout(() => setSaveMessage(null), 3000);
    
    // Trigger custom event to notify other components of the update
    window.dispatchEvent(new CustomEvent('adminSettingsUpdated', {
      detail: defaultSettings
    }));
  };

  const handleAccountFormChange = (field: keyof typeof accountForm, value: string) => {
    setAccountForm(prev => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (field: keyof typeof showPasswords) => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  // Show loading state if we're still loading settings
  if (isLoadingSettings) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-48"></div>
            </div>
            <div className="h-10 bg-gray-200 rounded w-32"></div>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <SettingsIcon className="w-8 h-8 mr-3 text-emerald-600" />
            Admin Settings
          </h1>
          <p className="text-gray-600 mt-1">Configure admin account settings</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Last saved: {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={hasUnsavedChanges ? handleSave : undefined}
            disabled={isSaving || !hasUnsavedChanges}
            className={`px-6 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
              hasUnsavedChanges 
                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                : 'bg-gray-400 text-white cursor-not-allowed'
            } disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            <span>
              {isSaving ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
            </span>
          </button>
        </div>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`p-4 rounded-lg border ${
          saveMessage.type === 'success' 
            ? 'bg-green-50 border-green-200 text-green-800' 
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          <p className="text-sm font-medium">{saveMessage.text}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Information */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Phone className="w-5 h-5 text-emerald-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Contact Information</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => handleInputChange('adminEmail', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={settings.phoneNumber}
                onChange={(e) => handlePhoneNumberChange(e.target.value)}
                placeholder="123-456-7890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> This information is used for the customer to contact support.
              </p>
            </div>
          </div>
        </div>

        {/* Profile Management */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Camera className="w-5 h-5 text-emerald-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Profile Management</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Display Name
                {settings.displayName !== originalSettings.displayName && (
                  <span className="ml-2 text-xs text-orange-600 font-medium">
                    • Unsaved changes
                  </span>
                )}
              </label>
              <input
                type="text"
                value={settings.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Enter new display name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-sm text-gray-500 mt-1">This is the name that appears next to your profile picture</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Picture
                {settings.profileImage !== originalSettings.profileImage && (
                  <span className="ml-2 text-xs text-orange-600 font-medium">
                    • Unsaved changes
                  </span>
                )}
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {settings.profileImage ? (
                    <img 
                      src={settings.profileImage} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="w-10 h-10 text-gray-400" />
                  )}
                </div>
                <div>
                  <input
                    id="profile-image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleProfileImageChange}
                    className="hidden"
                  />
                  <label 
                    htmlFor="profile-image-upload"
                    className="cursor-pointer px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors inline-flex items-center space-x-2"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Upload Picture</span>
                  </label>
                  {settings.profileImage && (
                    <button
                      onClick={() => {
                        handleInputChange('profileImage', '');
                        // Note: Changes will be saved to Supabase when user clicks "Save Changes"
                      }}
                      className="ml-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Account Management */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Shield className="w-5 h-5 text-emerald-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Account Management</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Username: {currentAdminUser?.username || 'Loading...'}
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Username
              </label>
              <input
                type="text"
                value={accountForm.newUsername}
                onChange={(e) => handleAccountFormChange('newUsername', e.target.value)}
                placeholder="Enter new username"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Username must be at least 3 characters and can only contain letters, numbers, and underscores
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Email: {currentAdminUser?.email || 'Loading...'}
              </label>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Email Address
              </label>
              <input
                type="email"
                value={accountForm.newEmail}
                onChange={(e) => handleAccountFormChange('newEmail', e.target.value)}
                placeholder="Enter new email address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.newPassword ? "text" : "password"}
                  value={accountForm.newPassword}
                  onChange={(e) => handleAccountFormChange('newPassword', e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('newPassword')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPasswords.newPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Password must be at least 6 characters long
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirmPassword ? "text" : "password"}
                  value={accountForm.confirmPassword}
                  onChange={(e) => handleAccountFormChange('confirmPassword', e.target.value)}
                  placeholder="Confirm your new password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  disabled={!accountForm.newPassword}
                />
                <button
                  type="button"
                  onClick={() => togglePasswordVisibility('confirmPassword')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  disabled={!accountForm.newPassword}
                >
                  {showPasswords.confirmPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
            <div className="flex items-start">
              <Shield className="w-5 h-5 text-blue-700 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium text-blue-900">Security Reminder</h4>
                <p className="text-sm text-blue-700 mt-1">
                  After updating your account information, make sure to write down your new credentials in a secure location. 
                  You'll need to use the new credentials for future logins.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-emerald-600 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          </div>
          
          <div className="space-y-6">
            {/* Notifications Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Bell className="w-4 h-4 text-emerald-600 mr-2" />
                Notifications
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Email
                </label>
                <input
                  type="email"
                  value={settings.notificationEmail}
                  onChange={(e) => handleInputChange('notificationEmail', e.target.value)}
                  placeholder="notifications@restaurant.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                />
                <p className="text-sm text-gray-500 mt-1">Email address for receiving order and support ticket notifications</p>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email Notifications
                  </label>
                  <p className="text-sm text-gray-500">Receive order and system notifications via email</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableEmailNotifications}
                    onChange={(e) => handleInputChange('enableEmailNotifications', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enableEmailNotifications ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enableEmailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                </label>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    SMS Notifications
                  </label>
                  <p className="text-sm text-gray-500">Receive urgent notifications via SMS</p>
                </div>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.enableSMSNotifications}
                    onChange={(e) => handleInputChange('enableSMSNotifications', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.enableSMSNotifications ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.enableSMSNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <Clock className="w-5 h-5 text-emerald-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Active Hours</h2>
        </div>
        
        <div className="space-y-4">
          {Object.entries(settings.businessHours).map(([day, hours]) => (
            <div key={day} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="w-24">
                  <span className="text-sm font-medium text-gray-900 capitalize">{day}</span>
                </div>
                
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hours.isOpen}
                    onChange={(e) => handleBusinessHoursChange(day as keyof AdminSettingsData['businessHours'], 'isOpen', e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    hours.isOpen ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      hours.isOpen ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </div>
                  <span className="ml-2 text-sm text-gray-600">
                    {hours.isOpen ? 'Open' : 'Closed'}
                  </span>
                </label>
              </div>
              
              {hours.isOpen && (
                <div className="flex items-center space-x-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Open</label>
                    <input
                      type="time"
                      value={hours.openTime}
                      onChange={(e) => handleBusinessHoursChange(day as keyof AdminSettingsData['businessHours'], 'openTime', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <span className="text-gray-400">-</span>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Close</label>
                    <input
                      type="time"
                      value={hours.closeTime}
                      onChange={(e) => handleBusinessHoursChange(day as keyof AdminSettingsData['businessHours'], 'closeTime', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700">
            <strong>Note:</strong> These hours will be used to show customers when orders can be placed and for delivery scheduling.
          </p>
        </div>
      </div>

      {/* Delivery Settings */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-center mb-4">
          <SettingsIcon className="w-5 h-5 text-emerald-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Delivery Settings</h2>
        </div>
        
        <div className="space-y-6">
          {/* Enable/Disable Delivery */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Enable Delivery Service</h3>
              <p className="text-sm text-gray-500">Turn delivery on or off for all customers</p>
            </div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.deliverySettings.enabled}
                onChange={(e) => handleDeliverySettingsChange('enabled', e.target.checked)}
                className="sr-only"
              />
              <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.deliverySettings.enabled ? 'bg-emerald-600' : 'bg-gray-200'
              }`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.deliverySettings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </div>
              <span className="ml-2 text-sm text-gray-600">
                {settings.deliverySettings.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          {settings.deliverySettings.enabled && (
            <>
              {/* Delivery Slot Duration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Delivery Slot Duration (minutes)
                  </label>
                  <select
                    value={settings.deliverySettings.deliverySlotDuration}
                    onChange={(e) => handleDeliverySettingsChange('deliverySlotDuration', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={180}>3 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">How long each delivery time slot lasts</p>
                </div>

                {/* Advance Notice Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Advance Notice (hours)
                  </label>
                  <select
                    value={settings.deliverySettings.advanceNoticeHours}
                    onChange={(e) => handleDeliverySettingsChange('advanceNoticeHours', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value={1}>1 hour</option>
                    <option value={4}>4 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Minimum time customers must order in advance</p>
                </div>
              </div>

              {/* Max Days in Advance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Days to Book in Advance
                </label>
                <select
                  value={settings.deliverySettings.maxDaysInAdvance}
                  onChange={(e) => handleDeliverySettingsChange('maxDaysInAdvance', parseInt(e.target.value))}
                  className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value={3}>3 days</option>
                  <option value={7}>1 week</option>
                  <option value={14}>2 weeks</option>
                  <option value={30}>1 month</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">How far in advance customers can book deliveries</p>
              </div>

              {/* Unavailable Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unavailable Dates
                </label>
                <div className="space-y-2">
                  {settings.deliverySettings.unavailableDates.map((date, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          const newDates = [...settings.deliverySettings.unavailableDates];
                          newDates[index] = e.target.value;
                          handleDeliverySettingsChange('unavailableDates', newDates);
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                      />
                      <button
                        onClick={() => {
                          const newDates = settings.deliverySettings.unavailableDates.filter((_, i) => i !== index);
                          handleDeliverySettingsChange('unavailableDates', newDates);
                        }}
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const today = new Date().toISOString().split('T')[0];
                      handleDeliverySettingsChange('unavailableDates', [...settings.deliverySettings.unavailableDates, today]);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Add Unavailable Date
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Dates when delivery is not available (holidays, maintenance, etc.)</p>
              </div>
            </>
          )}
        </div>
        
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-700">
            <strong>Note:</strong> Delivery slots will be generated based on your business hours and these settings. 
            Customers will only see available slots during your open hours.
          </p>
        </div>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <Shield className="w-6 h-6 text-emerald-600 mr-3" />
              <h2 className="text-xl font-semibold text-gray-900">
                Confirm Password
              </h2>
            </div>
            
            <p className="text-gray-600 mb-4">
              {passwordModalType === 'save' 
                ? 'Please enter your current password to save these settings:' 
                : 'Please enter your current password to reset settings to defaults:'}
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setCurrentPasswordInput('');
                  setShowCurrentPassword(false);
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordConfirm}
                disabled={isSaving || !currentPasswordInput}
                className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  isSaving || !currentPasswordInput
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700'
                }`}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Confirm</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}