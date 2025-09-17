import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import ProgressLink from '../components/ProgressLink';
import { supabase } from '../lib/supabase';
import Logo from "../assets/TWC_Logo_Horiztonal_Black_Gold.png";

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isCheckingToken, setIsCheckingToken] = useState(true);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const checkTokenValidity = async () => {
      // First, let's see what we have in the URL
      console.log('🔍 Reset password page loaded');
      console.log('📍 Full URL:', window.location.href);
      console.log('📍 Search:', window.location.search);
      console.log('📍 Hash:', window.location.hash);
      
      // Check both URL search params and hash for tokens
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      const accessToken = searchParams.get('access_token') || hashParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token') || hashParams.get('refresh_token');
      const type = searchParams.get('type') || hashParams.get('type');
      const tokenType = searchParams.get('token_type') || hashParams.get('token_type');
      const error = searchParams.get('error') || hashParams.get('error');
      const errorDescription = searchParams.get('error_description') || hashParams.get('error_description');
      const errorCode = searchParams.get('error_code') || hashParams.get('error_code');

      console.log('🔍 Token analysis:', {
        accessToken: accessToken ? 'PRESENT' : 'MISSING',
        refreshToken: refreshToken ? 'PRESENT' : 'MISSING',
        type: type || 'NOT SET',
        tokenType: tokenType || 'NOT SET',
        error: error || 'NONE',
        errorDescription: errorDescription || 'NONE',
      });

      // Check for errors first
      if (error) {
        let errorMessage = 'Authentication error occurred.';
        
        if (error === 'access_denied') {
          if (errorDescription?.includes('expired') || errorCode === 'otp_expired') {
            errorMessage = 'This password reset link has expired. Please request a new password reset.';
          } else if (errorDescription?.includes('invalid')) {
            errorMessage = 'This password reset link is invalid. Please request a new password reset.';
          } else {
            errorMessage = `Access denied: ${errorDescription || 'Please request a new password reset.'}`;
          }
        } else {
          errorMessage = errorDescription || error;
        }
        
        console.log('❌ Password reset error detected:', { error, errorDescription, errorCode });
        setError(errorMessage);
        setIsCheckingToken(false);
        return;
      }

      // Try to get current session first (in case user is already authenticated)
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('🔍 Current session check:', { session: session ? 'EXISTS' : 'NONE', sessionError });
        
        if (session && !sessionError) {
          console.log('✅ Valid session found, allowing password reset');
          setIsValidToken(true);
          setIsCheckingToken(false);
          return;
        }
      } catch (err) {
        console.log('⚠️ Session check failed:', err);
      }

      // If no tokens in URL and no existing session, check if this is a direct access
      if (!accessToken && !refreshToken) {
        // Maybe user navigated directly to reset page or tokens were in a different format
        console.log('❌ No tokens found in URL and no existing session');
        setError('Invalid reset link. Please request a new password reset.');
        setIsCheckingToken(false);
        return;
      }

      // Verify this is actually a password reset (not signup)
      if (type && type !== 'recovery') {
        console.log('❌ Wrong link type:', type);
        setError(`Invalid reset link type: ${type}. Please request a new password reset.`);
        setIsCheckingToken(false);
        return;
      }

      try {
        console.log('🧪 Attempting to set session with tokens...');
        // Set the session with the tokens from the URL
        const { data, error: setSessionError } = await supabase.auth.setSession({
          access_token: accessToken!,
          refresh_token: refreshToken!,
        });

        console.log('🧪 Session setup result:', { 
          data: data ? 'SUCCESS' : 'NO_DATA', 
          error: setSessionError || 'NONE' 
        });

        if (setSessionError) {
          console.error('❌ Session error:', setSessionError);
          setError(`Invalid or expired reset link: ${setSessionError.message}`);
        } else if (data?.session) {
          console.log('✅ Session established successfully');
          setIsValidToken(true);
          // Clean up the URL by removing the tokens
          window.history.replaceState({}, document.title, '/auth/reset-password');
        } else {
          console.error('❌ No session data returned');
          setError('Failed to establish session. Please request a new password reset.');
        }
      } catch (err) {
        console.error('❌ Token validation error:', err);
        setError('Invalid reset link. Please request a new password reset.');
      } finally {
        setIsCheckingToken(false);
      }
    };

    checkTokenValidity();
  }, [searchParams]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validation
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        setError(error.message);
      } else {
        // Password updated successfully
        await supabase.auth.signOut(); // Sign out to require fresh login
        navigate('/signin', { 
          state: { 
            message: 'Password updated successfully! Please sign in with your new password.' 
          }
        });
      }
    } catch (err: unknown) {
      console.error('Password update error:', err);
      const message = err instanceof Error ? err.message : 'Failed to update password. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state while checking token
  if (isCheckingToken) {
    return (
      <div className="w-screen flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <header className="fixed top-0 left-0 w-screen h-20 flex items-center bg-slate-800 text-white px-5">
          <ProgressLink to="/" className="text-white hover:text-white active:text-white visited:text-white">
            <img
              src={Logo}
              alt="TWC logo"
              className="h-16 sm:h-20 md:h-24 w-auto"
            />
          </ProgressLink>
        </header>
        <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">Verifying Reset Link...</h2>
            <p className="text-gray-600 mt-2">Please wait while we validate your password reset link.</p>
          </div>
        </div>
      </div>
    );
  }

  // Invalid token state
  if (!isValidToken) {
    return (
      <div className="w-screen flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <header className="fixed top-0 left-0 w-screen h-20 flex items-center bg-slate-800 text-white px-5">
          <ProgressLink to="/" className="text-white hover:text-white active:text-white visited:text-white">
            <img
              src={Logo}
              alt="TWC logo"
              className="h-16 sm:h-20 md:h-24 w-auto"
            />
          </ProgressLink>
        </header>
        <div className="w-full max-w-sm rounded-lg bg-white p-8 shadow-md">
          <div className="text-center">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-red-800 mb-2">Invalid Reset Link</h2>
            <p className="text-gray-600 mb-4">{error}</p>
            
            <div className="space-y-3">
              <Link
                to="/sign-in"
                className="inline-block w-full px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
              >
                Request New Password Reset
              </Link>
              
              <Link
                to="/"
                className="inline-block w-full px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Valid token - show password reset form
  return (
    <div className="w-screen flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <header className="fixed top-0 left-0 w-screen h-20 flex items-center bg-slate-800 text-white px-5">
        <ProgressLink to="/" className="text-white hover:text-white active:text-white visited:text-white">
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
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-3a1 1 0 011-1h2.586l4.707-4.707A6 6 0 1721 9z" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900">Reset Your Password</h2>
          <p className="text-gray-600 mt-2">Enter your new password below.</p>
        </div>

        {/* New Password */}
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            New Password
          </span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-md border border-gray-300 p-2 pr-20 focus:border-emerald-500 focus:ring-emerald-500"
              placeholder="Enter new password"
              required
              disabled={isLoading}
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 mr-2 rounded px-2 text-sm text-gray-600 hover:underline focus:outline-none disabled:opacity-50"
              disabled={isLoading}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Password must be at least 6 characters long.</p>
        </label>

        {/* Confirm Password */}
        <label className="mt-4 block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            Confirm New Password
          </span>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`block w-full rounded-md border p-2 pr-20 focus:ring-emerald-500 ${
                confirmPassword && password !== confirmPassword
                  ? 'border-red-400 bg-red-50 focus:border-red-500'
                  : confirmPassword && password === confirmPassword
                  ? 'border-green-400 bg-green-50 focus:border-green-500'
                  : 'border-gray-300 focus:border-emerald-500'
              }`}
              placeholder="Confirm new password"
              required
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 mr-2 rounded px-2 text-sm text-gray-600 hover:underline focus:outline-none disabled:opacity-50"
              disabled={isLoading}
            >
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          {/* Password match indicator */}
          {confirmPassword && (
            <p className={`text-xs mt-1 ${
              password === confirmPassword ? 'text-green-600' : 'text-red-600'
            }`}>
              {password === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
            </p>
          )}
        </label>

        {/* Error message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <button
          type="submit"
          disabled={isLoading || password !== confirmPassword || password.length < 6}
          className="mt-6 w-full rounded bg-emerald-600 py-2 font-semibold text-white hover:bg-emerald-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Updating Password...</span>
            </>
          ) : (
            <span>Update Password</span>
          )}
        </button>

        <div className="mt-4 text-center">
          <Link
            to="/signin"
            className="text-sm text-emerald-600 hover:text-emerald-700 hover:underline"
          >
            Back to Sign In
          </Link>
        </div>
      </form>
    </div>
  );
}
