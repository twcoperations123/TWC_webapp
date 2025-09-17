// Simple cache service for optimistic loading
export class CacheService {
  private static readonly CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
  
  // Generic cache storage
  private static getFromCache<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const parsed = JSON.parse(cached);
      const now = Date.now();
      
      // Check if cache is expired
      if (parsed.timestamp && (now - parsed.timestamp) < this.CACHE_EXPIRY) {
        return parsed.data;
      }
      
      // Remove expired cache
      localStorage.removeItem(key);
      return null;
    } catch {
      return null;
    }
  }
  
  private static setToCache<T>(key: string, data: T): void {
    try {
      const cacheItem = {
        data,
        timestamp: Date.now()
      };
      localStorage.setItem(key, JSON.stringify(cacheItem));
    } catch {
      // Handle storage quota exceeded or other errors silently
    }
  }
  
  // Menu items cache
  static getUserMenuCache(userId: string): any[] | null {
    return this.getFromCache(`userMenu_${userId}`);
  }
  
  static setUserMenuCache(userId: string, menuItems: any[]): void {
    this.setToCache(`userMenu_${userId}`, menuItems);
  }
  
  // Orders cache
  static getUserOrdersCache(userId: string): any[] | null {
    return this.getFromCache(`userOrders_${userId}`);
  }
  
  static setUserOrdersCache(userId: string, orders: any[]): void {
    this.setToCache(`userOrders_${userId}`, orders);
  }
  
  // Cart cache
  static getUserCartCache(userId: string): any[] | null {
    return this.getFromCache(`userCart_${userId}`);
  }
  
  static setUserCartCache(userId: string, cart: any[]): void {
    this.setToCache(`userCart_${userId}`, cart);
  }
  
  // Delivery slots cache
  static getDeliverySlotsCache(): any[] | null {
    return this.getFromCache('deliverySlots');
  }
  
  static setDeliverySlotsCache(slots: any[]): void {
    this.setToCache('deliverySlots', slots);
  }
  
  // Clear all user-specific cache (on logout)
  static clearUserCache(userId: string): void {
    localStorage.removeItem(`userMenu_${userId}`);
    localStorage.removeItem(`userOrders_${userId}`);
    localStorage.removeItem(`userCart_${userId}`);
  }
  
  // Clear user menu cache specifically (when menu is updated)
  static clearUserMenuCache(userId?: string): void {
    if (userId) {
      localStorage.removeItem(`userMenu_${userId}`);
    } else {
      // Clear all user menu caches
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('userMenu_')) {
          localStorage.removeItem(key);
        }
      });
    }
  }
  
  // Clear all cache
  static clearAllCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('userMenu_') || 
          key.startsWith('userOrders_') || 
          key.startsWith('userCart_') || 
          key === 'deliverySlots') {
        localStorage.removeItem(key);
      }
    });
  }
}
