import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useUsers } from "../../contexts/UsersContext";
import { useAuth } from "../../contexts/AuthContext";
import OrderDetailsModal from "../../components/OrderDetailsModal";
import { orderService, type Order } from "../../services/orderService";
import { CacheService } from "../../services/cacheService";
// import { useNavigationProgress } from '../../contexts/NavigationProgressContext';

export default function UserOrders() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { users } = useUsers();
  const { user: authUser, isLoading: authLoading } = useAuth();
  // const { startNavigation } = useNavigationProgress(); // Unused for now
  
  const currentUser = authUser || users.find((u) => u.id === id);
  
  // Simple session-based tracking to prevent loading states on refresh
  const sessionKey = `orders_loaded_${currentUser?.id || id}`;
  const hasLoadedInSession = sessionStorage.getItem(sessionKey) === 'true';
  
  // Initialize with cached orders if available
  const [orders, setOrders] = useState<Order[]>(() => {
    if (currentUser?.id || id) {
      return CacheService.getUserOrdersCache(currentUser?.id || id!) || [];
    }
    return [];
  });
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Only show loading on very first visit in session
  const [isLoadingOrders, setIsLoadingOrders] = useState(!hasLoadedInSession);

  // Load user orders from Supabase
  useEffect(() => {
    const loadUserOrders = async () => {
      const userId = currentUser?.id || id;
      if (userId) {
        try {
          const userOrders = await orderService.getUserOrders(userId);
          setOrders(userOrders);
          // Cache the orders for future loads
          CacheService.setUserOrdersCache(userId, userOrders);
          // Mark as loaded in this session
          sessionStorage.setItem(sessionKey, 'true');
        } catch (error) {
          console.error('Error loading orders:', error);
        } finally {
          setIsLoadingOrders(false);
        }
      } else {
        setIsLoadingOrders(false);
      }
    };

    // Always load fresh data, but don't show loading if we've loaded in this session
    if (!hasLoadedInSession) {
      setIsLoadingOrders(true);
    } else {
      setIsLoadingOrders(false);
    }

    loadUserOrders();
  }, [currentUser?.id, id]);

  // Calculate order statistics
  const activeOrders = orders.filter(order => order.status === 'paid' || order.status === 'confirmed');
  const processingOrders = orders.filter(order => order.status === 'processing' || order.status === 'out_for_delivery');
  const deliveredOrders = orders.filter(order => order.status === 'delivered');
  const totalOrders = orders.length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Paid
          </span>
        );
      case 'confirmed':
      case 'processing':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Processing
          </span>
        );
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            Out for Delivery
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Delivered
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusDescription = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Your order has been paid and is waiting to be processed by our team.';
      case 'confirmed':
      case 'processing':
        return 'Your order is being prepared and will be delivered on the scheduled date.';
      case 'out_for_delivery':
        return 'Your order is on its way to you.';
      case 'delivered':
        return 'Your order has been successfully delivered.';
      case 'cancelled':
        return 'This order has been cancelled.';
      default:
        return '';
    }
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrder(null);
  };

  const handleReorder = (order: Order) => {
    // Map order items to cart items format
    const cartItems = order.items.map(item => ({
      id: item.menuItemId || `temp-${Date.now()}-${Math.random()}`,
      name: item.menuItemName,
      ingredients: item.menuItemIngredients || '',
      unitSize: item.unitSize || '',
      abv: item.abv || 0,
      price: item.price,
      imageUrl: '', // Not available in order items
      category: '', // Not available in order items
      inStock: true, // Assume in stock for reorder
      createdAt: new Date(),
      quantity: item.quantity
    }));

    // Navigate directly to delivery time selection with the mapped cart items
    navigate(`/user/${id}/delivery-time`, { 
      state: { 
        cart: cartItems 
      }
    });
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
          <h1 className="mx-5 mt-2 text-3xl font-bold">My Orders</h1>
          <p className="mx-5 text-gray-600">Track your ongoing orders and view order history</p>
        </div>
        <Link 
          to={`/user/${id}/inventory`}
          className="mx-5 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Order from Menu
        </Link>
      </div>

      {/* Order Status Summary - show even when loading if we have data */}
      {orders.length > 0 && (
        <div className="mx-5 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-2xl font-bold text-blue-600">{activeOrders.length}</div>
            <div className="text-sm text-gray-600">Active Orders</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-2xl font-bold text-yellow-600">{processingOrders.length}</div>
            <div className="text-sm text-gray-600">Processing</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-2xl font-bold text-green-600">{deliveredOrders.length}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md text-center">
            <div className="text-2xl font-bold text-gray-600">{totalOrders}</div>
            <div className="text-sm text-gray-600">Total Orders</div>
          </div>
        </div>
      )}

      {/* Active Orders */}
      {activeOrders.length > 0 && (
        <div className="mx-5 bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Active Orders</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {activeOrders.map((order) => (
              <div key={order.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{order.orderNumber || order.id}</h3>
                    <p className="text-sm text-gray-600">
                      {order.items.map(item => item.menuItemName).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-900">${order.total.toFixed(2)}</p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="font-medium">Order Date:</span> {new Date(order.createdAt || '').toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Delivery Time:</span> {order.deliveryTime}
                  </div>
                  <div>
                    <span className="font-medium">Items:</span> {order.items.length} items
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">{getStatusDescription(order.status)}</p>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => handleViewDetails(order)}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Completed Orders */}
      {deliveredOrders.length > 0 && (
        <div className="mx-5 bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Completed Orders</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {deliveredOrders.slice(0, 5).map((order) => (
              <div key={order.id} className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">{order.orderNumber || order.id}</h3>
                    <p className="text-sm text-gray-600">
                      {order.items.map(item => item.menuItemName).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium text-gray-900">${order.total.toFixed(2)}</p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                  <div>
                    <span className="font-medium">Order Date:</span> {new Date(order.createdAt || '').toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Delivery Date:</span> {new Date(order.deliveryDate).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Items:</span> {order.items.length} items
                  </div>
                </div>
                <div className="mt-4 flex space-x-2">
                  <button 
                    onClick={() => handleViewDetails(order)}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => handleReorder(order)}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Reorder
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State - only show on first visit in session */}
      {!hasLoadedInSession && isLoadingOrders && orders.length === 0 && (
        <div className="mx-5 bg-white rounded-lg shadow-md p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your orders...</p>
        </div>
      )}

      {/* No Orders State */}
      {!isLoadingOrders && orders.length === 0 && (
        <div className="mx-5 bg-white rounded-lg shadow-md p-8 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Yet</h3>
          <p className="text-gray-600 mb-4">You haven't placed any orders yet. Start shopping to see your orders here.</p>
          <Link 
            to={`/user/${id}/inventory`}
            className="inline-flex px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Browse Menu
          </Link>
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}