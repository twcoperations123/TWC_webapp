import { useState, useEffect, type FormEvent} from 'react';
import { useLocation } from 'react-router-dom';
import ProgressLink from '../components/ProgressLink';
import { useAuth } from '../contexts/AuthContext';
import { useProgressNavigate } from '../hooks/useProgressNavigate';
import { supabase } from '../lib/supabase';
import Logo from "../assets/TWC_Logo_Horiztonal_White.png";

/* ─── Component ─────────────────────────────────────── */
export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState('');

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const [resetError, setResetError] = useState('');

  const navigate = useProgressNavigate();
  const location = useLocation();
  const { login } = useAuth();

  useEffect(() => {
    // Check if we were redirected from password reset with a success message
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message from location state
      window.history.replaceState({}, document.title);
    }

    // Check if user came from settings to reset password
    const forgotPasswordEmail = sessionStorage.getItem('forgot-password-email');
    if (forgotPasswordEmail) {
      setForgotEmail(forgotPasswordEmail);
      setShowForgotPassword(true);
      // Clear the stored email
      sessionStorage.removeItem('forgot-password-email');
    }
  }, [location]);

  /* 2. Forgot password handler */
  const handleForgotPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError('');
    setResetMessage('');

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setResetError('Please enter a valid email address.');
      return;
    }

    setIsResetting(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) {
        setResetError('Failed to send reset email. Please try again.');
        console.error('Password reset error:', error);
      } else {
        setResetMessage('Password reset email sent! Check your inbox.');
        setForgotEmail('');
        
        // Auto-close modal after 3 seconds
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetMessage('');
        }, 3000);
      }
    } catch (err) {
      setResetError('An unexpected error occurred. Please try again.');
      console.error('Unexpected error:', err);
    } finally {
      setIsResetting(false);
    }
  };

  /* 3. Form submit handler */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const matched = await login(email, password);

      // Navigate to user dashboard for regular users, admin dashboard for admin
      if (matched.role === 'admin') {
        await navigate('/admin/dashboard'); // Navigate directly to dashboard, not just /admin
      } else {
        await navigate(`/user/${matched.id}`);
      }
    } catch (err: unknown) {
      console.error('Authentication error:', err);
      const message =
        err instanceof Error
          ? err.message
          : 'Authentication failed. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };





  /* 3. Render */
  return (
    <div className="w-screen flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <header className="fixed top-0 left-0 w-screen h-20 flex items-center bg-slate-800 text-white px-6">
        <ProgressLink to="/" className="text-white hover:text-white active:text-white visited:text-white" >
        <img
          src={Logo}
          alt="TWC logo"
          className="h-16 sm:h-20 md:h-24 w-auto"
        />
        </ProgressLink>
      </header>
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md"
      >
        <h2 className="mb-6 text-center text-2xl font-semibold">Sign In</h2>

        {/* Success message from password reset */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm text-green-600">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Email */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full rounded-md border border-gray-300 p-2 focus:border-indigo-500 focus:ring-indigo-500"
            required
            disabled={isLoading}
          />
        </label>

        {/* Password */}
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </span>
          <div className="relative">
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-gray-300 p-2 pr-20 focus:border-indigo-500 focus:ring-indigo-500"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPwd(!showPwd)}
              className="absolute inset-y-0 right-0 mr-2 rounded px-2 text-sm text-gray-600 hover:underline focus:outline-none disabled:opacity-50"
              disabled={isLoading}
            >
              {showPwd ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        {/* Contact Admin Link */}
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => setShowForgotPassword(true)}
            className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline focus:outline-none"
          >
            Forgot your password?
          </button>
        </div>

        {/* Error message */}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading}
          className="mt-6 w-full rounded bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Signing In...</span>
            </>
          ) : (
            <span>Log In</span>
          )}
        </button>
      </form>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Reset Password</h2>
            <p className="text-sm text-gray-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <form onSubmit={handleForgotPassword}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Enter your email"
                  required
                  disabled={isResetting}
                />
              </div>

              {/* Success message */}
              {resetMessage && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-600">{resetMessage}</p>
                </div>
              )}

              {/* Error message */}
              {resetError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{resetError}</p>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail('');
                    setResetMessage('');
                    setResetError('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={isResetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !forgotEmail}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isResetting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Sending...</span>
                    </>
                  ) : (
                    <span>Send Reset Email</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
