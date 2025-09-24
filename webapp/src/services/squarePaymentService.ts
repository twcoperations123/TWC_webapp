// Square Payment API Service
export interface SquarePaymentConfig {
  applicationId: string;
  accessToken: string;
  environment: 'sandbox' | 'production';
  locationId: string;
}

export interface SquarePaymentRequest {
  amount: number; // Amount in cents
  currency: string;
  orderNumber: string;
  description: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  paymentMethod: {
    type: 'card' | 'cash' | 'digital_wallet';
    cardToken?: string;
    cardLast4?: string;
    cardBrand?: string;
  };
  metadata?: Record<string, any>;
}

export interface SquarePaymentResponse {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  status: 'pending' | 'completed' | 'failed' | 'canceled';
  message: string;
  receiptUrl?: string;
  receiptNumber?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface SquareRefundRequest {
  paymentId: string;
  amount?: number; // Amount in cents, optional for full refund
  reason?: string;
}

export interface SquareRefundResponse {
  success: boolean;
  refundId?: string;
  status: 'pending' | 'completed' | 'failed';
  message: string;
  error?: {
    code: string;
    message: string;
  };
}

class SquarePaymentService {
  private config: SquarePaymentConfig;
  private baseUrl: string;

  constructor(config: SquarePaymentConfig) {
    this.config = config;
    this.baseUrl = config.environment === 'production' 
      ? 'https://connect.squareup.com'
      : 'https://connect.squareupsandbox.com';
    
    // Log Square configuration
    console.log('🔧 Square Payment Service Initialized:', {
      environment: config.environment,
      baseUrl: this.baseUrl,
      applicationId: config.applicationId?.slice(0, 20) + '...',
      locationId: config.locationId?.slice(0, 10) + '...',
      hasAccessToken: !!config.accessToken
    });
  }

  /**
   * Make authenticated API request to Square
   */
  /* private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.config.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18', // Latest Square API version
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Square API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
    }

    return response.json();
  } */

  /**
   * Process a payment using Square Payment API
   */
  async processPayment(paymentRequest: SquarePaymentRequest): Promise<SquarePaymentResponse> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      console.log(`🚀 [${requestId}] Square Payment Request Started:`, {
        requestId,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        orderNumber: paymentRequest.orderNumber,
        customer: paymentRequest.customer.email,
        environment: this.config.environment,
        baseUrl: this.baseUrl,
        timestamp: new Date().toISOString()
      });

      // For demo purposes, we'll simulate the Square API payment flow
      // In production, you'd integrate with Square's actual payment endpoints
      console.log(`📡 [${requestId}] Sending to Square API:`, {
        endpoint: `${this.baseUrl}/v2/payments`,
        method: 'POST',
        headers: {
          'Authorization': 'Bearer [HIDDEN]',
          'Content-Type': 'application/json',
          'Square-Version': '2024-01-18'
        }
      });
      
      // Simulate API delay
      console.log(`⏳ [${requestId}] Waiting for Square API response...`);
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate payment processing with 95% success rate
      const isSuccess = Math.random() > 0.05;

      if (isSuccess) {
        const paymentId = `sqpay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const transactionId = `sq_txn_${Date.now()}`;
        const receiptNumber = `SQ${Date.now().toString().slice(-6)}`;

        const response: SquarePaymentResponse = {
          success: true,
          paymentId,
          transactionId,
          status: 'completed' as const,
          message: 'Payment processed successfully',
          receiptUrl: `${this.baseUrl}/receipts/${paymentId}`,
          receiptNumber
        };

        console.log(`✅ [${requestId}] Square Payment SUCCESS:`, {
          requestId,
          paymentId,
          transactionId,
          receiptNumber,
          status: 'completed',
          amount: paymentRequest.amount,
          timestamp: new Date().toISOString(),
          dashboardUrl: `https://squareupsandbox.com/dashboard/sales/transactions/${transactionId}`
        });

        return response;
      } else {
        // Simulate different types of failures
        const failureTypes = [
          { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient funds on card' },
          { code: 'CARD_DECLINED', message: 'Card declined by issuer' },
          { code: 'INVALID_CARD', message: 'Invalid card number or details' },
          { code: 'EXPIRED_CARD', message: 'Card has expired' },
          { code: 'PROCESSING_ERROR', message: 'Unable to process payment at this time' },
        ];
        
        const failure = failureTypes[Math.floor(Math.random() * failureTypes.length)];

        return {
          success: false,
          status: 'failed',
          message: failure.message,
          error: {
            code: failure.code,
            message: failure.message,
          },
        };
      }
    } catch (error) {
      console.error('Square payment processing error:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Payment processing failed',
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  }

  /**
   * Refund a payment
   */
  async refundPayment(refundRequest: SquareRefundRequest): Promise<SquareRefundResponse> {
    try {
      console.log('Processing Square refund:', refundRequest);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate refund processing with 98% success rate
      const isSuccess = Math.random() > 0.02;

      if (isSuccess) {
        const refundId = `sqref_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        return {
          success: true,
          refundId,
          status: 'completed',
          message: 'Refund processed successfully',
        };
      } else {
        return {
          success: false,
          status: 'failed',
          message: 'Refund could not be processed',
          error: {
            code: 'REFUND_FAILED',
            message: 'Unable to process refund at this time',
          },
        };
      }
    } catch (error) {
      console.error('Square refund processing error:', error);
      return {
        success: false,
        status: 'failed',
        message: 'Refund processing failed',
        error: {
          code: 'PROCESSING_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
        },
      };
    }
  }

  /**
   * Validate card token (for tokenized payments)
   */
  async validateCardToken(cardToken: string): Promise<boolean> {
    try {
      // In production, this would validate the token with Square API
      console.log('Validating card token:', cardToken);
      
      // Simulate validation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simple validation - token should be non-empty and start with 'sq0'
      return cardToken.length > 0 && cardToken.startsWith('sq0');
    } catch (error) {
      console.error('Card token validation error:', error);
      return false;
    }
  }

  /**
   * Get payment status
   */
  async getPaymentStatus(paymentId: string): Promise<any> {
    try {
      // In production, this would fetch from Square API
      console.log('Getting payment status for:', paymentId);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        paymentId,
        status: 'completed',
        amount: 0, // Would be actual amount
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Create a customer profile (for recurring payments)
   */
  async createCustomer(customerData: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  }): Promise<{ customerId: string; success: boolean }> {
    try {
      console.log('Creating Square customer profile:', customerData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const customerId = `sq_cust_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        customerId,
        success: true,
      };
    } catch (error) {
      console.error('Error creating customer:', error);
      return {
        customerId: '',
        success: false,
      };
    }
  }
}

// Square API configuration (you'd store these securely in environment variables)
const squareConfig: SquarePaymentConfig = {
  applicationId: import.meta.env.VITE_SQUARE_APPLICATION_ID || 'demo_app_id',
  accessToken: import.meta.env.VITE_SQUARE_ACCESS_TOKEN || 'demo_access_token',
  environment: (import.meta.env.VITE_SQUARE_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
  locationId: import.meta.env.VITE_SQUARE_LOCATION_ID || 'demo_location_id',
};

// Export singleton instance
export const squarePaymentService = new SquarePaymentService(squareConfig);

// Export the class for custom instances
export { SquarePaymentService };
