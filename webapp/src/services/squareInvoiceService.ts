import { supabase } from '../lib/supabase';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  specialInstructions?: string;
}

interface CreateInvoiceResponse {
  success: boolean;
  invoiceId: string;
  publicUrl: string;
  orderNumber: string;
  orderId?: string;
  error?: string;
}

class SquareInvoiceService {
  /**
   * Create a Square invoice via Supabase Edge Function
   */
  async createInvoice(
    cartItems: CartItem[],
    totalWithTax: number,
    deliveryTime?: string
  ): Promise<{ invoiceId: string; publicUrl: string; orderNumber: string; total?: number; isDemo?: boolean }> {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User authentication required');
      }

      console.log('Creating Square invoice via Edge Function...');
      console.log('Cart items:', cartItems);
      console.log('Total with tax:', totalWithTax);

      // Try production mode first - call the deployed Edge Function
      try {
        const { data, error } = await supabase.functions.invoke('create-square-invoice', {
          body: {
            cartItems,
            totalWithTax,
            deliveryTime,
            userId: user.id
          }
        });

        if (error) {
          console.warn('Edge Function not available, falling back to demo mode:', error);
          // Fall through to demo mode below
        } else if (data && data.success) {
          console.log('Production Square invoice created successfully');
          return {
            invoiceId: data.invoiceId,
            publicUrl: data.publicUrl,
            orderNumber: data.orderNumber,
            total: totalWithTax,
            isDemo: false
          };
        } else {
          console.warn('Edge Function returned error, falling back to demo mode:', data);
          // Fall through to demo mode below
        }
      } catch (edgeFunctionError) {
        console.warn('Edge Function failed, falling back to demo mode:', edgeFunctionError);
        // Fall through to demo mode below
      }

      // Demo mode fallback
      console.log('Running in demo mode');
      
      // For demo purposes, create a mock Square invoice
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generate order number like the existing orderService
      const orderNumber = `ORDER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Create a mock Square payment URL (in production, this would be the real Square invoice URL)
      const mockPaymentUrl = `https://squareup.com/pay/${orderNumber}`;

      // Parse delivery date properly (similar to orderService)
      let formattedDeliveryDate: string;
      let formattedDeliveryTime: string;
      
      try {
        // If deliveryTime contains both date and time (e.g., "2025-09-12 13:00")
        if (deliveryTime && deliveryTime.includes(' ')) {
          const [datePart, timePart] = deliveryTime.split(' ');
          const date = new Date(datePart);
          if (isNaN(date.getTime())) {
            throw new Error('Invalid delivery date');
          }
          formattedDeliveryDate = date.toISOString().split('T')[0];
          formattedDeliveryTime = timePart;
        } 
        // If deliveryTime is just a time (e.g., "13:00"), use today's date
        else if (deliveryTime && deliveryTime.match(/^\d{1,2}:\d{2}$/)) {
          formattedDeliveryDate = new Date().toISOString().split('T')[0];
          formattedDeliveryTime = deliveryTime;
        }
        // Default to today and TBD
        else {
          formattedDeliveryDate = new Date().toISOString().split('T')[0];
          formattedDeliveryTime = 'TBD';
        }
      } catch (dateError) {
        console.error('Error parsing delivery time:', deliveryTime, dateError);
        formattedDeliveryDate = new Date().toISOString().split('T')[0];
        formattedDeliveryTime = 'TBD';
      }

      console.log('Preparing to insert order with data:', {
        user_id: user.id,
        order_number: orderNumber,
        total: totalWithTax,
        status: 'paid', // Square payment would be paid immediately
        payment_method: 'Square Invoice',
        delivery_date: formattedDeliveryDate,
        delivery_time: formattedDeliveryTime,
        delivery_address: '', // Will need to get this from user profile or form
        notes: ''
      });

      // Save order to database (following the same pattern as orderService)
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          total: totalWithTax,
          status: 'paid', // Square payment would be paid immediately
          payment_method: 'Square Invoice',
          delivery_date: formattedDeliveryDate,
          delivery_time: formattedDeliveryTime,
          delivery_address: '', // Will need to get this from user profile or form
          notes: ''
        })
        .select()
        .single();

      if (orderError) {
        console.error('Database error saving order:', orderError);
        console.error('Error details:', JSON.stringify(orderError, null, 2));
        throw new Error(`Failed to save order to database: ${orderError.message || JSON.stringify(orderError)}`);
      }

      console.log('Order saved successfully:', orderData);

      // Save order items to separate table (following orderService pattern)
      const orderItems = cartItems.map(item => ({
        order_id: orderData.id,
        menu_item_id: item.id || null,
        menu_item_name: item.name,
        menu_item_ingredients: item.specialInstructions || '',
        unit_size: '', // Cart items might not have this
        abv: 0, // Cart items might not have this
        price: Number(item.price),
        quantity: Number(item.quantity),
        subtotal: Number(item.price) * Number(item.quantity)
      }));

      console.log('Inserting order items:', orderItems);

      const { data: itemsData, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        console.error('Database error saving order items:', itemsError);
        // Try to rollback the order
        await supabase.from('orders').delete().eq('id', orderData.id);
        throw new Error(`Failed to save order items to database: ${itemsError.message || JSON.stringify(itemsError)}`);
      }

      console.log('Order items saved successfully:', itemsData);

      // Return success data for popup display
      return {
        invoiceId: `mock_invoice_${orderNumber}`,
        publicUrl: mockPaymentUrl,
        orderNumber: orderNumber,
        total: totalWithTax,
        isDemo: true
      };

      // TODO: Uncomment this when Edge Function is deployed
      /*
      // Call Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('create-square-invoice', {
        body: {
          cartItems,
          totalWithTax,
          deliveryTime,
          userId: user.id
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to create Square invoice');
      }

      const result = data as CreateInvoiceResponse;

      if (!result.success) {
        console.error('Square invoice creation failed:', result.error);
        throw new Error(result.error || 'Failed to create Square invoice');
      }

      console.log('Square invoice created successfully:', {
        invoiceId: result.invoiceId,
        orderNumber: result.orderNumber
      });

      return {
        invoiceId: result.invoiceId,
        publicUrl: result.publicUrl,
        orderNumber: result.orderNumber
      };
      */

    } catch (error) {
      console.error('Error creating Square invoice:', error);
      throw error;
    }
  }
}

export const squareInvoiceService = new SquareInvoiceService();
export type { CartItem, CreateInvoiceResponse };
