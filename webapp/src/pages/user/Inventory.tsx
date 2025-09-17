import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUsers } from "../../contexts/UsersContext";
import { useAuth } from "../../contexts/AuthContext";
import { UserMenuService } from "../../services/userMenuService";
import { cartService } from "../../services/cartService";
import { CacheService } from "../../services/cacheService";
import { useNavigationProgress } from '../../contexts/NavigationProgressContext';
import type { MenuItem } from "../../services/menuService";

interface CartItem extends MenuItem {
  quantity: number;
}

export default function UserInventory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users } = useUsers();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { startNavigation } = useNavigationProgress();
  
  // Initialize with cached data if available
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    if (id) {
      const cached = CacheService.getUserMenuCache(id);
      return cached || [];
    }
    return [];
  });
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (id) {
      const cached = CacheService.getUserCartCache(id);
      return cached || [];
    }
    return [];
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [itemQuantities, setItemQuantities] = useState<{ [key: string]: number }>({});
  
  // Simple session-based tracking to prevent loading states on refresh
  const sessionKey = `inventory_loaded_${id}`;
  const hasLoadedInSession = sessionStorage.getItem(sessionKey) === 'true';
  
  // Only show loading spinner on very first visit in session
  const [isLoadingMenu, setIsLoadingMenu] = useState(!hasLoadedInSession);
  
  const currentUser = authUser || users.find((u) => u.id === id);  // Load menu items and cart for the specific user
  useEffect(() => {
    const loadUserData = async () => {
      if (id) {
        try {
          // Load user menu (includes both general + specialized drinks)
          const userMenuItems = await UserMenuService.getUserMenu(id);
          setMenuItems(userMenuItems);
          // Cache the menu items for future loads
          CacheService.setUserMenuCache(id, userMenuItems);
          // Mark as loaded in this session
          sessionStorage.setItem(sessionKey, 'true');
          
          // Load user's cart
          const userCart = await cartService.getCart(id);
          setCart(userCart);
          // Cache the cart for future loads
          CacheService.setUserCartCache(id, userCart);
        } catch (error) {
          console.error('Error loading user data:', error);
        } finally {
          setIsLoadingMenu(false);
        }
      } else {
        // Fallback to general menu if no user ID
        try {
          const { menuService } = await import('../../services/menuService');
          const items = await menuService.getAllMenuItems(false);
          setMenuItems(items);
          // Mark as loaded in this session
          sessionStorage.setItem(sessionKey, 'true');
        } catch (error) {
          console.error('Error loading general menu:', error);
        } finally {
          setIsLoadingMenu(false);
        }
      }
    };

    // Always load fresh data, but don't show loading if we have cached data
    if (id) {
      const cachedMenu = CacheService.getUserMenuCache(id);
      if (!cachedMenu || cachedMenu.length === 0) {
        // No cached data, show loading spinner
        setIsLoadingMenu(true);
      } else {
        // We have cached data showing, load fresh data in background
        setIsLoadingMenu(false);
      }
    }
    
    loadUserData();
  }, [id]);

  // Function to refresh cart data (useful after purchases)
  const refreshCart = async () => {
    if (id) {
      try {
        const userCart = await cartService.getCart(id);
        setCart(userCart);
      } catch (error) {
        console.error('Error refreshing cart:', error);
      }
    }
  };

  // Function to refresh menu data (clear cache and reload)
  const refreshMenu = async () => {
    if (id) {
      try {
        // Clear cached menu data
        CacheService.clearUserMenuCache(id);
        
        // Load fresh user menu
        const userMenuItems = await UserMenuService.getUserMenu(id);
        setMenuItems(userMenuItems);
        
        // Cache the fresh data
        CacheService.setUserMenuCache(id, userMenuItems);
        
        console.log('Menu refreshed with latest data');
      } catch (error) {
        console.error('Error refreshing menu:', error);
      }
    }
  };

  // Check for cart updates when component becomes visible (e.g., after returning from checkout)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCart();
        refreshMenu(); // Also refresh menu data when page becomes visible
      }
    };

    const handleFocus = () => {
      refreshCart();
      refreshMenu(); // Also refresh menu data when window gains focus
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [id]);

  // Filter and sort items
  const filteredItems = menuItems
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           item.ingredients.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.price - b.price;
        case 'price-high':
          return b.price - a.price;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

  const addToCart = async (item: MenuItem) => {
    if (!id) return;
    if (!item.inStock) {
      // Defensive: prevent adding out-of-stock items even if UI is stale
      alert('This item is currently out of stock');
      return;
    }
    const quantity = itemQuantities[item.id] || 1;
    try {
      const success = await cartService.addToCart(id, item.id, quantity);
      if (success) {
        // Update local cart state
        setCart(prevCart => {
          const existingItem = prevCart.find(cartItem => cartItem.id === item.id);
          if (existingItem) {
            return prevCart.map(cartItem =>
              cartItem.id === item.id
                ? { ...cartItem, quantity: cartItem.quantity + quantity }
                : cartItem
            );
          } else {
            return [...prevCart, { ...item, quantity }];
          }
        });
        
        // Reset quantity for this item after adding to cart
        setItemQuantities(prev => ({ ...prev, [item.id]: 1 }));
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }
  };

  const removeFromCart = async (itemId: string) => {
    if (!id) return;
    
    try {
      const success = await cartService.removeFromCart(id, itemId);
      if (success) {
        setCart(prevCart => prevCart.filter(item => item.id !== itemId));
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!id) return;
    
    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }
    
    try {
      const success = await cartService.updateCartItem(id, itemId, quantity);
      if (success) {
        setCart(prevCart =>
          prevCart.map(item =>
            item.id === itemId ? { ...item, quantity } : item
          )
        );
      }
    } catch (error) {
      console.error('Error updating cart quantity:', error);
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Helper functions for quantity management
  const getItemQuantity = (itemId: string) => itemQuantities[itemId] || 1;

  const updateItemQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setItemQuantities(prev => ({ ...prev, [itemId]: quantity }));
  };

  const incrementQuantity = (itemId: string) => {
    updateItemQuantity(itemId, getItemQuantity(itemId) + 1);
  };

  const decrementQuantity = (itemId: string) => {
    updateItemQuantity(itemId, getItemQuantity(itemId) - 1);
  };

  if (authLoading && !currentUser) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">User Not Found</h1>
          <p className="text-gray-500">The requested user could not be found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mt-2 mx-5 text-3xl font-bold">Our Inventory</h1>
          <p className="mx-5 text-gray-600">Browse our selection of premium beverages and place your order</p>
        </div>
        
        {/* Shopping Cart Icon */}
        <div className="relative">
          <button
            onClick={() => setIsCartOpen(true)}
            className="mt-2 mx-5 relative p-3 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 transition-colors shadow-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m6-5v6a2 2 0 01-2 2H9a2 2 0 01-2-2v-6m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v4.01" />
            </svg>
            {cartItemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                {cartItemCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="mx-4 bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-4">
          <input
            type="text"
            placeholder="Search menu items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="all">All Categories</option>
            <option value="wine">Wine</option>
            <option value="beer">Beer</option>
            <option value="spirits">Spirits</option>
            <option value="cocktails">Cocktails</option>
            <option value="mixers">Mixers</option>
          </select>
          <select 
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="name">Name: A to Z</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {/* Menu Items Grid */}
      <div className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 px-4">
        {filteredItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="h-40 bg-gray-200 flex items-center justify-center overflow-hidden">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-gray-500">No Image</span>
              )}
            </div>
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900 text-sm">{item.name}</h3>
                <div className="flex items-center space-x-2">
                  {item.assignmentType === 'specific_users' && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                      Specialized
                    </span>
                  )}
                  {!item.inStock && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                      Out of Stock
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-gray-600 mb-2 line-clamp-2">{item.ingredients}</p>
              <div className="space-y-1 text-xs text-gray-500">
                <div>Size: {item.unitSize}</div>
                {item.abv > 0 && <div>ABV: {item.abv}%</div>}
                <div className="font-medium text-gray-900">${item.price.toFixed(2)}</div>
              </div>
              <div className="mt-3 space-y-2">
                {/* Quantity Selector */}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Quantity:</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => decrementQuantity(item.id)}
                      className={`w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm ${item.inStock ? 'hover:bg-gray-300' : 'opacity-50 cursor-not-allowed'}`}
                      disabled={!item.inStock}
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={getItemQuantity(item.id)}
                      onChange={(e) => updateItemQuantity(item.id, parseInt(e.target.value) || 1)}
                      className={`w-12 text-center text-sm border border-gray-300 rounded px-1 py-1 ${item.inStock ? '' : 'bg-gray-100'}`}
                      disabled={!item.inStock}
                    />
                    <button
                      onClick={() => incrementQuantity(item.id)}
                      className={`w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm ${item.inStock ? 'hover:bg-gray-300' : 'opacity-50 cursor-not-allowed'}`}
                      disabled={!item.inStock}
                    >
                      +
                    </button>
                  </div>
                </div>
                {/* Add to Cart Button / Out of stock label */}
                {item.inStock ? (
                  <button 
                    onClick={() => addToCart(item)}
                    className="w-full px-3 py-1 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 transition-colors"
                  >
                    Add to Cart
                  </button>
                ) : (
                  <button className="w-full px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded cursor-not-allowed" disabled>
                    Out of stock
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        </div>
      </div>

      {!hasLoadedInSession && isLoadingMenu && menuItems.length === 0 ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading menu items...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">
            {searchQuery || selectedCategory !== 'all' 
              ? 'No items match your search criteria.' 
              : 'No items available at the moment.'}
          </p>
        </div>
      ) : null}

      {/* Shopping Cart Popup */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-medium text-gray-900">Shopping Cart ({cartItemCount} items)</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {cart.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your cart is empty</p>
              ) : (
                <>
                  <div className="space-y-3 mb-4">
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                          <p className="text-xs text-gray-600">${item.price.toFixed(2)} each</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 text-sm"
                          >
                            -
                          </button>
                          <span className="w-8 text-center text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 text-sm"
                          >
                            +
                          </button>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="ml-2 text-red-600 hover:text-red-700 text-xs"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal:</span>
                      <span>${cartTotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Shipping:</span>
                      <span>$0.00</span>
                    </div>
                    <div className="border-t pt-2">
                      <div className="flex justify-between font-medium">
                        <span>Total:</span>
                        <span>${cartTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            {cart.length > 0 && (
              <div className="p-4 border-t">
                <button 
                  onClick={async () => {
                    // Save cart to localStorage/sessionStorage before navigation
                    sessionStorage.setItem('checkout-cart', JSON.stringify(cart));
                    await startNavigation(`/user/${id}/delivery-time`);
                  }}
                  className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}