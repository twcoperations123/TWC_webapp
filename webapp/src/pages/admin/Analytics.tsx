import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, Users, ShoppingCart, DollarSign, Package } from "lucide-react";
import { populateSampleOrders, clearAllOrders } from "../../utils/sampleOrderData";

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

interface DrinkStats {
  name: string;
  category: string;
  totalOrdered: number;
  totalRevenue: number;
  averageOrderSize: number;
  uniqueCustomers: Set<string>;
  ordersCount: number;
}

interface CustomerStats {
  userId: string;
  userName: string;
  totalOrders: number;
  totalSpent: number;
  favoriteCategory: string;
  lastOrderDate: string;
  drinkPreferences: { [drinkName: string]: number };
}

interface AnalyticsData {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  topDrinks: DrinkStats[];
  topCustomers: CustomerStats[];
  categoryBreakdown: { [category: string]: { orders: number; revenue: number } };
  monthlyTrends: { month: string; orders: number; revenue: number }[];
  recentActivity: { date: string; orders: number; revenue: number }[];
  hourlyPattern: { hour: string; orders: number; revenue: number }[];
  dayOfWeekPattern: { day: string; orders: number; revenue: number }[];
  salesTrends: { period: string; growth: number }[];
  customerRetention: { period: string; returning: number; new: number }[];
  profitabilityMetrics: {
    totalCosts: number;
    grossProfit: number;
    profitMargin: number;
    avgItemsPerOrder: number;
  };
}

const loadOrders = (): Order[] => {
  try {
    return JSON.parse(localStorage.getItem('orders') || '[]');
  } catch {
    return [];
  }
};

