import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useUsers } from "../../contexts/UsersContext";
import { useAuth } from "../../contexts/AuthContext";
import { DeliveryService } from "../../services/deliveryService";
import { CacheService } from "../../services/cacheService";
import { useNavigationProgress } from '../../contexts/NavigationProgressContext';
import type { DeliverySlot } from "../../services/deliveryService";

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
}

export default function UserDeliveryTimeSelection() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { users } = useUsers();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const { startNavigation } = useNavigationProgress();
  
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  
  // Simple session-based tracking to prevent loading states on refresh
  const sessionKey = 'delivery_slots_loaded';
  const hasLoadedInSession = sessionStorage.getItem(sessionKey) === 'true';
  
  // Initialize with cached delivery slots if available
  const [deliverySlots, setDeliverySlots] = useState<DeliverySlot[]>(() => {
    return CacheService.getDeliverySlotsCache() || [];
  });
  
  const [cart, setCart] = useState<CartItem[]>(() => {
    // First try location state, then sessionStorage, then empty array
    const stateCart = location.state?.cart;
    if (stateCart && stateCart.length > 0) {
      return stateCart;
    }
    
    const sessionCart = sessionStorage.getItem('checkout-cart');
    if (sessionCart) {
      try {
        return JSON.parse(sessionCart);
      } catch (error) {
        console.error('Error parsing cart from session storage:', error);
      }
    }
    
    return [];
  });

  const currentUser = authUser || users.find((u) => u.id === id);
  
  // Only show loading on first visit in session
  const [isLoadingSlots, setIsLoadingSlots] = useState(!hasLoadedInSession);

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Load available delivery slots from admin settings
  useEffect(() => {
    const loadDeliverySlots = async () => {
      try {
        const slots = await DeliveryService.getAvailableDeliverySlots();
        setDeliverySlots(slots);
        // Cache the delivery slots for future loads
        CacheService.setDeliverySlotsCache(slots);
        // Mark as loaded in this session
        sessionStorage.setItem(sessionKey, 'true');
      } catch (error) {
        console.error('Error loading delivery slots:', error);
        // Set empty array if loading fails
        setDeliverySlots([]);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    
    // Only show loading on first visit in session
    if (!hasLoadedInSession) {
      setIsLoadingSlots(true);
    } else {
      setIsLoadingSlots(false);
    }
    
    loadDeliverySlots();
  }, []);

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(""); // Reset time when date changes
  };

  const handleTimeChange = (time: string) => {
    setSelectedTime(time);
  };

  // Quantity management functions
  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      // Remove item if quantity is 0 or less
      setCart(prevCart => prevCart.filter(item => item.id !== itemId));
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    );
  };

  const incrementQuantity = (itemId: string) => {
    const currentItem = cart.find(item => item.id === itemId);
    if (currentItem) {
      updateQuantity(itemId, currentItem.quantity + 1);
    }
  };

  const decrementQuantity = (itemId: string) => {
    const currentItem = cart.find(item => item.id === itemId);
    if (currentItem) {
      updateQuantity(itemId, currentItem.quantity - 1);
    }
  };

  const handleContinue = async () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select both a date and time for delivery.");
      return;
    }

    // Save cart and delivery info to sessionStorage before navigation
    sessionStorage.setItem('checkout-cart', JSON.stringify(cart));
    sessionStorage.setItem('delivery-date', selectedDate);
    sessionStorage.setItem('delivery-time', selectedTime);
    
    // Navigate to payment page
    await startNavigation(`/user/${id}/payment`);
  };

  const handleBack = async () => {
    // Save cart back to sessionStorage and navigate back
    sessionStorage.setItem('checkout-cart', JSON.stringify(cart));
    await startNavigation(`/user/${id}/inventory`);
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

  const availableDates = [...new Set(deliverySlots.map(slot => slot.date))];
  const availableTimesForDate = deliverySlots.filter(slot => slot.date === selectedDate && slot.available);

  // Loading state for delivery slots - only show on first visit in session
  if (!hasLoadedInSession && isLoadingSlots && deliverySlots.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading delivery options...</p>
        </div>
      </div>
    );
  }

  // No delivery available
  if (deliverySlots.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">Delivery Not Available</h1>
          <p className="text-gray-500 mb-6">
            Sorry, delivery is currently not available. Please contact us for more information.
          </p>
          <button
            onClick={() => navigate(`/user/${id}/inventory`)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
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
        <div>
          <h1 className="text-3xl font-bold">Select Delivery Time</h1>
          <p className="text-gray-600">Choose when you'd like your order delivered</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-600">Order Total</p>
          <p className="text-2xl font-bold text-gray-900">${cartTotal.toFixed(2)}</p>
        </div>
      </div>

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
                  <p className="text-sm text-gray-600">${item.price.toFixed(2)} each</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {/* Quantity Controls */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => decrementQuantity(item.id)}
                    className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 text-sm"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                    className="w-12 text-center text-sm border border-gray-300 rounded px-1 py-1"
                  />
                  <button
                    onClick={() => incrementQuantity(item.id)}
                    className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 text-sm"
                  >
                    +
                  </button>
                </div>
                <p className="font-medium text-gray-900 w-16 text-right">${(item.price * item.quantity).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t pt-4 mt-4">
          <div className="flex justify-between font-medium">
            <span>Total:</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Delivery Date Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Select Delivery Date</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {availableDates.map((date) => {
            const dateObj = new Date(date);
            const isSelected = selectedDate === date;
            const isToday = dateObj.toDateString() === new Date().toDateString();
            
            return (
              <button
                key={date}
                onClick={() => handleDateChange(date)}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-sm font-medium">
                  {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className="text-lg font-bold">
                  {dateObj.getDate()}
                </div>
                <div className="text-xs text-gray-500">
                  {dateObj.toLocaleDateString('en-US', { month: 'short' })}
                </div>
                {isToday && (
                  <div className="text-xs text-emerald-600 font-medium mt-1">Today</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Delivery Time Selection */}
      {selectedDate && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Select Delivery Time for {new Date(selectedDate).toLocaleDateString()}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableTimesForDate.map((timeSlot) => (
              <button
                key={`${selectedDate}-${timeSlot.time}`}
                onClick={() => handleTimeChange(timeSlot.time)}
                className={`p-4 rounded-lg border-2 text-center transition-colors ${
                  selectedTime === timeSlot.time
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-lg font-medium">{timeSlot.time}</div>
                <div className="text-sm text-gray-500">Available</div>
              </button>
            ))}
          </div>
          {availableTimesForDate.length === 0 && (
            <p className="text-gray-500 text-center py-4">
              No available time slots for this date. Please select a different date.
            </p>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={handleBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Back to Cart
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedDate || !selectedTime}
          className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue to Payment
        </button>
      </div>
    </div>
  );
}