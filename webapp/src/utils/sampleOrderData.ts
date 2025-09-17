import { sampleMenuItems } from './sampleMenuItems';

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

interface Order {
  id: string;
  userId: string;
  userName: string;
  items: CartItem[];
  total: number;
  deliveryDate: string;
  deliveryTime: string;
  status: 'paid' | 'processed' | 'delivered';
  orderDate: string;
  paymentMethod: string;
}

const sampleCustomers = [
  { id: 'user-1', name: 'John Smith' },
  { id: 'user-2', name: 'Sarah Johnson' },
  { id: 'user-3', name: 'Mike Chen' },
  { id: 'user-4', name: 'Emily Davis' },
  { id: 'user-5', name: 'David Wilson' },
  { id: 'user-6', name: 'Lisa Anderson' },
  { id: 'user-7', name: 'Robert Taylor' },
  { id: 'user-8', name: 'Jennifer Brown' },
  { id: 'user-9', name: 'Michael Lee' },
  { id: 'user-10', name: 'Jessica Garcia' },
  { id: 'user-11', name: 'Christopher Martinez' },
  { id: 'user-12', name: 'Amanda Rodriguez' },
  { id: 'user-13', name: 'Daniel Thompson' },
  { id: 'user-14', name: 'Nicole White' },
  { id: 'user-15', name: 'Kevin Harris' },
];

const paymentMethods = ['Credit Card', 'Debit Card'];
const timeSlots = ['10:00', '12:00', '14:00', '16:00', '18:00', '20:00'];

// Helper function to get random item from array
const getRandomItem = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Helper function to get random number between min and max
const getRandomNumber = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

// Helper function to get random date within last N days
const getRandomDate = (daysBack: number): Date => {
  const now = new Date();
  const daysAgo = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  const randomTime = daysAgo.getTime() + Math.random() * (now.getTime() - daysAgo.getTime());
  return new Date(randomTime);
};

// Helper function to generate delivery date (1-7 days from order date)
const getDeliveryDate = (orderDate: Date): Date => {
  const deliveryDate = new Date(orderDate);
  deliveryDate.setDate(deliveryDate.getDate() + getRandomNumber(1, 7));
  return deliveryDate;
};

// Generate a realistic order with biased preferences
const generateOrder = (customer: typeof sampleCustomers[0], orderDate: Date): Order => {
  const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Number of items in order (1-5 items, weighted towards 1-3)
  const numItems = Math.random() < 0.7 ? getRandomNumber(1, 3) : getRandomNumber(4, 5);
  
  const items: CartItem[] = [];
  const usedItemIds = new Set<string>();
  
  // Customer preferences (some customers prefer certain categories)
  const customerPreferences = {
    wine: Math.random() * 0.4 + 0.1, // 10-50% chance
    spirits: Math.random() * 0.3 + 0.2, // 20-50% chance
    beer: Math.random() * 0.4 + 0.1, // 10-50% chance
    cocktails: Math.random() * 0.5 + 0.2, // 20-70% chance
    mixers: Math.random() * 0.2 + 0.05, // 5-25% chance
  };
  
  for (let i = 0; i < numItems; i++) {
    // Select item based on customer preferences
    let selectedItem;
    let attempts = 0;
    
    do {
      // Weight selection by customer preferences
      const rand = Math.random();
      let cumulative = 0;
      let selectedCategory = 'wine';
      
      for (const [category, weight] of Object.entries(customerPreferences)) {
        cumulative += weight;
        if (rand <= cumulative) {
          selectedCategory = category;
          break;
        }
      }
      
      const categoryItems = sampleMenuItems.filter(item => item.category === selectedCategory);
      selectedItem = getRandomItem(categoryItems.length > 0 ? categoryItems : sampleMenuItems);
      attempts++;
    } while (usedItemIds.has(selectedItem.id) && attempts < 10);
    
    if (!usedItemIds.has(selectedItem.id)) {
      usedItemIds.add(selectedItem.id);
      
      // Quantity (1-4, weighted towards 1-2)
      const quantity = Math.random() < 0.8 ? getRandomNumber(1, 2) : getRandomNumber(3, 4);
      
      items.push({
        ...selectedItem,
        quantity
      });
    }
  }
  
  // Calculate total
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Delivery details
  const deliveryDate = getDeliveryDate(orderDate);
  const deliveryTime = getRandomItem(timeSlots);
  
  // Status based on how old the order is
  const daysSinceOrder = Math.floor((Date.now() - orderDate.getTime()) / (24 * 60 * 60 * 1000));
  let status: 'paid' | 'processed' | 'delivered';
  
  if (daysSinceOrder < 1) {
    status = Math.random() < 0.7 ? 'paid' : 'processed';
  } else if (daysSinceOrder < 3) {
    status = Math.random() < 0.3 ? 'paid' : Math.random() < 0.6 ? 'processed' : 'delivered';
  } else {
    status = Math.random() < 0.1 ? 'processed' : 'delivered';
  }
  
  return {
    id: orderId,
    userId: customer.id,
    userName: customer.name,
    items,
    total,
    deliveryDate: deliveryDate.toISOString().split('T')[0],
    deliveryTime,
    status,
    orderDate: orderDate.toISOString(),
    paymentMethod: getRandomItem(paymentMethods)
  };
};

// Generate sample orders for the last 6 months
export const generateSampleOrders = (count: number = 150): Order[] => {
  const orders: Order[] = [];
  
  // Generate orders with realistic distribution over time
  // More recent orders should be more frequent
  for (let i = 0; i < count; i++) {
    // Bias towards more recent dates
    const daysBack = Math.random() < 0.5 
      ? getRandomNumber(0, 30)   // 50% from last 30 days
      : Math.random() < 0.7 
        ? getRandomNumber(31, 90)  // 35% from 31-90 days ago
        : getRandomNumber(91, 180); // 15% from 91-180 days ago
    
    const orderDate = getRandomDate(daysBack);
    const customer = getRandomItem(sampleCustomers);
    
    // Some customers order more frequently
    const isFrequentCustomer = Math.random() < 0.3;
    if (isFrequentCustomer && Math.random() < 0.4) {
      // Generate additional order for frequent customers
      const secondOrderDate = getRandomDate(daysBack + getRandomNumber(1, 14));
      orders.push(generateOrder(customer, secondOrderDate));
    }
    
    orders.push(generateOrder(customer, orderDate));
  }
  
  // Sort by order date (newest first)
  orders.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
  
  return orders;
};

// Function to populate localStorage with sample orders
export const populateSampleOrders = (count: number = 150): void => {
  const sampleOrders = generateSampleOrders(count);
  
  try {
    // Get existing orders
    const existingOrders = JSON.parse(localStorage.getItem('orders') || '[]');
    
    // Merge with sample orders (avoid duplicates by checking IDs)
    const existingIds = new Set(existingOrders.map((order: Order) => order.id));
    const newOrders = sampleOrders.filter(order => !existingIds.has(order.id));
    
    const allOrders = [...existingOrders, ...newOrders];
    
    localStorage.setItem('orders', JSON.stringify(allOrders));
    console.log(`Added ${newOrders.length} sample orders. Total orders: ${allOrders.length}`);
  } catch (error) {
    console.error('Error populating sample orders:', error);
  }
};

// Function to clear all orders
export const clearAllOrders = (): void => {
  localStorage.removeItem('orders');
  console.log('All orders cleared');
};

// Export sample data for testing
export { sampleCustomers };