export default function Analytics() {
  const [orders, setOrders] = useState<Order[]>(loadOrders());
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [isLoading, setIsLoading] = useState(true);
  const [showSampleDataControls, setShowSampleDataControls] = useState(false);

  // Sample data management functions
  const handleGenerateSampleData = () => {
    if (confirm('This will add 150 sample orders to your existing data. Continue?')) {
      populateSampleOrders(150);
      // Refresh analytics
      const updatedOrders = loadOrders();
      setOrders(updatedOrders);
    }
  };

  const handleClearAllData = () => {
    if (confirm('This will permanently delete ALL order data. This cannot be undone. Continue?')) {
      clearAllOrders();
      setOrders([]);
    }
  };

  useEffect(() => {
    const calculateAnalytics = () => {
      setIsLoading(true);
      
      // Filter orders based on time range
      const now = new Date();
      const cutoffDate = new Date();
      
      switch (timeRange) {
        case 'week':
          cutoffDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 'quarter':
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 'year':
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      const filteredOrders = orders.filter(order => 
        new Date(order.orderDate) >= cutoffDate
      );

      // Calculate drink statistics
      const drinkStatsMap = new Map<string, DrinkStats>();
      
      filteredOrders.forEach(order => {
        order.items.forEach(item => {
          const key = item.name;
          if (!drinkStatsMap.has(key)) {
            drinkStatsMap.set(key, {
              name: item.name,
              category: item.category,
              totalOrdered: 0,
              totalRevenue: 0,
              averageOrderSize: 0,
              uniqueCustomers: new Set(),
              ordersCount: 0
            });
          }
          
          const stats = drinkStatsMap.get(key)!;
          stats.totalOrdered += item.quantity;
          stats.totalRevenue += item.price * item.quantity;
          stats.uniqueCustomers.add(order.userId);
          stats.ordersCount++;
        });
      });

      // Convert to array and calculate averages
      const drinkStats = Array.from(drinkStatsMap.values()).map(stat => ({
        ...stat,
        averageOrderSize: stat.totalOrdered / stat.ordersCount,
        uniqueCustomers: stat.uniqueCustomers // Keep as Set for now
      }));

      // Sort by total ordered quantity
      const topDrinks = drinkStats
        .sort((a, b) => b.totalOrdered - a.totalOrdered)
        .slice(0, 10);

      // Calculate customer statistics
      const customerStatsMap = new Map<string, CustomerStats>();
      
      filteredOrders.forEach(order => {
        if (!customerStatsMap.has(order.userId)) {
          customerStatsMap.set(order.userId, {
            userId: order.userId,
            userName: order.userName,
            totalOrders: 0,
            totalSpent: 0,
            favoriteCategory: '',
            lastOrderDate: order.orderDate,
            drinkPreferences: {}
          });
        }
        
        const customerStats = customerStatsMap.get(order.userId)!;
        customerStats.totalOrders++;
        customerStats.totalSpent += order.total;
        
        if (new Date(order.orderDate) > new Date(customerStats.lastOrderDate)) {
          customerStats.lastOrderDate = order.orderDate;
        }
        
        // Track drink preferences
        order.items.forEach(item => {
          customerStats.drinkPreferences[item.name] = 
            (customerStats.drinkPreferences[item.name] || 0) + item.quantity;
        });
      });

      // Calculate favorite category for each customer
      const customerStats = Array.from(customerStatsMap.values()).map(customer => {
        const categoryCount: { [category: string]: number } = {};
        
        filteredOrders
          .filter(order => order.userId === customer.userId)
          .forEach(order => {
            order.items.forEach(item => {
              categoryCount[item.category] = (categoryCount[item.category] || 0) + item.quantity;
            });
          });
        
        const favoriteCategory = Object.entries(categoryCount)
          .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
        
        return {
          ...customer,
          favoriteCategory
        };
      });

      const topCustomers = customerStats
        .sort((a, b) => b.totalSpent - a.totalSpent)
        .slice(0, 10);

      // Calculate category breakdown
      const categoryBreakdown: { [category: string]: { orders: number; revenue: number } } = {};
      
      filteredOrders.forEach(order => {
        order.items.forEach(item => {
          if (!categoryBreakdown[item.category]) {
            categoryBreakdown[item.category] = { orders: 0, revenue: 0 };
          }
          categoryBreakdown[item.category].orders += item.quantity;
          categoryBreakdown[item.category].revenue += item.price * item.quantity;
        });
      });

      // Calculate monthly trends (last 6 months)
      const monthlyTrends = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        
        const monthOrders = orders.filter(order => {
          const orderDate = new Date(order.orderDate);
          return orderDate >= monthStart && orderDate <= monthEnd;
        });
        
        monthlyTrends.push({
          month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          orders: monthOrders.length,
          revenue: monthOrders.reduce((sum, order) => sum + order.total, 0)
        });
      }

      // Calculate recent activity (last 7 days)
      const recentActivity = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);
        
        const dayOrders = orders.filter(order => {
          const orderDate = new Date(order.orderDate);
          return orderDate >= dayStart && orderDate < dayEnd;
        });
        
        recentActivity.push({
          date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, order) => sum + order.total, 0)
        });
      }

      // Calculate overall metrics
      const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = filteredOrders.length;
      const uniqueCustomers = new Set(filteredOrders.map(order => order.userId)).size;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate hourly patterns
      const hourlyPattern = [];
      for (let hour = 0; hour < 24; hour++) {
        const hourOrders = filteredOrders.filter(order => {
          const orderHour = new Date(order.orderDate).getHours();
          return orderHour === hour;
        });
        
        hourlyPattern.push({
          hour: `${hour.toString().padStart(2, '0')}:00`,
          orders: hourOrders.length,
          revenue: hourOrders.reduce((sum, order) => sum + order.total, 0)
        });
      }

      // Calculate day of week patterns
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayOfWeekPattern = dayNames.map((dayName, dayIndex) => {
        const dayOrders = filteredOrders.filter(order => {
          const orderDay = new Date(order.orderDate).getDay();
          return orderDay === dayIndex;
        });
        
        return {
          day: dayName,
          orders: dayOrders.length,
          revenue: dayOrders.reduce((sum, order) => sum + order.total, 0)
        };
      });

      // Calculate sales trends (week over week, month over month)
      const salesTrends = [];
      const currentDate = new Date();
      
      // Weekly trend
      const thisWeekStart = new Date(currentDate.getTime() - (7 * 24 * 60 * 60 * 1000));
      const lastWeekStart = new Date(currentDate.getTime() - (14 * 24 * 60 * 60 * 1000));
      
      const thisWeekOrders = orders.filter(order => new Date(order.orderDate) >= thisWeekStart);
      const lastWeekOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= lastWeekStart && orderDate < thisWeekStart;
      });
      
      const thisWeekRevenue = thisWeekOrders.reduce((sum, order) => sum + order.total, 0);
      const lastWeekRevenue = lastWeekOrders.reduce((sum, order) => sum + order.total, 0);
      const weeklyGrowth = lastWeekRevenue > 0 ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100 : 0;
      
      salesTrends.push({
        period: 'Week over Week',
        growth: weeklyGrowth
      });

      // Monthly trend
      const thisMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const lastMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const lastMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      
      const thisMonthOrders = orders.filter(order => new Date(order.orderDate) >= thisMonthStart);
      const lastMonthOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        return orderDate >= lastMonthStart && orderDate <= lastMonthEnd;
      });
      
      const thisMonthRevenue = thisMonthOrders.reduce((sum, order) => sum + order.total, 0);
      const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + order.total, 0);
      const monthlyGrowth = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
      
      salesTrends.push({
        period: 'Month over Month',
        growth: monthlyGrowth
      });

      // Calculate customer retention
      const customerRetention: { period: string; returning: number; new: number }[] = [];
      const customerOrderHistory = new Map<string, Date[]>();
      
      // Build customer order history
      filteredOrders.forEach(order => {
        if (!customerOrderHistory.has(order.userId)) {
          customerOrderHistory.set(order.userId, []);
        }
        customerOrderHistory.get(order.userId)!.push(new Date(order.orderDate));
      });

      // Calculate new vs returning customers for recent periods
      const periods = [
        { name: 'Last 30 Days', days: 30 },
        { name: 'Last 90 Days', days: 90 },
      ];

      periods.forEach(period => {
        const periodStart = new Date(currentDate.getTime() - (period.days * 24 * 60 * 60 * 1000));
        const periodOrders = filteredOrders.filter(order => new Date(order.orderDate) >= periodStart);
        const periodCustomers = new Set(periodOrders.map(order => order.userId));
        
        let newCustomers = 0;
        let returningCustomers = 0;
        
        periodCustomers.forEach(customerId => {
          const customerOrders = customerOrderHistory.get(customerId) || [];
          const ordersBeforePeriod = customerOrders.filter(orderDate => orderDate < periodStart);
          
          if (ordersBeforePeriod.length > 0) {
            returningCustomers++;
          } else {
            newCustomers++;
          }
        });
        
        customerRetention.push({
          period: period.name,
          returning: returningCustomers,
          new: newCustomers
        });
      });

      // Calculate profitability metrics (estimated)
      const avgItemCost = 15; // Estimated average cost per item (30% of avg price)
      const totalItemsSold = filteredOrders.reduce((sum, order) => 
        sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0);
      const totalCosts = totalItemsSold * avgItemCost;
      const grossProfit = totalRevenue - totalCosts;
      const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const avgItemsPerOrder = totalOrders > 0 ? totalItemsSold / totalOrders : 0;

      const profitabilityMetrics = {
        totalCosts,
        grossProfit,
        profitMargin,
        avgItemsPerOrder
      };

      setAnalytics({
        totalRevenue,
        totalOrders,
        totalCustomers: uniqueCustomers,
        averageOrderValue,
        topDrinks,
        topCustomers,
        categoryBreakdown,
        monthlyTrends,
        recentActivity,
        hourlyPattern,
        dayOfWeekPattern,
        salesTrends,
        customerRetention,
        profitabilityMetrics
      });

      setIsLoading(false);
    };

    calculateAnalytics();
  }, [orders, timeRange]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Calculating analytics...</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-600">Unable to load analytics data.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-safe-bottom">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center">
            <BarChart3 className="w-6 sm:w-8 h-6 sm:h-8 mr-2 sm:mr-3 text-emerald-600" />
            <span className="hidden sm:inline">Analytics & Reports</span>
            <span className="sm:hidden">Analytics</span>
          </h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Track your business performance and customer insights</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {/* Time Range Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
            <label className="text-sm font-medium text-gray-700">Time Range:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 mobile-input w-full sm:w-auto"
            >
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          {/* Sample Data Controls */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={() => setShowSampleDataControls(!showSampleDataControls)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors mobile-button-compact w-full sm:w-auto"
            >
              Sample Data
            </button>
            {showSampleDataControls && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 space-y-2 z-10">
                <button
                  onClick={handleGenerateSampleData}
                  className="block w-full px-3 py-2 text-sm text-left hover:bg-emerald-50 rounded"
                >
                  Generate Sample Orders
                </button>
                <button
                  onClick={handleClearAllData}
                  className="block w-full px-3 py-2 text-sm text-left hover:bg-red-50 text-red-600 rounded"
                >
                  Clear All Data
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalRevenue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customers</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.totalCustomers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-orange-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.averageOrderValue)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trends */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 text-emerald-600 mr-2" />
            Sales Growth
          </h2>
          <div className="space-y-4">
            {analytics.salesTrends.map((trend, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="font-medium text-gray-900">{trend.period}</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-bold ${trend.growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {trend.growth >= 0 ? '+' : ''}{trend.growth.toFixed(1)}%
                  </span>
                  {trend.growth >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Retention */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Users className="w-5 h-5 text-emerald-600 mr-2" />
            Customer Retention
          </h2>
          <div className="space-y-4">
            {analytics.customerRetention.map((retention, index) => (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-900">{retention.period}</span>
                  <span className="text-sm text-gray-600">
                    {retention.returning + retention.new} total customers
                  </span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-emerald-600 h-3 rounded-l-full"
                      style={{ 
                        width: `${(retention.returning / (retention.returning + retention.new)) * 100}%` 
                      }}
                    />
                  </div>
                  <div className="text-sm text-gray-600 min-w-max">
                    <span className="text-emerald-600 font-medium">{retention.returning}</span> returning,{' '}
                    <span className="text-blue-600 font-medium">{retention.new}</span> new
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Profitability Metrics */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="w-5 h-5 text-emerald-600 mr-2" />
            Profitability Analysis
          </h2>
          <p className="text-sm text-gray-600 mt-1">Estimated profitability metrics based on industry averages</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center p-4 bg-emerald-50 rounded-lg">
              <div className="text-2xl font-bold text-emerald-600">
                {formatCurrency(analytics.profitabilityMetrics.grossProfit)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Gross Profit</div>
              <div className="text-xs text-gray-500 mt-1">
                Revenue - Estimated Costs
              </div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {analytics.profitabilityMetrics.profitMargin.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 mt-1">Profit Margin</div>
              <div className="text-xs text-gray-500 mt-1">
                Gross Profit / Revenue
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analytics.profitabilityMetrics.avgItemsPerOrder.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Avg Items/Order</div>
              <div className="text-xs text-gray-500 mt-1">
                Items per customer order
              </div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(analytics.profitabilityMetrics.totalCosts)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Est. Total Costs</div>
              <div className="text-xs text-gray-500 mt-1">
                Based on 30% of revenue
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly Patterns */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Peak Hours Analysis</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {analytics.hourlyPattern
              .filter(hour => hour.orders > 0)
              .sort((a, b) => b.orders - a.orders)
              .slice(0, 12)
              .map((hour, index) => {
                const maxOrders = Math.max(...analytics.hourlyPattern.map(h => h.orders));
                const widthPercentage = maxOrders > 0 ? (hour.orders / maxOrders) * 100 : 0;
                
                return (
                  <div key={index} className="space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-gray-900">{hour.hour}</span>
                      <div className="text-right">
                        <div className="font-medium text-gray-900">{hour.orders} orders</div>
                        <div className="text-xs text-gray-500">{formatCurrency(hour.revenue)}</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Day of Week Patterns */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Weekly Patterns</h2>
          <div className="space-y-3">
            {analytics.dayOfWeekPattern.map((day, index) => {
              const maxOrders = Math.max(...analytics.dayOfWeekPattern.map(d => d.orders));
              const widthPercentage = maxOrders > 0 ? (day.orders / maxOrders) * 100 : 0;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{day.day}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">{day.orders} orders</div>
                      <div className="text-xs text-gray-500">{formatCurrency(day.revenue)}</div>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${widthPercentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Existing Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Performance */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Category Performance</h2>
          <div className="space-y-4">
            {Object.entries(analytics.categoryBreakdown)
              .sort(([,a], [,b]) => b.revenue - a.revenue)
              .map(([category, data]) => {
                const maxRevenue = Math.max(...Object.values(analytics.categoryBreakdown).map(d => d.revenue));
                const widthPercentage = (data.revenue / maxRevenue) * 100;
                
                return (
                  <div key={category} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900 capitalize">{category}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(data.revenue)}</div>
                        <div className="text-xs text-gray-500">{data.orders} items sold</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${widthPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Activity (Last 7 Days)</h2>
          <div className="space-y-3">
            {analytics.recentActivity.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-emerald-600 rounded-full"></div>
                  <span className="font-medium text-gray-900">{day.date}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">{formatCurrency(day.revenue)}</div>
                  <div className="text-xs text-gray-500">{day.orders} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enhanced Top Performing Items */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Package className="w-5 h-5 text-emerald-600 mr-2" />
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Drink Performance Analytics</h2>
                <p className="text-sm text-gray-600 mt-1">Comprehensive analysis of drink sales and customer preferences</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Mobile-friendly Performance Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="bg-emerald-50 p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-emerald-600">
                {analytics.topDrinks.length}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Active Drinks</div>
            </div>
            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {analytics.topDrinks.reduce((sum, drink) => sum + drink.totalOrdered, 0)}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Total Units Sold</div>
            </div>
            <div className="bg-purple-50 p-3 sm:p-4 rounded-lg text-center">
              <div className="text-xl sm:text-2xl font-bold text-purple-600">
                {analytics.topDrinks[0]?.name.substring(0, 15) + (analytics.topDrinks[0]?.name.length > 15 ? '...' : '') || 'N/A'}
              </div>
              <div className="text-xs sm:text-sm text-gray-600">Top Seller</div>
            </div>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block mobile-table-container">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Drink Name
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units Sold
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Revenue
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Avg/Order
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Customers
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {analytics.topDrinks.map((drink, index) => {
                  const performanceScore = (drink.totalRevenue / Math.max(...analytics.topDrinks.map(d => d.totalRevenue))) * 100;
                  return (
                    <tr key={drink.name} className={index < 3 ? 'bg-yellow-50' : ''}>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {index < 3 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            #{index + 1}
                          </span>
                        ) : (
                          <span className="text-gray-500">#{index + 1}</span>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-[120px] md:max-w-none">{drink.name}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                          {drink.category}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="font-medium">{drink.totalOrdered}</div>
                        <div className="text-xs text-gray-500">{drink.ordersCount} orders</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(drink.totalRevenue)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        {drink.averageOrderSize.toFixed(1)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden lg:table-cell">
                        <div className="font-medium">{drink.uniqueCustomers.size}</div>
                        <div className="text-xs text-gray-500">
                          {((drink.uniqueCustomers.size / analytics.totalCustomers) * 100).toFixed(1)}% reach
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <div className="w-12 lg:w-16 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-emerald-600 h-2 rounded-full"
                              style={{ width: `${performanceScore}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{performanceScore.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-3">
            {analytics.topDrinks.map((drink, index) => {
              const performanceScore = (drink.totalRevenue / Math.max(...analytics.topDrinks.map(d => d.totalRevenue))) * 100;
              return (
                <div key={drink.name} className={`mobile-table-card ${index < 3 ? 'border-yellow-300 bg-yellow-50' : ''}`}>
                  <div className="mobile-table-card-header flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {index < 3 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          #{index + 1}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">#{index + 1}</span>
                      )}
                      <span className="font-semibold text-gray-900 truncate">{drink.name}</span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                      {drink.category}
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="mobile-table-card-row">
                      <span className="mobile-table-card-label">Units Sold:</span>
                      <span className="mobile-table-card-value">{drink.totalOrdered} ({drink.ordersCount} orders)</span>
                    </div>
                    <div className="mobile-table-card-row">
                      <span className="mobile-table-card-label">Revenue:</span>
                      <span className="mobile-table-card-value font-semibold">{formatCurrency(drink.totalRevenue)}</span>
                    </div>
                    <div className="mobile-table-card-row">
                      <span className="mobile-table-card-label">Avg/Order:</span>
                      <span className="mobile-table-card-value">{drink.averageOrderSize.toFixed(1)}</span>
                    </div>
                    <div className="mobile-table-card-row">
                      <span className="mobile-table-card-label">Customers:</span>
                      <span className="mobile-table-card-value">{drink.uniqueCustomers.size} ({((drink.uniqueCustomers.size / analytics.totalCustomers) * 100).toFixed(1)}% reach)</span>
                    </div>
                    <div className="mobile-table-card-row">
                      <span className="mobile-table-card-label">Performance:</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full"
                            style={{ width: `${performanceScore}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{performanceScore.toFixed(0)}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {analytics.topDrinks.length === 0 && (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No drink data available for the selected time period</p>
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Top Customers with Drink Preferences */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="w-5 h-5 text-emerald-600 mr-2" />
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Customer Analysis & Preferences</h2>
                <p className="text-sm text-gray-600 mt-1">Top customers and their detailed drink preferences</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            {analytics.topCustomers.map((customer, index) => {
              const favoriteItems = Object.entries(customer.drinkPreferences)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 5);
              
              const totalItemsOrdered = Object.values(customer.drinkPreferences)
                .reduce((sum, quantity) => sum + quantity, 0);
              
              return (
                <div key={customer.userId} className="border border-gray-200 rounded-lg p-4 sm:p-6 hover:shadow-md transition-shadow">
                  {/* Customer Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 space-y-3 sm:space-y-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 sm:w-12 h-10 sm:h-12 rounded-full flex items-center justify-center text-white font-bold text-sm sm:text-base ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' :
                        index === 2 ? 'bg-orange-500' : 'bg-emerald-500'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{customer.userName}</h3>
                        <p className="text-xs sm:text-sm text-gray-500">Customer since orders began</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-lg sm:text-xl font-bold text-gray-900">{formatCurrency(customer.totalSpent)}</p>
                      <p className="text-sm text-gray-500">{customer.totalOrders} orders</p>
                    </div>
                  </div>

                  {/* Customer Metrics */}
                  <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
                    <div className="bg-blue-50 p-2 sm:p-3 rounded-lg text-center">
                      <div className="text-sm sm:text-lg font-bold text-blue-600">
                        {formatCurrency(customer.totalSpent / customer.totalOrders)}
                      </div>
                      <div className="text-xs text-gray-600">Avg Order</div>
                    </div>
                    <div className="bg-purple-50 p-2 sm:p-3 rounded-lg text-center">
                      <div className="text-sm sm:text-lg font-bold text-purple-600 capitalize truncate">
                        {customer.favoriteCategory}
                      </div>
                      <div className="text-xs text-gray-600">Fav Category</div>
                    </div>
                    <div className="bg-emerald-50 p-2 sm:p-3 rounded-lg text-center">
                      <div className="text-sm sm:text-lg font-bold text-emerald-600">
                        {totalItemsOrdered}
                      </div>
                      <div className="text-xs text-gray-600">Total Items</div>
                    </div>
                  </div>

                  {/* Drink Preferences */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 flex items-center text-sm sm:text-base">
                      <ShoppingCart className="w-4 h-4 mr-2 text-emerald-600" />
                      Drink Preferences
                    </h4>
                    {favoriteItems.length > 0 ? (
                      <div className="space-y-2">
                        {favoriteItems.map(([drinkName, quantity], drinkIndex) => {
                          const percentage = (quantity / totalItemsOrdered) * 100;
                          return (
                            <div key={drinkName} className="space-y-1">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-700 truncate max-w-[120px] sm:max-w-[180px]" title={drinkName}>
                                  {drinkName}
                                </span>
                                <div className="text-right">
                                  <span className="font-medium text-gray-900">{quantity}x</span>
                                  <span className="text-gray-500 ml-1">({percentage.toFixed(1)}%)</span>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    drinkIndex === 0 ? 'bg-emerald-500' :
                                    drinkIndex === 1 ? 'bg-blue-500' :
                                    drinkIndex === 2 ? 'bg-purple-500' :
                                    drinkIndex === 3 ? 'bg-orange-500' : 'bg-gray-500'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">No drink preference data available</p>
                    )}
                  </div>
                  
                  {/* Last Order Info */}
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Last Order:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {analytics.topCustomers.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No customer data available for the selected time period</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Monthly Trends</h2>
          <p className="text-sm text-gray-600 mt-1">Order and revenue trends over the last 6 months</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {analytics.monthlyTrends.map((month, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                <h3 className="font-medium text-gray-900 mb-2">{month.month}</h3>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-emerald-600">{formatCurrency(month.revenue)}</p>
                  <p className="text-sm text-gray-600">{month.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
