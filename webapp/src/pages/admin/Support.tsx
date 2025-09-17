import { useState, useEffect } from "react";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  MessageSquare, 
  User, 
  Mail, 
  Filter,
  Search,
  Eye,
  Reply
} from "lucide-react";

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

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: SupportTicket | null;
  onUpdateStatus: (ticketId: string, status: SupportTicket['status']) => void;
  onAddResponse: (ticketId: string, response: string) => void;
}

function TicketModal({ isOpen, onClose, ticket, onUpdateStatus, onAddResponse }: TicketModalProps) {
  const [response, setResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !response.trim()) return;

    setIsSubmitting(true);
    try {
      await onAddResponse(ticket.id, response.trim());
      setResponse('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (newStatus: SupportTicket['status']) => {
    if (ticket) {
      onUpdateStatus(ticket.id, newStatus);
    }
  };

  if (!isOpen || !ticket) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Support Ticket #{ticket.id.slice(-8)}</h2>
            <p className="text-sm text-gray-600 mt-1">From: {ticket.userName} ({ticket.userEmail})</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <AlertCircle className="w-5 h-5" />
          </button>
        </div>

        {/* Ticket Details */}
        <div className="p-6 space-y-6">
          {/* Ticket Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Subject</h3>
              <p className="text-gray-700">{ticket.subject}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Category</h3>
              <p className="text-gray-700 capitalize">{ticket.category}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Priority</h3>
              <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                ticket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                ticket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                ticket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {ticket.priority}
              </span>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Description</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
            </div>
          </div>

          {/* Status Management */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Status</h3>
            <div className="flex space-x-2">
              {(['open', 'in_progress', 'resolved', 'closed'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    ticket.status === status
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Admin Response */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Admin Response</h3>
            {ticket.adminResponse ? (
              <div className="bg-emerald-50 p-4 rounded-lg mb-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-900">Response</span>
                </div>
                <p className="text-emerald-800 whitespace-pre-wrap">{ticket.adminResponse}</p>
                {ticket.adminResponseDate && (
                  <p className="text-xs text-emerald-600 mt-2">
                    Replied: {new Date(ticket.adminResponseDate).toLocaleString()}
                  </p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmitResponse} className="space-y-4">
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={4}
                  placeholder="Type your response to the user..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                  disabled={isSubmitting}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !response.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Reply className="w-4 h-4" />
                        <span>Send Response</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupport() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load tickets from localStorage
  useEffect(() => {
    const savedTickets = localStorage.getItem('supportTickets');
    if (savedTickets) {
      const allTickets = JSON.parse(savedTickets);
      setTickets(allTickets.sort((a: SupportTicket, b: SupportTicket) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    }
    setIsLoading(false);
  }, []);

  // Filter and search tickets
  useEffect(() => {
    let filtered = tickets;

    // Filter by status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(ticket => ticket.status === filterStatus);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(ticket => 
        ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ticket.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTickets(filtered);
  }, [tickets, filterStatus, searchTerm]);

  const handleUpdateStatus = (ticketId: string, newStatus: SupportTicket['status']) => {
    const updatedTickets = tickets.map(ticket => 
      ticket.id === ticketId ? { ...ticket, status: newStatus } : ticket
    );
    setTickets(updatedTickets);
    localStorage.setItem('supportTickets', JSON.stringify(updatedTickets));
    
    // Update selected ticket
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, status: newStatus });
    }
  };

  const handleAddResponse = async (ticketId: string, response: string) => {
    const updatedTickets = tickets.map(ticket => 
      ticket.id === ticketId ? { 
        ...ticket, 
        adminResponse: response,
        adminResponseDate: new Date().toISOString(),
        status: 'resolved' as const
      } : ticket
    );
    setTickets(updatedTickets);
    localStorage.setItem('supportTickets', JSON.stringify(updatedTickets));
    
    // Update selected ticket
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ 
        ...selectedTicket, 
        adminResponse: response,
        adminResponseDate: new Date().toISOString(),
        status: 'resolved'
      });
    }
  };

  const openTicketModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  const closeTicketModal = () => {
    setSelectedTicket(null);
    setIsModalOpen(false);
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

  // Helper function to check if a ticket is urgent (open for 3+ days)
  const isTicketUrgent = (ticket: SupportTicket) => {
    if (ticket.status !== 'open') return false;
    const createdDate = new Date(ticket.createdAt);
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    return createdDate < threeDaysAgo;
  };

  const stats = {
    total: tickets.length,
    newTickets: tickets.filter(t => t.status === 'open').length, // Open tickets (not yet worked on)
    urgentTickets: tickets.filter(t => isTicketUrgent(t)).length, // Open tickets older than 3 days
    inProgress: tickets.filter(t => t.status === 'in_progress').length // Tickets being actively worked on
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Support Tickets</h1>
        <p className="text-gray-600">Manage customer support requests and provide assistance</p>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tickets</p>
              <p className="text-xs text-gray-500 mb-1">New / Urgent / In-Progress</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <MessageSquare className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">New Tickets</p>
              <p className="text-xs text-gray-500 mb-1">Just received</p>
              <p className="text-2xl font-bold text-gray-900">{stats.newTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Urgent Tickets</p>
              <p className="text-xs text-gray-500 mb-1">Open for 3+ days</p>
              <p className="text-2xl font-bold text-gray-900">{stats.urgentTickets}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In-Progress</p>
              <p className="text-xs text-gray-500 mb-1">Being worked on</p>
              <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 w-full md:w-64"
            />
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Support Tickets ({filteredTickets.length})
          </h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500">Loading tickets...</p>
            </div>
          ) : filteredTickets.length > 0 ? (
            filteredTickets.map((ticket) => (
              <div key={ticket.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">{ticket.subject}</h3>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span className="flex items-center space-x-1">
                        <User className="w-4 h-4" />
                        <span>{ticket.userName}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Mail className="w-4 h-4" />
                        <span>{ticket.userEmail}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatDate(ticket.createdAt)}</span>
                      </span>
                    </div>
                    
                    <p className="text-gray-600 line-clamp-2">{ticket.description}</p>
                    
                    {ticket.adminResponse && (
                      <div className="mt-3 flex items-center space-x-2 text-sm text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        <span>Admin responded</span>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => openTicketModal(ticket)}
                    className="ml-4 px-3 py-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                  >
                    <Eye className="w-4 h-4" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">No support tickets found</p>
              <p className="text-sm text-gray-400">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search or filter criteria'
                  : 'Support tickets from users will appear here'
                }
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Ticket Modal */}
      <TicketModal
        isOpen={isModalOpen}
        onClose={closeTicketModal}
        ticket={selectedTicket}
        onUpdateStatus={handleUpdateStatus}
        onAddResponse={handleAddResponse}
      />
    </div>
  );
}
