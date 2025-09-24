import { useState, useEffect } from "react";
import { useNavigationProgress } from "../../contexts/NavigationProgressContext";
import OrderDetailsModal from "../../components/OrderDetailsModal";
import { orderService, type Order } from "../../services/orderService";

// Extended order type for admin view with user info
interface AdminOrder extends Order {
  userName?: string;
  userEmail?: string;
}

export default function Orders() {
  const { getPreloadedData } = useNavigationProgress();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmOrder, setDeleteConfirmOrder] = useState<AdminOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [_isLoading, setIsLoading] = useState(true);

  // Load orders from preloaded data or Supabase
  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      
      // First check for preloaded orders data
      const preloadedOrders = getPreloadedData('admin-orders-list');
      if (preloadedOrders && preloadedOrders.length > 0) {
        console.log('Using preloaded orders data:', preloadedOrders.length, 'orders');
        setOrders(preloadedOrders as AdminOrder[]);
        setIsLoading(false);
        return;
      }
      
      // Fallback to API call
      console.log('No preloaded orders, fetching from API');
      const allOrders = await orderService.getAllOrders() as AdminOrder[];
      setOrders(allOrders);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading orders:', error);
      setIsLoading(false);
    }
  };

  // Filter orders based on status
  const filteredOrders = orders.filter(order => {
    if (filterStatus === 'all') return true;
    return order.status === filterStatus;
  });

  // Calculate order statistics - map old statuses to new ones
  const paidOrders = orders.filter(order => order.status === 'paid');
  const processingOrders = orders.filter(order => order.status === 'processing' || order.status === 'confirmed');
  const deliveredOrders = orders.filter(order => order.status === 'delivered');
  const totalOrders = orders.length;

  const handleConfirmOrder = async (orderId: string) => {
    try {
      const success = await orderService.updateOrderStatus(orderId, 'processing');
      if (success) {
        // Reload orders to get updated data
        await loadOrders();
      }
    } catch (error) {
      console.error('Error confirming order:', error);
    }
  };

  const handleMarkDelivered = async (orderId: string) => {
    try {
      const success = await orderService.updateOrderStatus(orderId, 'delivered');
      if (success) {
        // Reload orders to get updated data
        await loadOrders();
      }
    } catch (error) {
      console.error('Error marking order as delivered:', error);
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

  const handleDeleteOrder = async (order: AdminOrder) => {
    setDeleteConfirmOrder(order);
  };

  const confirmDeleteOrder = async () => {
    if (!deleteConfirmOrder) return;
    
    setIsDeleting(true);
    try {
      const success = await orderService.deleteOrder(deleteConfirmOrder.id!);
      if (success) {
        await loadOrders(); // Reload orders after deletion
        setDeleteConfirmOrder(null);
      } else {
        console.error('Failed to delete order');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeleteOrder = () => {
    setDeleteConfirmOrder(null);
  };

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
        return 'Order has been paid and is waiting for confirmation.';
      case 'processed':
        return 'Order has been confirmed and is being prepared for delivery.';
      case 'delivered':
        return 'Order has been successfully delivered to the customer.';
      default:
        return '';
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-safe-bottom">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Orders Management</h1>
        <p className="text-gray-600 text-sm sm:text-base">Manage customer orders and track delivery status</p>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md text-center">
          <div className="text-xl sm:text-2xl font-bold text-blue-600">{paidOrders.length}</div>
          <div className="text-xs sm:text-sm text-gray-600">Pending Confirmation</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md text-center">
          <div className="text-xl sm:text-2xl font-bold text-yellow-600">{processingOrders.length}</div>
          <div className="text-xs sm:text-sm text-gray-600">Processing</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md text-center">
          <div className="text-xl sm:text-2xl font-bold text-green-600">{deliveredOrders.length}</div>
          <div className="text-xs sm:text-sm text-gray-600">Delivered</div>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-md text-center">
          <div className="text-xl sm:text-2xl font-bold text-gray-600">{totalOrders}</div>
          <div className="text-xs sm:text-sm text-gray-600">Total Orders</div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
          <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 mobile-input"
          >
            <option value="all">All Orders</option>
            <option value="paid">Paid (Pending)</option>
            <option value="processed">Processing</option>
            <option value="delivered">Delivered</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Orders ({filteredOrders.length})
          </h2>
        </div>
        
        {filteredOrders.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Orders Found</h3>
            <p className="text-gray-600 text-sm sm:text-base">
              {filterStatus === 'all' 
                ? 'No orders have been placed yet.' 
                : `No orders with status "${filterStatus}" found.`}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-2 sm:space-y-0">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 truncate">{order.id}</h3>
                    <p className="text-sm text-gray-600">Customer: {order.userName}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-medium text-gray-900">${order.total.toFixed(2)}</p>
                    {getStatusBadge(order.status)}
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 text-sm text-gray-600 mb-4">
                  <div>
                    <span className="font-medium">Order Date:</span> 
                    <span className="block sm:inline sm:ml-1">{new Date(order.createdAt || '').toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Delivery Date:</span> 
                    <span className="block sm:inline sm:ml-1">{new Date(order.deliveryDate).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="font-medium">Delivery Time:</span> 
                    <span className="block sm:inline sm:ml-1">{order.deliveryTime}</span>
                  </div>
                  <div>
                    <span className="font-medium">Payment:</span> 
                    <span className="block sm:inline sm:ml-1">{order.paymentMethod}</span>
                  </div>
                </div>

                {/* Order Items */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4">
                  <h4 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">Order Items:</h4>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="truncate pr-2">{item.menuItemName} (Qty: {item.quantity})</span>
                        <span className="font-medium flex-shrink-0">${(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-gray-600">{getStatusDescription(order.status)}</p>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  {order.status === 'paid' && (
                    <button
                      onClick={() => handleConfirmOrder(order.id!)}
                      className="px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 transition-colors touch-manipulation mobile-touch-target"
                    >
                      Confirm Order
                    </button>
                  )}
                  {(order.status === 'processing' || order.status === 'confirmed') && (
                    <button
                      onClick={() => handleMarkDelivered(order.id!)}
                      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors touch-manipulation mobile-touch-target"
                    >
                      Mark as Delivered
                    </button>
                  )}
                  <button 
                    onClick={() => handleViewDetails(order)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors touch-manipulation mobile-touch-target"
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => handleDeleteOrder(order)}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors touch-manipulation mobile-touch-target"
                  >
                    Delete Order
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Confirm Delete Order
              </h3>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete this order?
              </p>
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <p className="text-sm text-gray-700">
                  <strong>Order ID:</strong> {deleteConfirmOrder.id}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Customer:</strong> {deleteConfirmOrder.userName || 'N/A'}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Total:</strong> ${deleteConfirmOrder.total?.toFixed(2) || '0.00'}
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Status:</strong> {deleteConfirmOrder.status}
                </p>
              </div>
              <p className="text-red-600 text-sm mb-4">
                This action cannot be undone. All order items and payment records will be permanently deleted.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDeleteOrder}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteOrder}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center"
                >
                  {isDeleting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'Delete Order'
                  )}
                </button>
              </div>
            </div>
          </div>
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
