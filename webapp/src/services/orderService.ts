import { supabase } from '../lib/supabase';

export interface OrderItem {
  id?: string;
  menuItemId?: string;
  menuItemName: string;
  menuItemIngredients?: string;
  unitSize?: string;
  abv?: number;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface Order {
  id?: string;
  userId: string;
  orderNumber: string;
  total: number;
  status: 'paid' | 'confirmed' | 'processing' | 'out_for_delivery' | 'delivered' | 'cancelled';
  paymentMethod: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress?: string;
  notes?: string;
  items: OrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateOrderData {
  userId: string;
  items: {
    menuItemId?: string;
    menuItemName: string;
    menuItemIngredients?: string;
    unitSize?: string;
    abv?: number;
    price: number;
    quantity: number;
  }[];
  total: number;
  paymentMethod: string;
  deliveryDate: string;
  deliveryTime: string;
  deliveryAddress?: string;
  notes?: string;
}

class OrderService {
  // Generate a unique order number
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ORD-${timestamp}-${random}`;
  }

  // Create a new order
  async createOrder(orderData: CreateOrderData): Promise<Order | null> {
    try {
      console.log('OrderService: Creating order with data:', orderData);
      const orderNumber = this.generateOrderNumber();
      
      // Validate and format delivery date
      let formattedDeliveryDate: string;
      try {
        const date = new Date(orderData.deliveryDate);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid delivery date');
        }
        // Format as YYYY-MM-DD for PostgreSQL DATE type
        formattedDeliveryDate = date.toISOString().split('T')[0];
      } catch (dateError) {
        console.error('OrderService: Invalid delivery date:', orderData.deliveryDate, dateError);
        return null;
      }

      // Create the order
      const orderInsertData = {
        user_id: orderData.userId,
        order_number: orderNumber,
        total: Number(orderData.total),
        status: orderData.paymentMethod === 'Pay on Delivery' ? 'confirmed' : 'paid',
        payment_method: orderData.paymentMethod,
        delivery_date: formattedDeliveryDate,
        delivery_time: orderData.deliveryTime,
        delivery_address: orderData.deliveryAddress || '',
        notes: orderData.notes || ''
      };

      console.log('OrderService: Inserting order:', orderInsertData);

      const { data: orderResult, error: orderError } = await supabase
        .from('orders')
        .insert(orderInsertData)
        .select()
        .single();

      if (orderError) {
        console.error('OrderService: Error creating order:', orderError);
        console.error('OrderService: Error details:', {
          message: orderError.message,
          details: orderError.details,
          hint: orderError.hint,
          code: orderError.code
        });
        return null;
      }

      console.log('OrderService: Order created successfully:', orderResult);

      // Create order items
      const orderItems = orderData.items.map(item => ({
        order_id: orderResult.id,
        menu_item_id: item.menuItemId || null,
        menu_item_name: item.menuItemName,
        menu_item_ingredients: item.menuItemIngredients || '',
        unit_size: item.unitSize || '',
        abv: Number(item.abv) || 0,
        price: Number(item.price),
        quantity: Number(item.quantity),
        subtotal: Number(item.price) * Number(item.quantity)
      }));

      console.log('OrderService: Inserting order items:', orderItems);

      const { data: itemsResult, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems)
        .select();

      if (itemsError) {
        console.error('OrderService: Error creating order items:', itemsError);
        console.error('OrderService: Order items error details:', {
          message: itemsError.message,
          details: itemsError.details,
          hint: itemsError.hint,
          code: itemsError.code
        });
        // Try to rollback the order
        await supabase.from('orders').delete().eq('id', orderResult.id);
        return null;
      }

      console.log('OrderService: Order items created successfully:', itemsResult);

      // Return the complete order
      return {
        id: orderResult.id,
        userId: orderResult.user_id,
        orderNumber: orderResult.order_number,
        total: orderResult.total,
        status: orderResult.status,
        paymentMethod: orderResult.payment_method,
        deliveryDate: orderResult.delivery_date,
        deliveryTime: orderResult.delivery_time,
        deliveryAddress: orderResult.delivery_address,
        notes: orderResult.notes,
        items: itemsResult.map(item => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          menuItemName: item.menu_item_name,
          menuItemIngredients: item.menu_item_ingredients,
          unitSize: item.unit_size,
          abv: item.abv,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal
        })),
        createdAt: orderResult.created_at,
        updatedAt: orderResult.updated_at
      };
    } catch (error) {
      console.error('Error in createOrder:', error);
      return null;
    }
  }

  // Get all orders for a user
  async getUserOrders(userId: string): Promise<Order[]> {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching user orders:', ordersError);
        return [];
      }

      return ordersData.map(order => ({
        id: order.id,
        userId: order.user_id,
        orderNumber: order.order_number,
        total: order.total,
        status: order.status,
        paymentMethod: order.payment_method,
        deliveryDate: order.delivery_date,
        deliveryTime: order.delivery_time,
        deliveryAddress: order.delivery_address,
        notes: order.notes,
        items: order.order_items.map((item: any) => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          menuItemName: item.menu_item_name,
          menuItemIngredients: item.menu_item_ingredients,
          unitSize: item.unit_size,
          abv: item.abv,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));
    } catch (error) {
      console.error('Error in getUserOrders:', error);
      return [];
    }
  }

  // Get all orders (admin only)
  async getAllOrders(): Promise<Order[]> {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*),
          users!orders_user_id_fkey (name, email)
        `)
        .order('created_at', { ascending: false });

      if (ordersError) {
        console.error('Error fetching all orders:', ordersError);
        return [];
      }

      return ordersData.map(order => ({
        id: order.id,
        userId: order.user_id,
        orderNumber: order.order_number,
        total: order.total,
        status: order.status,
        paymentMethod: order.payment_method,
        deliveryDate: order.delivery_date,
        deliveryTime: order.delivery_time,
        deliveryAddress: order.delivery_address,
        notes: order.notes,
        items: order.order_items.map((item: any) => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          menuItemName: item.menu_item_name,
          menuItemIngredients: item.menu_item_ingredients,
          unitSize: item.unit_size,
          abv: item.abv,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        // Add user info for admin view
        userName: order.users?.name,
        userEmail: order.users?.email
      }));
    } catch (error) {
      console.error('Error in getAllOrders:', error);
      return [];
    }
  }

