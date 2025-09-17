import { useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { useUsers } from "../../contexts/UsersContext";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigationProgress } from '../../contexts/NavigationProgressContext';

export default function OrderSuccess() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { users } = useUsers();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { startNavigation } = useNavigationProgress();

  const currentUser = authUser || users.find((u) => u.id === id);
  
  // Get order data from sessionStorage or location state
  const orderData = (() => {
    // First try location state
    if (location.state?.orderId) {
      return {
        orderId: location.state.orderId as string,
        orderNumber: location.state.orderNumber as string,
        orderTotal: location.state.orderTotal as number,
        deliveryDate: location.state.deliveryDate as string,
        deliveryTime: location.state.deliveryTime as string,
        paymentMethod: location.state.paymentMethod as string
      };
    }
    
    // Then try sessionStorage
    const sessionData = sessionStorage.getItem('order-success-data');
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        // Clear the data after reading it
        sessionStorage.removeItem('order-success-data');
        return parsed;
      } catch (error) {
        console.error('Error parsing order success data from session storage:', error);
      }
    }
    
    return {
      orderId: '',
      orderNumber: '',
      orderTotal: 0,
      deliveryDate: '',
      deliveryTime: '',
      paymentMethod: ''
    };
  })();
  
  const { orderId, orderNumber, orderTotal, deliveryDate, deliveryTime, paymentMethod } = orderData;

  useEffect(() => {
    // Auto-redirect to orders page after 10 seconds
    const timer = setTimeout(() => {
      startNavigation(`/user/${id}/orders`);
    }, 10000);

    return () => clearTimeout(timer);
  }, [startNavigation, id]);

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

  if (!orderId) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Invalid Order</h1>
          <p className="text-gray-500">No order information found.</p>
          <button
            onClick={() => startNavigation(`/user/${id}/inventory`)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Order Confirmed!</h1>
        <p className="text-gray-600 mb-8">Thank you for your order. We'll start preparing it right away.</p>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Order Details</h2>
          <div className="space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-600">Order Number:</span>
              <span className="font-medium text-gray-900">{orderNumber || orderId?.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Amount:</span>
              <span className="font-medium text-gray-900">${orderTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Date:</span>
              <span className="font-medium text-gray-900">
                {new Date(deliveryDate).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Time:</span>
              <span className="font-medium text-gray-900">{deliveryTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment Method:</span>
              <span className="font-medium text-gray-900">{paymentMethod || 'Credit Card'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {paymentMethod === 'Pay on Delivery' ? 'Confirmed' : 'Paid'}
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-3">What's Next?</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>• We'll send you an email confirmation shortly</p>
            <p>• Your order will be processed and prepared for delivery</p>
            <p>• You can track your order status in the Orders section</p>
            <p>• We'll notify you when your order is out for delivery</p>
            {paymentMethod === 'Pay on Delivery' && (
              <p>• <strong>Please have ${orderTotal.toFixed(2)} in cash ready for payment upon delivery</strong></p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => startNavigation(`/user/${id}/orders`)}
            className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            View My Orders
          </button>
          <button
            onClick={() => startNavigation(`/user/${id}/inventory`)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Continue Shopping
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-6">
          You'll be automatically redirected to your orders page in 10 seconds...
        </p>
      </div>
    </div>
  );
}