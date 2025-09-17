import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useUsers } from "../../contexts/UsersContext";
import { useAuth } from "../../contexts/AuthContext";
import { orderService } from "../../services/orderService";
import { cartService } from "../../services/cartService";
import { squareInvoiceService } from "../../services/squareInvoiceService";
import PaymentSuccessPopup from "../../components/PaymentSuccessPopup";
import { useNavigationProgress } from '../../contexts/NavigationProgressContext';

interface CartItem {
  id: string;
  name: string;
  ingredients: string;
  unitSize: string;
  abv: number;
  price: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
  createdAt: Date;
  quantity: number;
  specialInstructions?: string;
}

export default function Payment() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { users } = useUsers();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { startNavigation } = useNavigationProgress();
  
  const [paymentMethod, setPaymentMethod] = useState<string>("square");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [isPayOnDelivery, setIsPayOnDelivery] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [showPaymentPopup, setShowPaymentPopup] = useState(false);
  const [paymentResult, setPaymentResult] = useState<{
    orderNumber: string;
    total: number;
    isDemo?: boolean;
  } | null>(null);

  const currentUser = authUser || users.find((u) => u.id === id);
  
  // Get cart and delivery data from sessionStorage or location state
  const cart = (() => {
    // First try location state
    const stateCart = location.state?.cart as CartItem[];
    if (stateCart && stateCart.length > 0) {
      return stateCart;
    }
    
    // Then try sessionStorage
    const sessionCart = sessionStorage.getItem('checkout-cart');
    if (sessionCart) {
      try {
        return JSON.parse(sessionCart) as CartItem[];
      } catch (error) {
        console.error('Error parsing cart from session storage:', error);
      }
    }
    
    return [] as CartItem[];
  })();
  
  const deliveryDate = location.state?.deliveryDate || sessionStorage.getItem('delivery-date') || '';
  const deliveryTime = location.state?.deliveryTime || sessionStorage.getItem('delivery-time') || '';
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Tax calculation (8.25% tax rate - adjust as needed for your location)
  const TAX_RATE = 0.0825;
  const taxAmount = cartTotal * TAX_RATE;
  const totalWithTax = cartTotal + taxAmount;

  // Check admin settings for Square payment configuration
  useEffect(() => {
    const checkPaymentSettings = async () => {
      try {
        setIsLoadingSettings(true);
        
        // Check if Square payment is configured
        const hasSquareConfig = import.meta.env.VITE_SQUARE_APPLICATION_ID && 
                               import.meta.env.VITE_SQUARE_ACCESS_TOKEN && 
                               import.meta.env.VITE_SQUARE_LOCATION_ID;
        
        if (hasSquareConfig) {
          // Square is configured, enable online payments
          setIsPayOnDelivery(false);
        } else {
          // No payment processor configured, default to pay on delivery
          console.log('No Square payment configuration found, defaulting to pay on delivery');
          setIsPayOnDelivery(true);
        }
      } catch (error) {
        console.error('Error checking payment configuration:', error);
        // If settings can't be loaded, default to pay on delivery
        setIsPayOnDelivery(true);
      } finally {
        setIsLoadingSettings(false);
      }
    };

    checkPaymentSettings();
  }, []);

  const handlePayment = async () => {
    if (!currentUser) return;

    setIsProcessing(true);
    setError("");

    try {
      if (paymentMethod === 'square') {
        // Square Invoice Flow
        console.log('Creating Square invoice for cart:', cart);
        
        // Convert cart to invoice format
        const invoiceItems = cart.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          specialInstructions: (item as any).specialInstructions
        }));

        // Create Square invoice
        const invoiceResult = await squareInvoiceService.createInvoice(
          invoiceItems,
          totalWithTax,
          deliveryTime
        );

        console.log('Square invoice created:', invoiceResult);

        // Clear the user's cart
        try {
          await cartService.clearCart(id!);
          console.log('Cart cleared successfully');
        } catch (cartError) {
          console.error('Error clearing cart:', cartError);
        }

        // Show payment success popup
        setPaymentResult({
          orderNumber: invoiceResult.orderNumber,
          total: totalWithTax,
          isDemo: invoiceResult.isDemo || false
        });
        setShowPaymentPopup(true);
        return;

      } else {
        // Pay on delivery flow
        const orderData = {
          userId: currentUser.id,
          items: cart.map(item => ({
            menuItemId: item.id,
            menuItemName: item.name,
            menuItemIngredients: item.ingredients,
            unitSize: item.unitSize,
            abv: item.abv,
            price: item.price,
            quantity: item.quantity
          })),
          total: totalWithTax,
          paymentMethod: 'Pay on Delivery',
          deliveryDate,
          deliveryTime,
          deliveryAddress: currentUser.address || '',
          notes: ''
        };

        console.log('Creating order with data:', orderData);

        const savedOrder = await orderService.createOrder(orderData);

        if (savedOrder) {
          console.log('Order created successfully:', savedOrder);
          
          // Clear the user's cart
          try {
            await cartService.clearCart(id!);
            console.log('Cart cleared successfully after order creation');
          } catch (cartError) {
            console.error('Error clearing cart after order creation:', cartError);
          }
          
          // Navigate to success page
          sessionStorage.setItem('order-success-data', JSON.stringify({
            orderId: savedOrder.id,
            orderNumber: savedOrder.orderNumber,
            orderTotal: totalWithTax,
            deliveryDate,
            deliveryTime,
            paymentMethod: savedOrder.paymentMethod
          }));
          // Clear checkout data from sessionStorage
          sessionStorage.removeItem('checkout-cart');
          sessionStorage.removeItem('delivery-date');
          sessionStorage.removeItem('delivery-time');
          
          await startNavigation(`/user/${id}/order-success`);
        } else {
          setError("Failed to save order. Please try again.");
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      setError(error instanceof Error ? error.message : "Payment processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBack = async () => {
    // Save current data back to sessionStorage
    sessionStorage.setItem('checkout-cart', JSON.stringify(cart));
    sessionStorage.setItem('delivery-date', deliveryDate);
    sessionStorage.setItem('delivery-time', deliveryTime);
    
    await startNavigation(`/user/${id}/delivery-time`);
  };

  const handlePopupClose = () => {
    setShowPaymentPopup(false);
    setPaymentResult(null);
    
    // Navigate to success page
    if (paymentResult) {
      navigate(`/user/${id}/order-success`, { 
        state: { 
          orderId: paymentResult.orderNumber,
          orderNumber: paymentResult.orderNumber,
          orderTotal: paymentResult.total,
          deliveryDate,
          deliveryTime,
          paymentMethod: paymentResult.isDemo ? 'Square - Invoice (Demo)' : 'Square - Invoice',
          demoMode: paymentResult.isDemo || false
        }
      });
    }
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

  if (cart.length === 0) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Empty Cart</h1>
          <p className="text-gray-500">Your cart is empty. Please add items before proceeding.</p>
          <button
            onClick={() => navigate(`/user/${id}/inventory`)}
            className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">

        <div className="text-right">
          <p className="text-sm text-gray-600">Order Total</p>
          <p className="text-2xl font-bold text-gray-900">${totalWithTax.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            {cart.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-500 text-xs">No Image</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{item.name}</h3>
                    <p className="text-sm text-gray-600">Qty: {item.quantity}</p>
                  </div>
                </div>
                <p className="font-medium text-gray-900">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="border-t pt-4 mt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>${cartTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax ({(TAX_RATE * 100).toFixed(2)}%):</span>
              <span>${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Delivery:</span>
              <span>$0.00</span>
            </div>
            <div className="flex justify-between font-medium text-lg">
              <span>Total:</span>
              <span>${totalWithTax.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Delivery Details</h3>
            <p className="text-sm text-gray-600">
              Date: {new Date(deliveryDate).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-600">
              Time: {deliveryTime}
            </p>
          </div>
        </div>

        {/* Payment Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h2>
          
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {isLoadingSettings ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="ml-2 text-gray-600">Loading payment options...</span>
            </div>
          ) : isPayOnDelivery ? (
            /* Pay on Delivery */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-medium text-emerald-900">Pay on Delivery</h3>
                    <p className="text-sm text-emerald-700">You'll pay when your order is delivered</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Order Confirmation</h4>
                <p className="text-sm text-gray-600 mb-2">
                  By confirming this order, you agree to pay <strong>${totalWithTax.toFixed(2)}</strong> upon delivery.
                </p>
                <p className="text-sm text-gray-600">
                  Delivery Date: <strong>{new Date(deliveryDate).toLocaleDateString()}</strong><br />
                  Delivery Time: <strong>{deliveryTime}</strong>
                </p>
              </div>
            </div>
          ) : (
            /* Online Payment Form */
            <div className="space-y-4">
              {/* Square Payment Banner */}
              <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 p-3 rounded-lg mb-4">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-green-600 rounded flex items-center justify-center">
                    <span className="text-white text-xs font-bold">□</span>
                  </div>
                  <span className="text-green-800 font-medium text-sm">⬜ Powered by Square Payments</span>
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      value="square"
                      checked={paymentMethod === "square"}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="mr-3"
                    />
                    <div>
                      <span className="text-sm font-medium">Square Invoice Payment</span>
                      <p className="text-xs text-gray-500">Secure payment via Square - You'll be redirected to complete payment</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Security Notice */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">🔒 Secure Payment Process</h4>
                <p className="text-blue-700 text-sm mb-2">
                  When you click "Pay with Square", we'll create a secure invoice and redirect you to Square's payment page where you can:
                </p>
                <ul className="text-blue-700 text-sm space-y-1 ml-4">
                  <li>• Pay with any major credit or debit card</li>
                  <li>• Use Cash App Pay (if available)</li>
                  <li>• Complete payment on any device</li>
                  <li>• Get an instant receipt via email</li>
                </ul>
                <p className="text-blue-700 text-sm mt-2">
                  Your payment information is processed securely by Square and never stored on our servers.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          disabled={isProcessing}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handlePayment}
          disabled={isProcessing || isLoadingSettings}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
        >
          {isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing...</span>
            </>
          ) : isLoadingSettings ? (
            <span>Loading...</span>
          ) : isPayOnDelivery ? (
            <span>Confirm Order</span>
          ) : paymentMethod === 'square' ? (
            <span>Pay with Square ${totalWithTax.toFixed(2)}</span>
          ) : (
            <span>Pay ${totalWithTax.toFixed(2)}</span>
          )}
        </button>
      </div>

      {/* Payment Success Popup */}
      {paymentResult && (
        <PaymentSuccessPopup
          isOpen={showPaymentPopup}
          onClose={handlePopupClose}
          orderNumber={paymentResult.orderNumber}
          total={paymentResult.total}
          isDemo={paymentResult.isDemo}
        />
      )}
    </div>
  );
}