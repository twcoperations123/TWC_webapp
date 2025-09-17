import { supabase } from '../lib/supabase'
import { supabaseAdmin, hasAdminAccess } from '../lib/supabaseAdmin'
import type { Database } from '../lib/supabase'

export interface User {
  id: string
  name: string
  address: string
  username: string
  password: string
  email: string
  phoneNumber: string
  profileImage?: string
  role?: string
  comments?: string
}

export interface CreateUserData {
  name: string
  address: string
  username: string
  password: string
  email: string
  phoneNumber: string
  profileImage?: string
  role?: string
  comments?: string
}

export interface UpdateUserData {
  name?: string
  address?: string
  username?: string
  password?: string
  email?: string
  phoneNumber?: string
  profileImage?: string
  role?: string
  comments?: string
}

class UserService {
  // Get all users
  async getAllUsers(): Promise<User[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        throw error
      }

      return data?.map(this.mapDatabaseUserToAppUser) || []
    } catch (error) {
      console.error('Error in getAllUsers:', error)
      return []
    }
  }

  // Get user by ID
  async getUserById(id: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        console.error('Error fetching user:', error)
        return null
      }

      return data ? this.mapDatabaseUserToAppUser(data) : null
    } catch (error) {
      console.error('Error in getUserById:', error)
      return null
    }
  }

  // Create new user - Admin-friendly approach with comprehensive duplicate checking
  async createUser(userData: CreateUserData): Promise<User | null> {
    try {
      // EMERGENCY DEBUG MODE for hello@hello.com issue
      const isDebugEmail = userData.email === 'hello@hello.com';
      
      if (isDebugEmail) {
        console.log('🚨 EMERGENCY DEBUG MODE ACTIVATED for hello@hello.com');
        console.log('🔍 Starting comprehensive debugging...');
        
        // Direct database queries to bypass any potential issues
        console.log('🔍 Step 1: Direct auth.users check');
        try {
          const { data: directAuthCheck } = await supabase
            .rpc('get_auth_users_count', { target_email: userData.email });
          console.log('🔍 Direct auth users count:', directAuthCheck);
        } catch (rpcError) {
          console.log('🔍 RPC not available, skipping direct auth check');
        }
        
        console.log('🔍 Step 2: Direct users table check');
        const { data: directUsersCheck, error: directError } = await supabase
          .from('users')
          .select('*')
          .eq('email', userData.email);
        
        console.log('🔍 Direct users check result:', { 
          data: directUsersCheck, 
          error: directError,
          count: directUsersCheck?.length || 0 
        });
        
        console.log('🔍 Step 3: Case-insensitive check');
        const { data: caseCheck } = await supabase
          .from('users')
          .select('*')
          .ilike('email', userData.email);
        
        console.log('🔍 Case-insensitive check result:', { 
          data: caseCheck, 
          count: caseCheck?.length || 0 
        });
      }
      
      // Store current session info before creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      
      console.log('Creating user with data:', userData);
      
      // Step 1: Comprehensive existence check (both custom users and auth users)
      console.log('Checking if email exists in custom users table:', userData.email);
      const existingCustomUser = await this.checkEmailExists(userData.email);
      console.log('Email exists in custom users check result:', existingCustomUser);
      
      if (existingCustomUser) {
        throw new Error(`A user with email "${userData.email}" already exists in the system`);
      }

      // Step 2: Check if username already exists (in custom users table)
      console.log('Checking if username exists in custom users table:', userData.username);
      const existingUsername = await this.checkUsernameExists(userData.username);
      console.log('Username exists in custom users check result:', existingUsername);
      if (existingUsername) {
        throw new Error(`A user with username "${userData.username}" already exists`);
      }

      // Step 3: Check if auth user exists without custom profile (orphaned auth user)
      console.log('Checking for existing auth user with this email...');
      let existingAuth = null;
      
      if (hasAdminAccess && supabaseAdmin) {
        const { data: existingAuthUser, error: authCheckError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (!authCheckError && existingAuthUser) {
          existingAuth = existingAuthUser.users.find(user => user.email === userData.email);
          
          if (isDebugEmail) {
            console.log('🔍 Admin auth user check:', {
              total_auth_users: existingAuthUser.users.length,
              matching_auth_user: existingAuth,
              all_emails: existingAuthUser.users.map(u => u.email)
            });
          }
        }
      }
      
      if (existingAuth) {
        // Check if this auth user has a custom profile
        const { data: existingProfile } = await supabase
          .from('users')
          .select('id')
          .eq('id', existingAuth.id)
          .single();
        
        if (!existingProfile) {
          console.log('Found orphaned auth user, creating profile for existing auth user:', existingAuth.id);
          // Create profile for existing auth user instead of creating new one
          const { data: customUser, error: dbError } = await supabase
            .from('users')
            .insert({
              id: existingAuth.id,
              email: userData.email,
              name: userData.name,
              address: userData.address,
              username: userData.username,
              password: 'managed_by_supabase_auth',
              phone_number: userData.phoneNumber,
              profile_image: userData.profileImage || null,
              role: userData.role ?? 'user'
            })
            .select()
            .single();

          if (dbError) {
            console.error('Failed to create profile for orphaned auth user:', dbError);
            throw new Error(`Failed to create user profile: ${dbError.message}`);
          }

          console.log('Successfully created profile for orphaned auth user');
          return this.mapDatabaseUserToAppUser(customUser);
        } else {
          throw new Error(`A user with email "${userData.email}" already exists in the authentication system`);
        }
      }

      // Step 4: Attempt to create new auth user
      console.log('Attempting to create auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: userData.username,
            address: userData.address,  // ✅ Include address in auth metadata
            phone: userData.phoneNumber, // ✅ Include phone in auth metadata  
            role: userData.role ?? 'user'
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        if (authError.message.includes('User already registered')) {
          throw new Error(`The email "${userData.email}" is already registered. If this is an orphaned user, please contact an administrator.`);
        }
        throw new Error(`Failed to create user account: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('No user data returned from signup');
      }

      console.log('Auth user created successfully:', authData.user.id);

      // Step 5: Immediately sign out the new user to prevent session hijacking
      await supabase.auth.signOut();
      
      // Step 6: Restore admin session if it existed
      if (currentSession?.session) {
        const { error: sessionError } = await supabase.auth.setSession(currentSession.session);
        if (sessionError) {
          console.warn('Could not restore admin session:', sessionError);
        }
      }

      // Step 7: Create user record in custom users table with transaction-like retry logic
      console.log('Creating custom user profile...');
      let retries = 3;
      let customUser = null;
      let dbError = null;

      while (retries > 0 && !customUser) {
        // RACE CONDITION FIX: Re-check just before insert
        if (retries < 3) {
          console.log(`🔄 Retry ${4 - retries}: Re-checking for conflicts before insert...`);
          
          // Check if a user with this email exists
          const { data: existingUsers } = await supabase
            .from('users')
            .select('*')
            .eq('email', userData.email);
          
          if (existingUsers && existingUsers.length > 0) {
            const existingUser = existingUsers[0];
            
            // Check if it's OUR user that somehow got created (success case)
            if (existingUser.id === authData.user.id) {
              console.log('✅ SUCCESS: Our user was actually created successfully on previous attempt!');
              console.log('🎉 User details:', existingUser);
              return this.mapDatabaseUserToAppUser(existingUser);
            } else {
              // It's a different user with same email (actual race condition)
              console.log('🚨 RACE CONDITION DETECTED: Email created by different auth user');
              console.log('🔍 Existing user ID:', existingUser.id);
              console.log('🔍 Our auth user ID:', authData.user.id);
              throw new Error(`Race condition detected: Email "${userData.email}" was created by another process`);
            }
          }
          
          // Check username conflicts too
          const { data: existingUsernames } = await supabase
            .from('users')
            .select('id, username')
            .eq('username', userData.username);
            
          if (existingUsernames && existingUsernames.length > 0) {
            const existingUsernameUser = existingUsernames[0];
            
            // If it's not our user, it's a race condition
            if (existingUsernameUser.id !== authData.user.id) {
              console.log('🚨 RACE CONDITION DETECTED: Username created by different auth user');
              throw new Error(`Race condition detected: Username "${userData.username}" was created by another process`);
            }
          }
        }

        const insertData = {
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          address: userData.address,
          username: userData.username,
          password: 'managed_by_supabase_auth',
          phone_number: userData.phoneNumber,
          profile_image: userData.profileImage || null,
          role: userData.role ?? 'user'
        };

        console.log('🔍 INSERTING DATA:', {
          address: insertData.address,
          phone_number: insertData.phone_number,
          email: insertData.email,
          name: insertData.name,
          username: insertData.username
        });

        const { data, error } = await supabase
          .from('users')
          .insert(insertData)
          .select()
          .single();

        if (!error) {
          customUser = data;
          break;
        }

        dbError = error;
        retries--;
        
        console.log(`🔄 Database insert failed (${retries} attempts left):`, {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // If it's a unique constraint violation, it's likely a race condition
        if (error.code === '23505' || error.message.includes('duplicate key')) {
          console.log('🚨 UNIQUE CONSTRAINT VIOLATION - Likely race condition');
          
          if (retries > 0) {
            // Wait with exponential backoff before retry
            const waitTime = (4 - retries) * 1000; // 1s, 2s, 3s
            console.log(`⏳ Waiting ${waitTime}ms before retry to avoid race condition...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
          }
        } else {
          // For non-constraint errors, don't retry
          console.log('🛑 Non-constraint error, stopping retries');
          break;
        }
      }

      if (dbError || !customUser) {
        console.error('Database insert error after retries:', dbError);
        
        // Important: We now have an orphaned auth user that needs cleanup
        console.error(`CRITICAL: Orphaned auth user created: ${authData.user.id} (${userData.email})`);
        console.error('Attempting to clean up orphaned auth user...');
        
        // Try to delete the orphaned auth user using admin client
        try {
          console.log('🧹 Attempting to cleanup orphaned auth user...');
          console.log('🔍 Admin access available:', hasAdminAccess);
          console.log('🔍 Service role key configured:', !!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY);
          
          if (hasAdminAccess && supabaseAdmin) {
            console.log('🧹 Using admin client for cleanup...');
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            if (deleteError) {
              console.error('❌ Failed to delete orphaned auth user via admin client:', deleteError);
              console.log('🔄 Falling back to edge function...');
              await this.cleanupOrphanedAuthUser(authData.user.id);
            } else {
              console.log('✅ Successfully cleaned up orphaned auth user via admin client');
            }
          } else {
            console.log('⚠️ Admin client not available, using edge function...');
            console.log('💡 To fix: Set VITE_SUPABASE_SERVICE_ROLE_KEY in your .env file');
            await this.cleanupOrphanedAuthUser(authData.user.id);
          }
        } catch (cleanupError) {
          console.error('❌ Failed to cleanup orphaned auth user:', cleanupError);
          console.error('🛠️ Manual cleanup required for auth user:', authData.user.id);
          console.error('🛠️ Run this SQL: DELETE FROM auth.users WHERE id = \'' + authData.user.id + '\';');
        }
        
        // Provide a more helpful error message based on the constraint violation
        if (dbError?.message.includes('users_email_key') || dbError?.code === '23505') {
          throw new Error(`Database error: The email "${userData.email}" is already in use. This indicates a race condition or data inconsistency.`);
        } else if (dbError?.message.includes('users_username_key')) {
          throw new Error(`Database error: The username "${userData.username}" is already in use. This indicates a race condition or data inconsistency.`);
        } else {
          throw new Error(`Failed to create user profile: ${dbError?.message || 'Unknown database error'}. The orphaned auth user has been cleaned up.`);
        }
      }

      console.log('Custom user created successfully:', customUser);
      return this.mapDatabaseUserToAppUser(customUser);
      
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  // TEMPORARY: Create user bypassing validation (for debugging hello@hello.com issue)
  async createUserBypassValidation(userData: CreateUserData): Promise<User | null> {
    try {
      console.log('🚨 BYPASS MODE: Creating user without validation checks');
      
      // Store current session info before creating new user
      const { data: currentSession } = await supabase.auth.getSession();
      
      // Step 1: Attempt to create auth user directly
      console.log('🚨 BYPASS: Creating auth user...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            name: userData.name,
            username: userData.username,
            role: userData.role ?? 'user'
          }
        }
      });

      if (authError) {
        console.error('🚨 BYPASS: Auth signup error:', authError);
        throw new Error(`Auth signup failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('🚨 BYPASS: No user data returned from signup');
      }

      console.log('🚨 BYPASS: Auth user created:', authData.user.id);

      // Step 2: Sign out and restore admin session
      await supabase.auth.signOut();
      if (currentSession?.session) {
        await supabase.auth.setSession(currentSession.session);
      }

      // Step 3: Create custom user record directly
      console.log('🚨 BYPASS: Creating custom user record...');
      const { data: customUser, error: dbError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email: userData.email,
          name: userData.name,
          address: userData.address,
          username: userData.username,
          password: 'managed_by_supabase_auth',
          phone_number: userData.phoneNumber,
          profile_image: userData.profileImage || null,
          role: userData.role ?? 'user'
        })
        .select()
        .single();

      if (dbError) {
        console.error('🚨 BYPASS: Database error:', dbError);
        console.error('🚨 BYPASS: Error code:', dbError.code);
        console.error('🚨 BYPASS: Error details:', dbError.details);
        console.error('🚨 BYPASS: Error hint:', dbError.hint);
        console.error('🚨 BYPASS: Error message:', dbError.message);
        
        // Try to cleanup auth user
        if (hasAdminAccess && supabaseAdmin) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            console.log('🚨 BYPASS: Cleaned up auth user');
          } catch (cleanupError) {
            console.error('🚨 BYPASS: Failed to cleanup auth user:', cleanupError);
          }
        }
        
        throw new Error(`Database insert failed: ${dbError.message} (Code: ${dbError.code})`);
      }

      console.log('🚨 BYPASS: Success! User created:', customUser);
      return this.mapDatabaseUserToAppUser(customUser);
      
    } catch (error) {
      console.error('🚨 BYPASS: Error in createUserBypassValidation:', error);
      throw error;
    }
  }

  // Update user
  async updateUser(id: string, updates: UpdateUserData): Promise<User | null> {
    try {
      const updateData: Record<string, unknown> = {
        ...updates,
        updated_at: new Date().toISOString()
      }

      // Map phoneNumber to phone_number for database
      if (updates.phoneNumber) {
        updateData.phone_number = updates.phoneNumber
        delete updateData.phoneNumber
      }

      // Map profileImage to profile_image for database
      if (updates.profileImage) {
        updateData.profile_image = updates.profileImage
        delete updateData.profileImage
      }

      console.log('Updating user with data:', updateData);

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error details:', error)
        console.error('Update data that failed:', updateData)
        throw new Error(`Failed to update user: ${error.message}`)
      }

      return data ? this.mapDatabaseUserToAppUser(data) : null
    } catch (error) {
      console.error('Error in updateUser:', error)
      throw error
    }
  }

  // Delete user - Updated to use edge function for proper auth deletion
  async deleteUser(id: string): Promise<boolean> {
    try {
      console.log('Deleting user with ID:', id);

      // Method 1: Try edge function first (if deployed)
      try {
        const { data, error } = await supabase.functions.invoke('delete-user-admin', {
          body: { userId: id }
        });

        if (!error && !data?.error) {
          console.log('User deleted via edge function:', data);
          return true;
        }
        
        console.log('Edge function not available, using database trigger method');
      } catch (edgeError) {
        console.log('Edge function failed, using database trigger method:', edgeError);
      }

      // Method 2: Fallback to database deletion (relies on trigger for auth cleanup)
      const { error: dbError } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (dbError) {
        console.error('Database deletion failed:', dbError);
        throw new Error(`Failed to delete user: ${dbError.message}`);
      }

      console.log('User deleted successfully via database trigger');
      return true;
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }

  // Authenticate user
  async authenticateUser(username: string, password: string): Promise<User | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password) // In production, this should be hashed
        .single()

      if (error) {
        console.error('Error authenticating user:', error)
        return null
      }

      return data ? this.mapDatabaseUserToAppUser(data) : null
    } catch (error) {
      console.error('Error in authenticateUser:', error)
      return null
    }
  }

  // Check if username exists
  async checkUsernameExists(username: string): Promise<boolean> {
    try {
      console.log(`🔍 DEBUGGING: Checking if username exists: "${username}"`);
      console.log(`🔍 Username length: ${username.length}`);
      console.log(`🔍 Username trimmed: "${username.trim()}"`);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .eq('username', username)
        .limit(1);

      console.log(`🔍 Username query result:`, { data, error });
      console.log(`🔍 Data length:`, data?.length || 0);

      if (error) {
        console.error('❌ Error checking username:', error);
        console.log(`🔍 Returning false due to error`);
        return false; // On error, assume username doesn't exist to allow creation
      }

      const exists = (data && data.length > 0);
      console.log(`🔍 Username exists result: ${exists}`);
      
      if (exists && data) {
        console.log(`🔍 Existing username details:`, data[0]);
      }

      return exists;
    } catch (error) {
      console.error('❌ Exception in checkUsernameExists:', error);
      console.log(`🔍 Returning false due to exception`);
      return false;
    }
  }

  // Check if email exists
  async checkEmailExists(email: string): Promise<boolean> {
    try {
      console.log(`🔍 DEBUGGING: Checking if email exists: "${email}"`);
      console.log(`🔍 Email length: ${email.length}`);
      console.log(`🔍 Email trimmed: "${email.trim()}"`);
      
      const { data, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .limit(1);

      console.log(`🔍 Supabase query result:`, { data, error });
      console.log(`🔍 Data length:`, data?.length || 0);
      
      if (error) {
        console.error('❌ Error checking email:', error);
        console.log(`🔍 Returning false due to error`);
        return false; // On error, assume email doesn't exist to allow creation
      }

      const exists = (data && data.length > 0);
      console.log(`🔍 Email exists result: ${exists}`);
      
      if (exists && data) {
        console.log(`🔍 Existing user details:`, data[0]);
      }

      return exists;
    } catch (error) {
      console.error('❌ Exception in checkEmailExists:', error);
      console.log(`🔍 Returning false due to exception`);
      return false;
    }
  }

  // Check for orphaned auth users (auth users without custom user profiles)
  async checkForOrphanedAuthUsers(): Promise<string[]> {
    try {
      // We can't directly query auth.users, but we can check if there are gaps
      // This is a best-effort approach to detect potential orphaned users
      // In practice, admins should run the cleanup script periodically
      
      // For now, we'll return an empty array since we can't reliably detect this
      // without admin privileges to query auth.users directly
      return [];
    } catch (error) {
      console.error('Error checking for orphaned auth users:', error);
      return [];
    }
  }

  // Cleanup orphaned auth user (admin only)
  async cleanupOrphanedAuthUser(authUserId: string): Promise<void> {
    try {
      // Try to use the admin client for cleanup first
      if (hasAdminAccess && supabaseAdmin) {
        console.log('Attempting to delete orphaned auth user via admin client...');
        const { error: adminError } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
        
        if (!adminError) {
          console.log('Successfully cleaned up orphaned auth user via admin client');
          return;
        }
        
        console.warn('Admin client cleanup failed, trying edge function...', adminError);
      } else {
        console.warn('Admin client not available, trying edge function...');
      }
      
      // Fallback to edge function if admin client fails or is not available
      const { error } = await supabase.functions.invoke('delete-user-admin', {
        body: { userId: authUserId, forceAuthDelete: true }
      });

      if (error) {
        console.error('Edge function cleanup failed:', error);
        throw new Error(`Failed to cleanup orphaned auth user: ${error.message}`);
      }

      console.log('Successfully cleaned up orphaned auth user via edge function');
    } catch (error) {
      console.error('Error cleaning up orphaned auth user:', error);
      throw error;
    }
  }

  // Seed initial users (for development)
  async seedUsers(): Promise<void> {
    try {
      const seedUsers = [
        {
          name: "Regular User",
          address: "123 Main St",
          username: "user",
          password: "1234567890",
          email: "user@restaurantapp.com",
          phoneNumber: "555-1234",
          role: "user"
        },
        {
          name: "Admin Account",
          address: "Admin St",
          username: "admin",
          password: "0987654321",
          email: "admin@restaurantapp.com",
          phoneNumber: "555-0000",
          role: "admin"
        }
      ]

      for (const userData of seedUsers) {
        const exists = await this.checkUsernameExists(userData.username)
        if (!exists) {
          await this.createUser(userData)
        }
      }
    } catch (error) {
      console.error('Error seeding users:', error)
    }
  }

  // Helper function to map database user to app user
    private mapDatabaseUserToAppUser(
      dbUser: Database['public']['Tables']['users']['Row']
    ): User {
      return {
        id: dbUser.id,
      name: dbUser.name,
      address: dbUser.address,
      username: dbUser.username,
      password: dbUser.password,
      email: dbUser.email,
      phoneNumber: dbUser.phone_number,
      profileImage: dbUser.profile_image,
      role: dbUser.role,
      comments: dbUser.comments
    }
  }
}

export const userService = new UserService()