  // Update order status (admin only)
  async updateOrderStatus(orderId: string, status: Order['status']): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) {
        console.error('Error updating order status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateOrderStatus:', error);
      return false;
    }
  }

  // Get order by ID
  async getOrderById(orderId: string): Promise<Order | null> {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) {
        console.error('Error fetching order:', orderError);
        return null;
      }

      return {
        id: orderData.id,
        userId: orderData.user_id,
        orderNumber: orderData.order_number,
        total: orderData.total,
        status: orderData.status,
        paymentMethod: orderData.payment_method,
        deliveryDate: orderData.delivery_date,
        deliveryTime: orderData.delivery_time,
        deliveryAddress: orderData.delivery_address,
        notes: orderData.notes,
        items: orderData.order_items.map((item: any) => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          menuItemName: item.menu_item_name,
          menuItemIngredients: item.menu_item_ingredients,
          unitSize: item.unit_size,
          abv: item.abv,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal
        })),
        createdAt: orderData.created_at,
        updatedAt: orderData.updated_at
      };
    } catch (error) {
      console.error('Error in getOrderById:', error);
      return null;
    }
  }

  // Get recent orders for dashboard
  async getRecentOrders(userId: string, limit: number = 5): Promise<Order[]> {
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (ordersError) {
        console.error('Error fetching recent orders:', ordersError);
        return [];
      }

      return ordersData.map(order => ({
        id: order.id,
        userId: order.user_id,
        orderNumber: order.order_number,
        total: order.total,
        status: order.status,
        paymentMethod: order.payment_method,
        deliveryDate: order.delivery_date,
        deliveryTime: order.delivery_time,
        deliveryAddress: order.delivery_address,
        notes: order.notes,
        items: order.order_items.map((item: any) => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          menuItemName: item.menu_item_name,
          menuItemIngredients: item.menu_item_ingredients,
          unitSize: item.unit_size,
          abv: item.abv,
          price: item.price,
          quantity: item.quantity,
          subtotal: item.subtotal
        })),
        createdAt: order.created_at,
        updatedAt: order.updated_at
      }));
    } catch (error) {
      console.error('Error in getRecentOrders:', error);
      return [];
    }
  }

  // Delete an order
  async deleteOrder(orderId: string): Promise<boolean> {
    try {
      // First delete order items
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', orderId);

      if (itemsError) {
        console.error('Error deleting order items:', itemsError);
        return false;
      }

      // Then delete the order
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (orderError) {
        console.error('Error deleting order:', orderError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteOrder:', error);
      return false;
    }
  }
}

export const orderService = new OrderService();
