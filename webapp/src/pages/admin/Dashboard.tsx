import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Users, Clock, CheckCircle, AlertCircle, ShoppingCart, BarChart3, FileText, MessageSquare } from "lucide-react";
import { AdminSettingsService } from "../../services/adminSettingsService";
import { useNavigationProgress } from "../../contexts/NavigationProgressContext";

interface Order {
  id: string;
  userId: string;
  userName: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  total: number;
  status: 'paid' | 'processed' | 'delivered';
  date: string;
  deliveryDate: string;
  deliveryTime: string;
}

interface OrderStats {
  totalOrders: number;
  paidOrders: number;
  processedOrders: number;
  deliveredOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
}

interface SupportTicket {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  subject: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  adminResponse?: string;
  adminResponseDate?: string;
}

export default function AdminDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats>({
    totalOrders: 0,
    paidOrders: 0,
    processedOrders: 0,
    deliveredOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0
  });
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [adminDisplayName, setAdminDisplayName] = useState<string>("");
  const { getPreloadedData } = useNavigationProgress();

  // Load and calculate real order statistics
  useEffect(() => {
    try {
      // First check for preloaded dashboard orders
      const preloadedOrders = getPreloadedData('admin-dashboard-orders');
      if (preloadedOrders && preloadedOrders.length > 0) {
        console.log('Using preloaded dashboard orders');
        
        // Ensure orders have the proper structure
        const safeOrders = preloadedOrders.map((order: any) => ({
          ...order,
          items: order.items || [],
          userName: order.userName || order.user_name || 'Unknown User',
          date: order.date || order.created_at || new Date().toISOString()
        }));
        
        setOrders(safeOrders);
        
        // Calculate statistics from preloaded data
        const totalOrders = safeOrders.length;
        const paidOrders = safeOrders.filter((order: Order) => order.status === 'paid').length;
        const processedOrders = safeOrders.filter((order: Order) => order.status === 'processed').length;
        const deliveredOrders = safeOrders.filter((order: Order) => order.status === 'delivered').length;
        const totalRevenue = safeOrders.reduce((sum: number, order: Order) => sum + (order.total || 0), 0);
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        
        setStats({
          totalOrders,
          paidOrders,
          processedOrders,
          deliveredOrders,
          totalRevenue,
          averageOrderValue
        });
        return;
      }
      
      // Fallback to localStorage if no preloaded data
      console.log('Using localStorage orders as fallback');
      const allOrders = JSON.parse(localStorage.getItem('orders') || '[]');
      setOrders(allOrders);
      
      // Calculate real statistics
      const totalOrders = allOrders.length;
      const paidOrders = allOrders.filter((order: Order) => order.status === 'paid').length;
      const processedOrders = allOrders.filter((order: Order) => order.status === 'processed').length;
      const deliveredOrders = allOrders.filter((order: Order) => order.status === 'delivered').length;
      const totalRevenue = allOrders.reduce((sum: number, order: Order) => sum + (order.total || 0), 0);
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
      
      setStats({
        totalOrders,
        paidOrders,
        processedOrders,
        deliveredOrders,
        totalRevenue,
        averageOrderValue
      });
    } catch (error) {
      console.error('Failed to load orders:', error);
    }
  }, []);

  // Load tickets from localStorage
  useEffect(() => {
    const savedTickets = localStorage.getItem('supportTickets');
    if (savedTickets) {
      try {
        const allTickets = JSON.parse(savedTickets);
        setTickets(allTickets);
      } catch (error) {
        console.error('Failed to load support tickets:', error);
      }
    }
  }, []);

  // Load admin display name
  useEffect(() => {
    const loadAdminSettings = async () => {
      try {
        // First check if we have preloaded dashboard settings
        const preloadedSettings = getPreloadedData('admin-dashboard-settings');
        if (preloadedSettings) {
          console.log('Using preloaded dashboard settings');
          setAdminDisplayName(preloadedSettings.displayName);
          return;
        }
        
        // Fallback: check general admin settings
        const generalSettings = getPreloadedData('admin-settings');
        if (generalSettings) {
          console.log('Using preloaded general settings');
          setAdminDisplayName(generalSettings.displayName);
          return;
        }
        
        // If no preloaded data, fetch normally
        console.log('Fetching admin settings from API');
        const settings = await AdminSettingsService.getSettings();
        setAdminDisplayName(settings.displayName);
      } catch (error) {
        console.error('Failed to load admin settings:', error);
        // Keep default value on error
      }
    };
    
    loadAdminSettings();
  }, [getPreloadedData]);

  const newOrders = orders.filter(order => order.status === 'paid').slice(0, 5);

  // Calculate ticket stats
  const newSupportTickets = tickets.filter(ticket => 
    ticket.status === 'open' && 
    new Date(ticket.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
  ).length;
  const inProgressTickets = tickets.filter(ticket => ticket.status === 'in_progress').length;




  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Paid</span>;
      case 'processed':
        return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Processed</span>;
      case 'delivered':
        return <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 rounded-full">Delivered</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-safe-bottom">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 sm:p-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Welcome, {adminDisplayName}!</h1>
            <p className="text-blue-100 text-sm sm:text-base">Manage admin operations and track customer orders</p>
          </div>

        </div>
      </div>

      {/* Order Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-h-[80px] flex items-center touch-manipulation">
          <div className="flex items-center w-full">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Total Orders</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.totalOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-h-[80px] flex items-center touch-manipulation">
          <div className="flex items-center w-full">
            <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Pending Orders</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.paidOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-h-[80px] flex items-center touch-manipulation">
          <div className="flex items-center w-full">
            <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Delivered</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{stats.deliveredOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-h-[80px] flex items-center touch-manipulation">
          <div className="flex items-center w-full">
            <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">New Support Tickets</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{newSupportTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-h-[80px] flex items-center touch-manipulation">
          <div className="flex items-center w-full">
            <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">In-Progress Tickets</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{inProgressTickets}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Quick Actions</h2>
          <p className="text-sm text-gray-600 mt-1">Manage your restaurant operations</p>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Link 
              to="/admin/inventory"
              className="flex flex-col items-center p-4 sm:p-6 border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 group touch-manipulation min-h-[120px] justify-center"
            >
              <div className="p-3 bg-emerald-100 rounded-lg mb-3 group-hover:bg-emerald-200 transition-colors">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="font-medium text-gray-900 text-center text-sm sm:text-base">Manage Menu</span>
              <span className="text-xs sm:text-sm text-gray-500 text-center mt-1">Update inventory</span>
            </Link>
            
            <Link 
              to="/admin/orders"
              className="flex flex-col items-center p-4 sm:p-6 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group touch-manipulation min-h-[120px] justify-center"
            >
              <div className="p-3 bg-blue-100 rounded-lg mb-3 group-hover:bg-blue-200 transition-colors">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900 text-center text-sm sm:text-base">View Orders</span>
              <span className="text-xs sm:text-sm text-gray-500 text-center mt-1">Process orders</span>
            </Link>
            
            <Link 
              to="/admin/users"
              className="flex flex-col items-center p-4 sm:p-6 border border-gray-300 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 group touch-manipulation min-h-[120px] justify-center"
            >
              <div className="p-3 bg-purple-100 rounded-lg mb-3 group-hover:bg-purple-200 transition-colors">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <span className="font-medium text-gray-900 text-center text-sm sm:text-base">Manage Users</span>
              <span className="text-xs sm:text-sm text-gray-500 text-center mt-1">Customer accounts</span>
            </Link>
            
            <Link 
              to="/admin/analytics"
              className="flex flex-col items-center p-4 sm:p-6 border border-gray-300 rounded-lg hover:bg-orange-50 hover:border-orange-300 transition-all duration-200 group touch-manipulation min-h-[120px] justify-center"
            >
              <div className="p-3 bg-orange-100 rounded-lg mb-3 group-hover:bg-orange-200 transition-colors">
                <BarChart3 className="w-6 h-6 text-orange-600" />
              </div>
              <span className="font-medium text-gray-900 text-center text-sm sm:text-base">Analytics</span>
              <span className="text-xs sm:text-sm text-gray-500 text-center mt-1">View reports</span>
            </Link>
          </div>
        </div>
      </div>



      {/* New Orders */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">New Orders</h2>
          <p className="text-sm text-gray-600 mt-1">Orders waiting for processing</p>
        </div>
        <div className="p-4 sm:p-6">
          {newOrders.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {newOrders.map((order) => (
                <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-yellow-50 border border-yellow-200 rounded-lg space-y-3 sm:space-y-0">
                  <div className="flex items-center space-x-3 sm:space-x-4">
                    <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">Order #{order.id.slice(-5)}</p>
                      <p className="text-sm text-gray-600 truncate">{order.userName}</p>
                      <p className="text-xs text-gray-500">{formatDate(order.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end space-x-3">
                    <div className="text-left sm:text-right">
                      <p className="font-medium text-gray-900 text-sm sm:text-base">${(order.total || 0).toFixed(2)}</p>
                      <p className="text-sm text-gray-600">{order.items?.length || 0} items</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getStatusBadge(order.status)}
                      <Link 
                        to="/admin/orders"
                        className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors touch-manipulation mobile-touch-target flex items-center justify-center"
                      >
                        <span className="hidden sm:inline">Process</span>
                        <span className="sm:hidden">Go</span>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No new orders</p>
              <p className="text-sm text-gray-400">All orders have been processed</p>
            </div>
          )}
        </div>
      </div>

      {/* Additional Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Order Status Breakdown</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700">Paid</span>
                </div>
                <span className="font-medium">{stats.paidOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-gray-700">Processed</span>
                </div>
                <span className="font-medium">{stats.processedOrders}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="text-gray-700">Delivered</span>
                </div>
                <span className="font-medium">{stats.deliveredOrders}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Revenue Overview</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Total Revenue</span>
                <span className="font-medium text-lg">${stats.totalRevenue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Average Order Value</span>
                <span className="font-medium text-lg">${stats.averageOrderValue.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700">Total Orders</span>
                <span className="font-medium text-lg">{stats.totalOrders}</span>
              </div>
              {stats.totalOrders > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Link 
                    to="/admin/analytics"
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium"
                  >
                    View detailed analytics →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
