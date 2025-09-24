import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useUsers } from "../../contexts/UsersContext";
import { useAuth } from "../../contexts/AuthContext";
import { HelpCircle, FileText, Clock, CheckCircle, MessageSquare, Phone } from "lucide-react";
import SupportTicketModal from "../../components/SupportTicketModal";
// import { useNavigationProgress } from '../../contexts/NavigationProgressContext';

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

export default function UserSupport() {
  const { id } = useParams<{ id: string }>();
  const { users } = useUsers();
  const { user: authUser, isLoading: authLoading } = useAuth();
  // const { startNavigation } = useNavigationProgress(); // Unused for now
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminPhone, setAdminPhone] = useState<string>("");
  const [expandedTickets, setExpandedTickets] = useState<Set<string>>(new Set());

  const currentUser = authUser || users.find((u) => u.id === id);

  // Load admin phone number from settings
  useEffect(() => {
    const loadAdminPhone = () => {
      try {
        const savedSettings = localStorage.getItem('adminSettings');
        if (savedSettings) {
          const parsedSettings = JSON.parse(savedSettings);
          if (parsedSettings.phoneNumber) {
            setAdminPhone(parsedSettings.phoneNumber);
          }
        }
      } catch (error) {
        console.error('Failed to load admin phone from settings:', error);
      }
    };

    loadAdminPhone();

    // Listen for admin settings updates
    const handleAdminSettingsUpdate = (e: any) => {
      if (e.detail && e.detail.phoneNumber) {
        setAdminPhone(e.detail.phoneNumber);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'adminSettings') {
        loadAdminPhone();
      }
    };

    window.addEventListener('adminSettingsUpdated', handleAdminSettingsUpdate);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('adminSettingsUpdated', handleAdminSettingsUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Load tickets from localStorage
  useEffect(() => {
    const savedTickets = localStorage.getItem('supportTickets');
    if (savedTickets) {
      const allTickets = JSON.parse(savedTickets);
      const userId = currentUser?.id || id;
      const userTickets = allTickets.filter((ticket: SupportTicket) => ticket.userId === userId);
      setTickets(userTickets.sort((a: SupportTicket, b: SupportTicket) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
    setIsLoading(false);
  }, [currentUser?.id, id]);

  const handleCreateTicket = async (ticketData: Omit<SupportTicket, 'id' | 'status' | 'createdAt'>) => {
    const newTicket: SupportTicket = {
      ...ticketData,
      id: `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'open',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const existingTickets = JSON.parse(localStorage.getItem('supportTickets') || '[]');
    existingTickets.push(newTicket);
    localStorage.setItem('supportTickets', JSON.stringify(existingTickets));

    // Update local state
    setTickets(prev => [newTicket, ...prev]);
  };

  const toggleTicketDetails = (ticketId: string) => {
    setExpandedTickets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ticketId)) {
        newSet.delete(ticketId);
      } else {
        newSet.add(ticketId);
      }
      return newSet;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Open</span>;
      case 'in_progress':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">In Progress</span>;
      case 'resolved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Resolved</span>;
      case 'closed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">Closed</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Urgent</span>;
      case 'high':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">High</span>;
      case 'medium':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Medium</span>;
      case 'low':
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Low</span>;
      default:
        return <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">{priority}</span>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Support Center</h1>
        <p className="text-gray-600">Get help with your orders and account issues</p>
      </div>

      {/* Quick Help */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HelpCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">FAQ</h3>
          </div>
          <p className="text-gray-600 mb-4">Find answers to common questions about ordering, shipping, and returns.</p>
          <button className="text-blue-600 hover:text-blue-700 font-medium">
            Browse FAQ →
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">Contact Admin</h3>
          </div>
          <p className="text-gray-600 mb-4">Get in touch with our admin team for immediate assistance.</p>
          {adminPhone ? (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-green-600" />
                <span className="text-green-600 font-medium">{adminPhone}</span>
              </div>
              <a 
                href={`tel:${adminPhone}`}
                className="inline-block text-green-600 hover:text-green-700 font-medium"
              >
                Call Now →
              </a>
            </div>
          ) : (
            <p className="text-gray-400 text-sm italic">No contact number available</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="ml-3 text-lg font-medium text-gray-900">New Ticket</h3>
          </div>
          <p className="text-gray-600 mb-4">Create a new support ticket for specific issues or questions.</p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Create Ticket →
          </button>
        </div>
      </div>

      {/* My Support Tickets */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">My Support Tickets</h2>
              <p className="text-sm text-gray-600 mt-1">Track your support requests and responses</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>New Ticket</span>
            </button>
          </div>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500">Loading tickets...</p>
            </div>
          ) : tickets.length > 0 ? (
            tickets.map((ticket) => {
              const isExpanded = expandedTickets.has(ticket.id);
              return (
              <div key={ticket.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{ticket.subject}</h3>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="text-sm text-gray-600">Ticket #{ticket.id.slice(-8)} - {ticket.category}</p>
                  </div>
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-2">{ticket.description}</p>
                
                <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                  <div className="flex items-center space-x-4">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Created: {formatDate(ticket.createdAt)}</span>
                    </span>
                    {ticket.adminResponseDate && (
                      <span className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>Replied: {formatDate(ticket.adminResponseDate)}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4 border border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Full Details</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-700">Ticket ID:</span>
                        <span className="text-sm text-gray-600 ml-2">{ticket.id}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Category:</span>
                        <span className="text-sm text-gray-600 ml-2">{ticket.category}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Priority:</span>
                        <span className="ml-2">{getPriorityBadge(ticket.priority)}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Status:</span>
                        <span className="ml-2">{getStatusBadge(ticket.status)}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Description:</span>
                        <div className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{ticket.description}</div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Created:</span>
                        <span className="text-sm text-gray-600 ml-2">{formatDate(ticket.createdAt)}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-700">Contact:</span>
                        <span className="text-sm text-gray-600 ml-2">{ticket.userEmail}</span>
                      </div>
                    </div>
                  </div>
                )}

                {ticket.adminResponse && (
                  <div className="bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm font-medium text-gray-900">Admin Response</span>
                    </div>
                    <p className="text-gray-700 text-sm">{ticket.adminResponse}</p>
                  </div>
                )}

                <div className="flex space-x-2">
                  <button 
                    onClick={() => toggleTicketDetails(ticket.id)}
                    className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center space-x-1"
                  >
                    <span>{isExpanded ? 'Hide Details' : 'View Details'}</span>
                    <svg 
                      className={`w-4 h-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {ticket.status === 'open' && (
                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                      Reply
                    </button>
                  )}
                </div>
              </div>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No support tickets yet</p>
              <p className="text-sm text-gray-400 mb-4">Create your first support ticket to get help</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
              >
                Create Your First Ticket
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Support Ticket Modal */}
      <SupportTicketModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateTicket}
        user={currentUser}
      />
    </div>
  );
}