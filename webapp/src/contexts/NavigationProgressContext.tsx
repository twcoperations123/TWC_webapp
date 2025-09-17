import React, { createContext, useContext, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface NavigationProgressContextType {
  isNavigating: boolean;
  startNavigation: (targetPath: string) => Promise<void>;
  finishNavigation: () => void;
  getPreloadedData: (key: string) => any;
  setPreloadedData: (key: string, data: any) => void;
}

const NavigationProgressContext = createContext<NavigationProgressContextType | undefined>(undefined);

export const useNavigationProgress = () => {
  const context = useContext(NavigationProgressContext);
  if (context === undefined) {
    throw new Error('useNavigationProgress must be used within a NavigationProgressProvider');
  }
  return context;
};

export const NavigationProgressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isNavigating, setIsNavigating] = useState(false);
  const [dataCache, setDataCache] = useState<Record<string, any>>({});
  const navigate = useNavigate();

  const getPreloadedData = (key: string) => {
    return dataCache[key];
  };

  const setPreloadedData = (key: string, data: any) => {
    setDataCache(prev => ({
      ...prev,
      [key]: data
    }));
  };

  // Check if a route needs data preloading
  const doesRouteNeedPreloading = (targetPath: string): boolean => {
    // Admin routes that need preloading (ALL admin routes)
    if (targetPath === '/admin' || targetPath === '/admin/' || targetPath === '/admin/dashboard') {
      return true;
    }
    if (targetPath.startsWith('/admin/users')) {
      return true;
    }
    if (targetPath.startsWith('/admin/orders')) {
      return true;
    }
    if (targetPath.startsWith('/admin/inventory')) {
      return true;
    }
    if (targetPath.startsWith('/admin/analytics')) {
      return true;
    }
    if (targetPath.startsWith('/admin/support')) {
      return true;
    }
    if (targetPath.startsWith('/admin/settings')) {
      return true;
    }
    
    // User routes that need preloading
    if (targetPath.startsWith('/user/') && (targetPath.includes('/orders') || targetPath.includes('/inventory'))) {
      return true;
    }
    if (targetPath.startsWith('/user/') && targetPath.includes('/settings')) {
      return true;
    }
    
    // All other routes don't need preloading
    return false;
  };

  const startNavigation = async (targetPath: string) => {
    setIsNavigating(true);
    
    const startTime = Date.now();
    
    // Check if this route needs data preloading
    const needsPreloading = doesRouteNeedPreloading(targetPath);
    
    // Preload data for the target page while staying on current page
    await preloadPageData(targetPath);
    
    // Use different minimum durations based on whether preloading was needed
    const minDuration = needsPreloading ? 800 : 400; // Half duration if no preloading needed
    const elapsed = Date.now() - startTime;
    if (elapsed < minDuration) {
      const waitTime = minDuration - elapsed;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    // NOW navigate to the new page (data should already be loaded)
    navigate(targetPath);
    
    // Finish navigation after a brief moment to complete animation
    setTimeout(() => {
      setIsNavigating(false);
    }, 200);
  };

  const finishNavigation = () => {
    setIsNavigating(false);
  };

  // Preload data based on the target route
  const preloadPageData = async (targetPath: string): Promise<void> => {
    try {
      // Check if this route needs preloading - if not, return early
      const needsPreloading = doesRouteNeedPreloading(targetPath);
      if (!needsPreloading) {
        return; // Skip all preloading logic and delays for routes that don't need it
      }

      // Admin routes data preloading
      if (targetPath === '/admin' || targetPath === '/admin/' || targetPath === '/admin/dashboard') {
        // Preload admin dashboard data
        console.log('Preloading admin dashboard data...');
        try {
          const [adminSettingsModule, { supabase }] = await Promise.all([
            import('../services/adminSettingsService'),
            import('../lib/supabase')
          ]);
          
          // Load multiple dashboard data sources in parallel
          const [settings, recentOrders, userStats, inventoryStats] = await Promise.all([
            adminSettingsModule.AdminSettingsService.getSettings(),
            supabase.from('orders')
              .select(`
                *,
                users!inner(username, email)
              `)
              .order('created_at', { ascending: false })
              .limit(10),
            supabase.from('users').select('id, role, created_at').limit(100),
            supabase.from('menu_items').select('id, name, in_stock').limit(50)
          ]);
          
          // Transform orders to match Dashboard interface expectations
          const transformedOrders = (recentOrders.data || []).map((order: any) => ({
            ...order,
            userName: order.users?.username || order.users?.email || 'Unknown User',
            date: order.created_at || new Date().toISOString(),
            items: order.items || [],
            total: order.total || 0,
            status: order.status === 'confirmed' ? 'paid' : 
                   order.status === 'processing' ? 'processed' : 
                   order.status === 'delivered' ? 'delivered' : 'paid'
          }));
          
          // Store the preloaded data
          setPreloadedData('admin-dashboard-settings', settings);
          setPreloadedData('admin-dashboard-orders', transformedOrders);
          setPreloadedData('admin-dashboard-users', userStats.data || []);
          setPreloadedData('admin-dashboard-inventory', inventoryStats.data || []);
        } catch (error) {
          console.log('Preload admin dashboard error (non-critical):', error);
        }
      } else if (targetPath.startsWith('/admin/users')) {
        // Preload users data
        console.log('Preloading users data...');
        try {
          const { supabase } = await import('../lib/supabase');
          
          if (targetPath.includes('/users/') && targetPath.split('/').length > 3) {
            // Specific user detail page
            const userId = targetPath.split('/')[3];
            const [userDetail, userOrders, userActivity] = await Promise.all([
              supabase.from('users').select('*').eq('id', userId).single(),
              supabase.from('orders').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
              supabase.from('support_tickets').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
            ]);
            
            setPreloadedData(`admin-user-detail-${userId}`, userDetail.data);
            setPreloadedData(`admin-user-orders-${userId}`, userOrders.data || []);
            setPreloadedData(`admin-user-activity-${userId}`, userActivity.data || []);
          } else {
            // Users list page
            const [allUsers, userStats] = await Promise.all([
              supabase.from('users').select('*').order('created_at', { ascending: false }),
              supabase.from('orders').select('user_id, total, status, created_at')
            ]);
            
            setPreloadedData('admin-users-list', allUsers.data || []);
            setPreloadedData('admin-users-stats', userStats.data || []);
          }
        } catch (error) {
          console.log('Preload users error (non-critical):', error);
        }
      } else if (targetPath.startsWith('/admin/orders')) {
        // Preload orders data
        console.log('Preloading orders data...');
        try {
          const [orderServiceModule, { supabase }] = await Promise.all([
            import('../services/orderService'),
            import('../lib/supabase')
          ]);
          
          // Load comprehensive orders data
          const [allOrders, orderStats, recentActivity] = await Promise.all([
            orderServiceModule.orderService.getAllOrders(),
            supabase.from('orders').select('status, total, created_at, payment_method'),
            supabase.from('orders').select('*, users(name)').order('created_at', { ascending: false }).limit(50)
          ]);
          
          setPreloadedData('admin-orders-list', allOrders);
          setPreloadedData('admin-orders-stats', orderStats.data || []);
          setPreloadedData('admin-orders-activity', recentActivity.data || []);
        } catch (error) {
          console.log('Preload orders error (non-critical):', error);
          // Fallback: query orders directly from Supabase
          try {
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(100);
            setPreloadedData('admin-orders-fallback', data || []);
          } catch (fallbackError) {
            console.log('Preload orders fallback error:', fallbackError);
          }
        }
      } else if (targetPath.startsWith('/admin/inventory')) {
        // Preload inventory/menu data
        console.log('Preloading inventory data...');
        try {
          const [menuServiceModule, { supabase }] = await Promise.all([
            import('../services/menuService'),
            import('../lib/supabase')
          ]);
          
          // Load comprehensive inventory data
          const [menuItems, stockLevels, recentUpdates] = await Promise.all([
            menuServiceModule.menuService.getAllMenuItems(),
            supabase.from('menu_items').select('id, name, in_stock, category'),
            supabase.from('menu_items').select('*').order('updated_at', { ascending: false }).limit(20)
          ]);
          
          setPreloadedData('admin-inventory-items', menuItems);
          setPreloadedData('admin-inventory-stock', stockLevels.data || []);
          setPreloadedData('admin-inventory-recent', recentUpdates.data || []);
        } catch (error) {
          console.log('Preload inventory error (non-critical):', error);
          // Fallback: query menu items directly
          try {
            const { supabase } = await import('../lib/supabase');
            const { data } = await supabase.from('menu_items').select('*');
            setPreloadedData('admin-inventory-fallback', data || []);
          } catch (fallbackError) {
            console.log('Preload inventory fallback error:', fallbackError);
          }
        }
      } else if (targetPath.startsWith('/admin/analytics')) {
        // Preload analytics data
        console.log('Preloading analytics data...');
        try {
          const { supabase } = await import('../lib/supabase');
          
          // Preload comprehensive analytics queries
          const [ordersData, usersData, revenueData, inventoryData, performanceData] = await Promise.all([
            supabase.from('orders').select('total, status, created_at, payment_method').order('created_at', { ascending: false }).limit(200),
            supabase.from('users').select('id, role, created_at').order('created_at', { ascending: false }).limit(200),
            supabase.from('orders').select('total, created_at').eq('status', 'paid'),
            supabase.from('menu_items').select('id, name, category, in_stock'),
            supabase.from('orders').select('id, created_at, delivery_date, status, total').order('created_at', { ascending: false }).limit(100)
          ]);
          
          setPreloadedData('admin-analytics-orders', ordersData.data || []);
          setPreloadedData('admin-analytics-users', usersData.data || []);
          setPreloadedData('admin-analytics-revenue', revenueData.data || []);
          setPreloadedData('admin-analytics-inventory', inventoryData.data || []);
          setPreloadedData('admin-analytics-performance', performanceData.data || []);
        } catch (error) {
          console.log('Preload analytics error (non-critical):', error);
        }
      } else if (targetPath.startsWith('/admin/support')) {
        // Preload support data
        console.log('Preloading support data...');
        try {
          const { supabase } = await import('../lib/supabase');
          
          // Load support tickets and related data (with error handling for missing table)
          try {
            const [allTickets, recentTickets, ticketStats, userIssues] = await Promise.all([
              supabase.from('support_tickets').select('*').order('created_at', { ascending: false }),
              supabase.from('support_tickets').select('*, users(name)').order('created_at', { ascending: false }).limit(50),
              supabase.from('support_tickets').select('status, priority, created_at'),
              supabase.from('support_tickets').select('user_id, subject, status').order('created_at', { ascending: false }).limit(100)
            ]);
            
            setPreloadedData('admin-support-tickets', allTickets.data || []);
            setPreloadedData('admin-support-recent', recentTickets.data || []);
            setPreloadedData('admin-support-stats', ticketStats.data || []);
            setPreloadedData('admin-support-users', userIssues.data || []);
          } catch (ticketError) {
            console.log('Support tickets table not found, using empty data:', ticketError);
            // Set empty arrays if support_tickets table doesn't exist
            setPreloadedData('admin-support-tickets', []);
            setPreloadedData('admin-support-recent', []);
            setPreloadedData('admin-support-stats', []);
            setPreloadedData('admin-support-users', []);
          }
        } catch (error) {
          console.log('Preload support error (non-critical):', error);
        }
      } else if (targetPath.startsWith('/admin/settings')) {
        // Preload admin settings data
        try {
          const adminSettingsModule = await import('../services/adminSettingsService');
          const settings = await adminSettingsModule.AdminSettingsService.getSettings();
          
          setPreloadedData('admin-settings-page', settings);
        } catch (error) {
          console.log('Preload admin settings error (non-critical):', error);
        }
      } else if (targetPath.startsWith('/user/')) {
        // User routes data preloading
        const userId = targetPath.split('/')[2];
        if (targetPath.includes('/orders')) {
          // Preload user orders
          try {
            const orderServiceModule = await import('../services/orderService');
            const userOrders = await orderServiceModule.orderService.getUserOrders(userId);
            
            setPreloadedData(`user-orders-${userId}`, userOrders);
          } catch (error) {
            console.log('Preload user orders error (non-critical):', error);
          }
        } else if (targetPath.includes('/inventory')) {
          // Preload user inventory view
          try {
            const menuServiceModule = await import('../services/menuService');
            const menuItems = await menuServiceModule.menuService.getAllMenuItems();
            
            setPreloadedData(`user-inventory-${userId}`, menuItems);
          } catch (error) {
            console.log('Preload user inventory error (non-critical):', error);
          }
        } else if (targetPath.includes('/settings')) {
          // Preload user settings data
          try {
            // Preload current user data to ensure it's fresh
            const { supabase } = await import('../lib/supabase');
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', userId)
              .single();
            
            if (!userError && userData) {
              setPreloadedData(`user-settings-${userId}`, userData);
            }
            
            // Also preload any user-specific settings or preferences
            const { data: preferencesData } = await supabase
              .from('user_preferences')
              .select('*')
              .eq('user_id', userId)
              .maybeSingle();
            
            if (preferencesData) {
              setPreloadedData(`user-preferences-${userId}`, preferencesData);
            }
          } catch (error) {
            console.log('Preload user settings error (non-critical):', error);
          }
        }
      }
      
      // Add a minimum delay for visual consistency only when preloading actually occurred
      await new Promise(resolve => setTimeout(resolve, 300));
      
    } catch (error) {
      console.log('Data preloading error (non-critical):', error);
      // Don't block navigation on preload errors
    }
  };

  const value = {
    isNavigating,
    startNavigation,
    finishNavigation,
    getPreloadedData,
    setPreloadedData,
  };

  return (
    <NavigationProgressContext.Provider value={value}>
      {children}
    </NavigationProgressContext.Provider>
  );
};
