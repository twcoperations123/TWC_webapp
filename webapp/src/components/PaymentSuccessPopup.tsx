import React from 'react';

interface PaymentSuccessPopupProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  total: number;
  isDemo?: boolean;
}

const PaymentSuccessPopup: React.FC<PaymentSuccessPopupProps> = ({
  isOpen,
  onClose,
  orderNumber,
  total,
  isDemo = true
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          {/* Success Icon */}
          <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-4">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>

          {/* Title */}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {isDemo ? 'Demo Payment Successful!' : 'Payment Successful!'}
          </h3>

          {/* Content */}
          <div className="text-sm text-gray-600 mb-4">
            <p className="mb-2">
              <strong>Order Number:</strong> {orderNumber}
            </p>
            <p className="mb-2">
              <strong>Total:</strong> ${total.toFixed(2)}
            </p>
            {isDemo && (
              <p className="text-orange-600 font-medium">
                This is demo mode. In production, you would be redirected to Square's payment page.
              </p>
            )}
          </div>

          {/* Action Button */}
          <button
            onClick={onClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPopup;
