import React, { createContext, useContext, useEffect, useState } from "react";
import { userService } from "../services/userService";
import type { User, CreateUserData, UpdateUserData } from "../services/userService";

type Ctx = {
  users: User[];
  createUser: (userData: CreateUserData) => Promise<void>;
  updateUser: (userId: string, updates: UpdateUserData) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  authenticate: (username: string, password: string) => Promise<User | null>;
  isLoading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
};

const UsersCtx = createContext<Ctx | null>(null);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load users from Supabase
  const loadUsers = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const fetchedUsers = await userService.getAllUsers();
      
      // If no users exist, seed the database with initial users
      if (fetchedUsers.length === 0) {
        await userService.seedUsers();
        // Reload users after seeding
        const seededUsers = await userService.getAllUsers();
        setUsers(seededUsers);
      } else {
        setUsers(fetchedUsers);
      }
    } catch (err) {
      console.error('Error loading users:', err);
      setError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize users on component mount
  useEffect(() => {
    loadUsers();
  }, []);

  // Create new user
  const createUser = async (userData: CreateUserData) => {
    try {
      setError(null);
      const newUser = await userService.createUser(userData);
      if (newUser) {
        setUsers(prev => [newUser, ...prev]);
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      setError(err.message || 'Failed to create user');
      throw err;
    }
  };

  // Update user
  const updateUser = async (userId: string, updates: UpdateUserData) => {
    try {
      setError(null);
      const updatedUser = await userService.updateUser(userId, updates);
      if (updatedUser) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? updatedUser : user
        ));
      }
    } catch (err: any) {
      console.error('Error updating user:', err);
      setError(err.message || 'Failed to update user');
      throw err;
    }
  };

  // Delete user
  const deleteUser = async (userId: string) => {
    try {
      setError(null);
      const success = await userService.deleteUser(userId);
      if (success) {
        setUsers(prev => prev.filter(user => user.id !== userId));
        // Also refresh users from the server to ensure consistency
        await refreshUsers();
      }
    } catch (err: any) {
      console.error('Error deleting user:', err);
      setError(err.message || 'Failed to delete user');
      throw err;
    }
  };

  // Authenticate user
  const authenticate = async (username: string, password: string): Promise<User | null> => {
    try {
      setError(null);
      const user = await userService.authenticateUser(username, password);
      return user;
    } catch (err: any) {
      console.error('Error authenticating user:', err);
      setError(err.message || 'Authentication failed');
      return null;
    }
  };

  // Refresh users
  const refreshUsers = async () => {
    await loadUsers();
  };

  return (
    <UsersCtx.Provider value={{ 
      users, 
      createUser, 
      updateUser, 
      deleteUser,
      authenticate, 
      isLoading, 
      error, 
      refreshUsers 
    }}>
      {children}
    </UsersCtx.Provider>
  );
}

export function useUsers() {
  const ctx = useContext(UsersCtx);
  if (!ctx) throw new Error("useUsers must be inside UsersProvider");
  return ctx;
}

// Export the User type for use in other components
export type { User };


