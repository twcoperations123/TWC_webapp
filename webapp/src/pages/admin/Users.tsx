import { useState, useMemo, useEffect, type FormEvent } from 'react';
import { useUsers, type User } from '../../contexts/UsersContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigationProgress } from '../../contexts/NavigationProgressContext';
import ProgressLink from '../../components/ProgressLink';

/* helper so undefined fields don't crash .toLowerCase() */
const safe = (v: unknown) => (v ?? '').toString().toLowerCase();

export default function AdminUsers() {
  const { users, createUser, deleteUser } = useUsers();
  const { user: currentUser } = useAuth();
  const { getPreloadedData } = useNavigationProgress();
  const [query, setQuery] = useState('');
  const [searchField, setSearchField] = useState<'all' | keyof User>('all');
  const [showForm, setShowForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [alertModal, setAlertModal] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });
  const [draft, setDraft] = useState<Omit<User, 'id'> & { confirmPassword: string }>({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    address: '',
    phoneNumber: '',
    role: 'user', // Always default to 'user'
  });

  // Use preloaded users data if available
  useEffect(() => {
    const preloadedUsers = getPreloadedData('admin-users-list');
    if (preloadedUsers && preloadedUsers.length > 0) {
      console.log('Preloaded users data available:', preloadedUsers.length, 'users');
      // The UsersContext should handle the actual state, this is just for visibility
    } else {
      console.log('No preloaded users data, using context data');
    }
  }, [getPreloadedData]);

  // Format phone number with dynamic grouping based on length
  const formatPhoneNumber = (value: string) => {
    // Remove existing dashes and non-numeric characters
    const clean = value.replace(/\D/g, '');
    
    if (clean.length === 0) {
      return '';
    } else if (clean.length <= 3) {
      return clean;
    } else if (clean.length <= 6) {
      return `${clean.slice(0, 3)}-${clean.slice(3)}`;
    } else if (clean.length <= 10) {
      // Standard US format: XXX-XXX-XXXX
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
    } else if (clean.length === 11) {
      // 11 digits: X-XXX-XXX-XXXX (country code + US number)
      return `${clean.slice(0, 1)}-${clean.slice(1, 4)}-${clean.slice(4, 7)}-${clean.slice(7)}`;
    } else if (clean.length === 12) {
      // 12 digits: XX-XXX-XXX-XXXX
      return `${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5, 8)}-${clean.slice(8)}`;
    } else if (clean.length === 13) {
      // 13 digits: XXX-XXX-XXX-XXXX
      return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}-${clean.slice(9)}`;
    } else {
      // 14+ digits: continue the pattern, group first digits together
      const firstGroup = clean.slice(0, clean.length - 10);
      const remaining = clean.slice(clean.length - 10);
      return `${firstGroup}-${remaining.slice(0, 3)}-${remaining.slice(3, 6)}-${remaining.slice(6)}`;
    }
  };

  // Get raw phone number (without formatting)
  const getRawPhoneNumber = (formatted: string) => {
    return formatted.replace(/\D/g, '');
  };

  /* filter */
  const filtered = useMemo(() => {
    // First filter out the current user from the list
    const usersToShow = currentUser 
      ? users.filter(u => u.id !== currentUser.id)
      : users;
    
    const q = query.trim().toLowerCase();
    if (!q) return usersToShow;
    
    return usersToShow.filter((u) => {
      if (searchField === 'all') {
        return [
          u.name,
          u.username,
          u.email,
          u.address,
          u.phoneNumber,
          u.role
        ].some((f) => safe(f).includes(q));
      } else {
        return safe(u[searchField]).includes(q);
      }
    });
  }, [users, query, searchField, currentUser]);

  /* helper functions for modals */
  const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
    setAlertModal({ show: true, message, type });
  };

  const hideAlert = () => {
    setAlertModal({ show: false, message: '', type: 'success' });
  };

  /* handlers */
  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!draft.name || !draft.username || !draft.password || !draft.email || !draft.address || !draft.phoneNumber) return;
    
    if (draft.password.length < 6) {
      showAlert('Password must be at least 6 characters long.');
      return;
    }

    if (draft.password !== draft.confirmPassword) {
      showAlert('Passwords do not match. Please try again.');
      return;
    }

    try {
      // Create user with raw phone number (no formatting)
      const userData = {
        ...draft,
        phoneNumber: getRawPhoneNumber(draft.phoneNumber),
        role: 'user' as const // Always assign 'user' role
      };
      // Remove confirmPassword before sending (comments is now included)
      const { confirmPassword, ...userDataToSend } = userData;
      
      await createUser(userDataToSend);
      setDraft({
        name: '',
        username: '',
        password: '',
        confirmPassword: '',
        email: '',
        address: '',
        phoneNumber: '',
        role: 'user',
      });
      setShowForm(false);
      showAlert('User created successfully!', 'success');
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to create user';
      
      // Provide more helpful error messages
      if (errorMessage.includes('already exists')) {
        showAlert(errorMessage); // Use the specific error message
      } else if (errorMessage.includes('User already registered')) {
        showAlert('This email is already registered. Please use a different email address.');
      } else if (errorMessage.includes('duplicate key')) {
        showAlert('This email or username is already taken. Please choose different values.');
      } else {
        showAlert(errorMessage);
      }
    }
  };

  const removeUser = async (id: string) => {
    // Prevent current user from deleting themselves
    if (currentUser && id === currentUser.id) {
      showAlert('You cannot delete your own account.');
      return;
    }
    
    const user = users.find(u => u.id === id);
    if (user) {
      setUserToDelete(user);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      await deleteUser(userToDelete.id);
      showAlert('User deleted successfully!', 'success');
    } catch (err: any) {
      showAlert(err?.message || 'Failed to delete user');
    } finally {
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const searchFields = [
    { value: 'all', label: 'All Fields' },
    { value: 'name', label: 'Name' },
    { value: 'username', label: 'Username' },
    { value: 'email', label: 'Email' },
    { value: 'address', label: 'Address' },
    { value: 'phoneNumber', label: 'Phone Number' },
    { value: 'role', label: 'Role' },
  ];

  /* ui */
  return (
    <div className="p-4 sm:p-6 lg:p-8 pb-safe-bottom">
      <h1 className="mb-4 sm:mb-6 text-2xl sm:text-3xl font-bold">Manage Users</h1>

      {/* search + new-user CTA */}
      <div className="mb-4 flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="flex flex-1 gap-2">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as 'all' | keyof User)}
            className="rounded border p-2 bg-white mobile-input"
          >
            {searchFields.map((field) => (
              <option key={field.value} value={field.value}>
                {field.label}
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${searchField === 'all' ? 'all fields' : searchField}...`}
            className="flex-1 rounded border p-2 mobile-input"
          />
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded bg-emerald-600 px-4 py-2 text-white hover:bg-emerald-700 mobile-button touch-manipulation"
        >
          {showForm ? 'Cancel' : 'New User'}
        </button>
      </div>

      {/* inline create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Left Column - Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Personal Information</h3>
            
            <input
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Restaurant Name"
              className="w-full rounded border p-2"
              required
              type="text"
            />
            
            <input
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder="Address"
              className="w-full rounded border p-2"
              required
              type="text"
            />
            
            {/* Phone Number field with formatting */}
            <input
              value={draft.phoneNumber}
              onChange={(e) => {
                const formatted = formatPhoneNumber(e.target.value);
                setDraft((d) => ({ ...d, phoneNumber: formatted }));
              }}
              placeholder="Phone Number"
              className="w-full rounded border p-2"
              required
              type="tel"
            />
            
            <input
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="Email"
              className="w-full rounded border p-2"
              required
              type="email"
            />
          </div>

          {/* Middle Column - Account Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">Account Information</h3>
            
            <input
              value={draft.username}
              onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))}
              placeholder="Username"
              className="w-full rounded border p-2"
              required
              type="text"
            />

            {/* Password field with show/hide toggle */}
            <div className="relative">
              <input
                value={draft.password}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, password: e.target.value }));
                }}
                placeholder="Password"
                className="w-full rounded border p-2 pr-10"
                required
                type={showPassword ? 'text' : 'password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Password strength indicator */}
            {draft.password && (
              <div className="-mt-2">
                <p className={`text-sm ${
                  draft.password.length < 6 
                    ? 'text-red-600' 
                    : draft.password.length < 8 
                      ? 'text-yellow-600' 
                      : 'text-green-600'
                }`}>
                  Password length: {draft.password.length} characters
                  {draft.password.length < 6 && ' (minimum 6 required)'}
                  {draft.password.length >= 6 && draft.password.length < 8 && ' (good)'}
                  {draft.password.length >= 8 && ' (strong)'}
                </p>
              </div>
            )}

            {/* Confirm Password field with show/hide toggle */}
            <div className="relative">
              <input
                value={draft.confirmPassword}
                onChange={(e) => {
                  setDraft((d) => ({ ...d, confirmPassword: e.target.value }));
                }}
                placeholder="Confirm Password"
                className={`w-full rounded border p-2 pr-10 ${
                  draft.confirmPassword && draft.password !== draft.confirmPassword
                    ? 'border-red-400 bg-red-50'
                    : draft.confirmPassword && draft.password === draft.confirmPassword
                    ? 'border-green-400 bg-green-50'
                    : ''
                }`}
                required
                type={showConfirmPassword ? 'text' : 'password'}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {/* Password match indicator */}
            {draft.confirmPassword && (
              <div className="-mt-2">
                {draft.password === draft.confirmPassword ? (
                  <p className="text-sm text-green-600">✓ Passwords match</p>
                ) : (
                  <p className="text-sm text-red-600">✗ Passwords do not match</p>
                )}
              </div>
            )}
          </div>

          {/* Submit Button - Full Width */}
          <div className="md:col-span-2">
            <button
              type="submit"
              className="w-full rounded bg-blue-600 py-3 text-white font-semibold hover:bg-blue-700 transition-colors"
            >
              Add User
            </button>
          </div>
        </form>
      )}

      {/* Desktop table view */}
      <div className="hidden lg:block mobile-table-container">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-200 text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Username</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Phone</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2">{u.username}</td>
                <td className="px-3 py-2">{u.email}</td>
                <td className="px-3 py-2">{u.phoneNumber}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex space-x-2">
                    <ProgressLink
                      to={`/admin/users/${u.id}`}
                      className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 text-sm font-medium px-2 py-1 rounded transition-colors"
                    >
                      View
                    </ProgressLink>
                    <button
                      onClick={() => removeUser(u.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-sm font-medium px-2 py-1 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  No users match "{query}".
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="lg:hidden space-y-3">
        {filtered.map((u) => (
          <div key={u.id} className="mobile-table-card">
            <div className="mobile-table-card-header flex items-center justify-between">
              <span className="font-semibold text-gray-900 truncate">{u.name}</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}>
                {u.role}
              </span>
            </div>
            
            <div className="space-y-2">
              <div className="mobile-table-card-row">
                <span className="mobile-table-card-label">Username:</span>
                <span className="mobile-table-card-value">{u.username}</span>
              </div>
              <div className="mobile-table-card-row">
                <span className="mobile-table-card-label">Email:</span>
                <span className="mobile-table-card-value truncate">{u.email}</span>
              </div>
              <div className="mobile-table-card-row">
                <span className="mobile-table-card-label">Phone:</span>
                <span className="mobile-table-card-value">{u.phoneNumber}</span>
              </div>
              <div className="flex space-x-3 pt-2 border-t border-gray-200">
                <ProgressLink
                  to={`/admin/users/${u.id}`}
                  className="flex-1 text-center bg-emerald-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors touch-manipulation mobile-touch-target"
                >
                  View Details
                </ProgressLink>
                <button
                  onClick={() => removeUser(u.id)}
                  className="flex-1 text-center bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors touch-manipulation mobile-touch-target"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="mb-4">
              <svg className="w-12 h-12 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p>No users match "{query}".</p>
          </div>
        )}
      </div>

      {/* Alert Modal */}
      {alertModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-3 ${
                alertModal.type === 'success' ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {alertModal.type === 'success' ? (
                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <h3 className={`text-lg font-medium ${
                alertModal.type === 'success' ? 'text-green-800' : 'text-red-800'
              }`}>
                {alertModal.type === 'success' ? 'Success' : 'Error'}
              </h3>
            </div>
            <p className="text-gray-700 mb-6">{alertModal.message}</p>
            <div className="flex justify-end">
              <button
                onClick={hideAlert}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  alertModal.type === 'success'
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-800">Confirm Delete</h3>
            </div>
            <p className="text-gray-700 mb-2">
              Are you sure you want to delete the user:
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="font-medium text-gray-900">{userToDelete.name}</p>
              <p className="text-sm text-gray-600">{userToDelete.email}</p>
            </div>
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setUserToDelete(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





