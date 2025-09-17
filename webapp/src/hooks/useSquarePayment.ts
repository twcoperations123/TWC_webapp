import { useState, useCallback } from 'react';
import { squarePaymentService } from '../services/squarePaymentService';
import type { 
  SquarePaymentRequest, 
  SquarePaymentResponse,
  SquareRefundRequest,
  SquareRefundResponse 
} from '../services/squarePaymentService';

export interface UseSquarePaymentResult {
  // Payment state
  isProcessing: boolean;
  paymentResult: SquarePaymentResponse | null;
  error: string | null;
  
  // Payment methods
  processPayment: (request: SquarePaymentRequest) => Promise<SquarePaymentResponse>;
  refundPayment: (request: SquareRefundRequest) => Promise<SquareRefundResponse>;
  validateCardToken: (token: string) => Promise<boolean>;
  getPaymentStatus: (paymentId: string) => Promise<any>;
  createCustomer: (customerData: any) => Promise<any>;
  clearError: () => void;
  reset: () => void;
}

export const useSquarePayment = (): UseSquarePaymentResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<SquarePaymentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processPayment = useCallback(async (request: SquarePaymentRequest): Promise<SquarePaymentResponse> => {
    setIsProcessing(true);
    setError(null);
    setPaymentResult(null);

    try {
      const result = await squarePaymentService.processPayment(request);
      setPaymentResult(result);
      
      if (!result.success) {
        setError(result.error?.message || result.message);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Payment processing failed';
      setError(errorMessage);
      
      const errorResult: SquarePaymentResponse = {
        success: false,
        status: 'failed',
        message: errorMessage,
        error: {
          code: 'PROCESSING_ERROR',
          message: errorMessage,
        },
      };
      
      setPaymentResult(errorResult);
      return errorResult;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const refundPayment = useCallback(async (request: SquareRefundRequest): Promise<SquareRefundResponse> => {
    setIsProcessing(true);
    setError(null);

    try {
      const result = await squarePaymentService.refundPayment(request);
      
      if (!result.success) {
        setError(result.error?.message || result.message);
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Refund processing failed';
      setError(errorMessage);
      
      return {
        success: false,
        status: 'failed',
        message: errorMessage,
        error: {
          code: 'PROCESSING_ERROR',
          message: errorMessage,
        },
      };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const validateCardToken = useCallback(async (token: string): Promise<boolean> => {
    try {
      return await squarePaymentService.validateCardToken(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Card validation failed');
      return false;
    }
  }, []);

  const getPaymentStatus = useCallback(async (paymentId: string): Promise<any> => {
    try {
      return await squarePaymentService.getPaymentStatus(paymentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get payment status');
      throw err;
    }
  }, []);

  const createCustomer = useCallback(async (customerData: any): Promise<any> => {
    try {
      return await squarePaymentService.createCustomer(customerData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create customer');
      throw err;
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setIsProcessing(false);
    setPaymentResult(null);
    setError(null);
  }, []);

  return {
    isProcessing,
    paymentResult,
    error,
    processPayment,
    refundPayment,
    validateCardToken,
    getPaymentStatus,
    createCustomer,
    clearError,
    reset,
  };
};
