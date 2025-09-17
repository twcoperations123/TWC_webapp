import { useParams } from "react-router-dom";
import { useUsers } from "../../contexts/UsersContext";
import { useAuth } from "../../contexts/AuthContext";
import ProgressLink from "../../components/ProgressLink";
import { useState, useEffect } from "react";
import { ShoppingCart, Package, HelpCircle, Settings, Clock, CheckCircle, FileText, MessageSquare, Truck } from "lucide-react";
import { orderService, type Order } from "../../services/orderService";

interface Activity {
  id: string;
  type: 'order_placed' | 'order_delivered' | 'support_resolved';
  message: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
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

export default function UserDashboard() {
  const { id } = useParams<{ id: string }>();
  const { users } = useUsers();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  // Use the authenticated user if available, otherwise fall back to URL param lookup
  const currentUser = authUser || users.find((u) => u.id === id);

  // Load orders from Supabase
  useEffect(() => {
    const loadUserOrders = async () => {
      const userId = currentUser?.id || id;
      if (userId) {
        try {
          const userOrders = await orderService.getUserOrders(userId);
          setOrders(userOrders);
          
          // Generate recent activities from orders
          const activities: Activity[] = [];
          userOrders.slice(0, 5).forEach((order: Order) => {
            if (order.id) {
              activities.push({
                id: order.id,
                type: 'order_placed',
                message: `Order #${order.orderNumber || order.id.slice(-5)} placed for $${order.total.toFixed(2)}`,
                timestamp: order.createdAt || new Date().toISOString(),
                icon: <Package className="w-4 h-4" />,
                color: 'bg-blue-500'
              });
              
              if (order.status === 'delivered') {
                activities.push({
                  id: `${order.id}-delivered`,
                  type: 'order_delivered',
                  message: `Order #${order.orderNumber || order.id.slice(-5)} delivered successfully`,
                  timestamp: order.deliveryDate,
                  icon: <CheckCircle className="w-4 h-4" />,
                  color: 'bg-emerald-500'
                });
              }
            }
          });
          
          setRecentActivities(activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (error) {
          console.error('Error loading orders:', error);
        }
      }
    };

    loadUserOrders();
  }, [currentUser?.id, id]);

  // Load tickets from localStorage
  useEffect(() => {
    const savedTickets = localStorage.getItem('supportTickets');
    if (savedTickets) {
      const allTickets = JSON.parse(savedTickets);
      const userId = currentUser?.id || id;
      const userTickets = allTickets.filter((ticket: SupportTicket) => ticket.userId === userId);
      setTickets(userTickets);
    }
  }, [currentUser?.id, id]);

  // Show loading only if we're still checking auth AND no user is available from any source
  if (authLoading && !currentUser) {
    return (
      <div className="p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading user data...</p>
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

  // Calculate order stats
  const activeOrders = orders.filter(order => order.status === 'paid' || order.status === 'confirmed').length;
  const processingOrders = orders.filter(order => order.status === 'processing' || order.status === 'out_for_delivery').length;
  const deliveredOrders = orders.filter(order => order.status === 'delivered').length;
  
  // Calculate ticket stats
  const activeTickets = tickets.filter(ticket => ticket.status === 'open' || ticket.status === 'in_progress').length;
  const newTicketResponses = tickets.filter(ticket => 
    ticket.adminResponse && 
    ticket.adminResponseDate && 
    new Date(ticket.adminResponseDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
  ).length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 pb-safe-bottom">
      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-lg p-4 sm:p-6 text-white">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2">Welcome back, {currentUser.name}!</h1>
        <p className="text-emerald-100 text-sm sm:text-base">Here's what's happening with your orders today</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-h-[80px] flex items-center touch-manipulation">
          <div className="flex items-center w-full">
            <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Active Orders</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{activeOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-h-[80px] flex items-center touch-manipulation">
          <div className="flex items-center w-full">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Processing Orders</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{processingOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-lg shadow-md border border-gray-200 min-h-[80px] flex items-center touch-manipulation">
          <div className="flex items-center w-full">
            <div className="p-2 bg-emerald-100 rounded-lg flex-shrink-0">
              <Truck className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="ml-3 min-w-0 flex-1">
              <p className="text-xs font-medium text-gray-600 truncate">Delivered Orders</p>
              <p className="text-lg sm:text-xl font-bold text-gray-900">{deliveredOrders}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-5 h-5 text-purple-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">Active Tickets</p>
              <p className="text-xl font-bold text-gray-900">{activeTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <MessageSquare className="w-5 h-5 text-orange-600" />
            </div>
            <div className="ml-3">
              <p className="text-xs font-medium text-gray-600">New Responses</p>
              <p className="text-xl font-bold text-gray-900">{newTicketResponses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ProgressLink 
              to={`/user/${id}/inventory`}
              className="flex flex-col items-center p-6 border border-gray-300 rounded-lg hover:bg-emerald-50 hover:border-emerald-300 transition-all duration-200 group"
            >
              <div className="p-3 bg-emerald-100 rounded-lg mb-3 group-hover:bg-emerald-200 transition-colors">
                <ShoppingCart className="w-6 h-6 text-emerald-600" />
              </div>
              <span className="font-medium text-gray-900 text-center">Browse Menu</span>
              <span className="text-sm text-gray-500 text-center mt-1">Order delicious drinks</span>
            </ProgressLink>
            
            <ProgressLink 
              to={`/user/${id}/orders`}
              className="flex flex-col items-center p-6 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 group"
            >
              <div className="p-3 bg-blue-100 rounded-lg mb-3 group-hover:bg-blue-200 transition-colors">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <span className="font-medium text-gray-900 text-center">My Orders</span>
              <span className="text-sm text-gray-500 text-center mt-1">Track your orders</span>
            </ProgressLink>
            
            <ProgressLink 
              to={`/user/${id}/support`}
              className="flex flex-col items-center p-6 border border-gray-300 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 group"
            >
              <div className="p-3 bg-purple-100 rounded-lg mb-3 group-hover:bg-purple-200 transition-colors">
                <HelpCircle className="w-6 h-6 text-purple-600" />
              </div>
              <span className="font-medium text-gray-900 text-center">Get Support</span>
              <span className="text-sm text-gray-500 text-center mt-1">Need help?</span>
            </ProgressLink>
            
            <ProgressLink 
              to={`/user/${id}/settings`}
              className="flex flex-col items-center p-6 border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 group"
            >
              <div className="p-3 bg-gray-100 rounded-lg mb-3 group-hover:bg-gray-200 transition-colors">
                <Settings className="w-6 h-6 text-gray-600" />
              </div>
              <span className="font-medium text-gray-900 text-center">Settings</span>
              <span className="text-sm text-gray-500 text-center mt-1">Manage account</span>
            </ProgressLink>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Activities</h2>
          <p className="text-sm text-gray-600 mt-1">Your latest order updates</p>
        </div>
        <div className="p-6">
          {recentActivities.length > 0 ? (
            <div className="space-y-4">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`p-2 rounded-full ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                    <p className="text-xs text-gray-500">{formatDate(activity.timestamp)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No recent activities</p>
              <p className="text-sm text-gray-400">Your order activities will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}