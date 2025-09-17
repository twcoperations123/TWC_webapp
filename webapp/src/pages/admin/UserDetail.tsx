import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useUsers, type User } from '../../contexts/UsersContext';

export default function UserDetail() {
  const { id } = useParams<{ id: string }>();
  const { users, updateUser, deleteUser } = useUsers();
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showResetPasswordConfirm, setShowResetPasswordConfirm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [alertModal, setAlertModal] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    if (id) {
      const foundUser = users.find(u => u.id === id);
      if (foundUser) {
        setUser(foundUser);
        setEditForm(foundUser);
      }
    }
  }, [id, users]);

  const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
    setAlertModal({ show: true, message, type });
  };

  const hideAlert = () => {
    setAlertModal({ show: false, message: '', type: 'success' });
  };

  const handleSave = async () => {
    if (user && editForm) {
      try {
        // Only send updatable fields to avoid 400 errors
        const updateData = {
          name: editForm.name,
          address: editForm.address,
          username: editForm.username,
          email: editForm.email,
          phoneNumber: editForm.phoneNumber,
          role: editForm.role,
          comments: editForm.comments
        };
        
        // Remove undefined fields
        const filteredUpdateData = Object.fromEntries(
          Object.entries(updateData).filter(([_, value]) => value !== undefined)
        );
        
        await updateUser(user.id, filteredUpdateData);
        setUser({ ...user, ...editForm });
        setIsEditing(false);
        showAlert('User updated successfully!', 'success');
      } catch (error) {
        console.error('Error updating user:', error);
        showAlert('Failed to update user. Please try again.');
      }
    }
  };

  const handleCancel = () => {
    if (user) {
      setEditForm(user);
      setIsEditing(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    
    try {
      await deleteUser(user.id);
      showAlert('User deleted successfully!', 'success');
      // Navigate back to users list after successful deletion
      setTimeout(() => {
        navigate('/admin/users');
      }, 1500);
    } catch (error) {
      console.error('Error deleting user:', error);
      showAlert('Failed to delete user. Please try again.');
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user || !newPassword.trim()) {
      showAlert('Please enter a new password.');
      return;
    }

    if (newPassword.length < 6) {
      showAlert('Password must be at least 6 characters long.');
      return;
    }

    try {
      // Update user with new password
      await updateUser(user.id, { password: newPassword });
      showAlert('Password reset successfully!', 'success');
      setNewPassword('');
      setShowResetPasswordModal(false);
      setShowResetPasswordConfirm(false);
    } catch (error) {
      console.error('Error resetting password:', error);
      showAlert('Failed to reset password. Please try again.');
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-600 mb-4">User Not Found</h1>
          <Link to="/admin/users" className="text-emerald-600 hover:underline">
            ← Back to Users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Profile</h1>
          <p className="text-gray-600">Manage user information and settings</p>
        </div>
        <Link
          to="/admin/users"
          className="text-emerald-600 hover:underline"
        >
          ← Back to Users
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold text-emerald-600">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user.name}</h2>
              <p className="text-gray-600">@{user.username}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Restaurant Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <p className="text-gray-900">{user.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <p className="text-gray-900">@{user.username}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editForm.email || ''}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <p className="text-gray-900">{user.email}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={editForm.phoneNumber || ''}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <p className="text-gray-900">{user.phoneNumber}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Address
              </label>
              {isEditing ? (
                <textarea
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  rows={3}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <p className="text-gray-900">{user.address}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              {isEditing ? (
                <select
                  value={editForm.role || 'user'}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                </select>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                  {user.role || 'user'}
                </span>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments & Notes
              </label>
              {isEditing ? (
                <textarea
                  value={editForm.comments || ''}
                  onChange={(e) => setEditForm({ ...editForm, comments: e.target.value })}
                  rows={4}
                  placeholder="Add notes about this restaurant user..."
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              ) : (
                <p className="text-gray-900 bg-gray-50 p-3 rounded min-h-[100px]">
                  {user.comments || 'No comments added'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID
              </label>
              <p className="text-gray-500 text-sm font-mono">{user.id}</p>
            </div>

            {isEditing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={editForm.password || ''}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter new password (leave blank to keep current)"
                />
              </div>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Account Actions</h3>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
              <button 
                onClick={() => setShowResetPasswordModal(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
              >
                Reset Password
              </button>
            </div>
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
      {showDeleteModal && (
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
              Are you sure you want to delete this user?
            </p>
            <div className="bg-gray-50 rounded-lg p-3 mb-6">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
            <p className="text-sm text-red-600 mb-6">
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete User
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l4.707-4.707A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-yellow-800">Reset Password</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Enter a new password for <strong>{user?.name}</strong>:
            </p>
            <div className="mb-6">
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                minLength={6}
              />
              <p className="text-sm text-gray-500 mt-2">
                Password must be at least 6 characters long.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowResetPasswordModal(false);
                  setShowResetPasswordConfirm(false);
                  setNewPassword('');
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowResetPasswordConfirm(true)}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                disabled={!newPassword.trim() || newPassword.length < 6}
              >
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Confirmation Modal */}
      {showResetPasswordConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-800">Confirm Password Reset</h3>
            </div>
            <div className="mb-6">
              <p className="text-gray-700 mb-3">
                Are you sure you want to reset the password for <strong>{user?.name}</strong>?
              </p>
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-orange-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-800">Security Warning</p>
                    <p className="text-sm text-orange-700 mt-1">
                      This will immediately change the user's password. The user will need to use the new password to log in.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowResetPasswordConfirm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleResetPassword();
                  setShowResetPasswordConfirm(false);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}