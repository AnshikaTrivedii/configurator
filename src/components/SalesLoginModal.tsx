import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone } from 'lucide-react';
import { salesAPI, SalesUser } from '../api/sales';
import { SalesSetPassword } from './SalesSetPassword';
import { dataPrefetcher } from '../utils/dataPrefetch';

interface SalesLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: SalesUser) => void;
}

export const SalesLoginModal: React.FC<SalesLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState('');
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    
    setIsLoading(true);
    setLoadingStep('Authenticating...');

    try {
      console.log('🚀 Starting login process...');
      console.log('📧 Email entered:', email);
      console.log('🔐 Password entered:', password ? '***' : '(empty)');
      
      setLoadingStep('Verifying credentials...');
      const response = await salesAPI.login(email, password);
      
      console.log('✅ Login API call successful');
      console.log('📦 Full response:', JSON.stringify(response, null, 2));
      console.log('📦 Response.user:', JSON.stringify(response.user, null, 2));
      console.log('📦 Response.user.role:', response.user?.role);
      console.log('📦 Response.user has role?:', 'role' in (response.user || {}));
      
      // Ensure role is set - if backend didn't return it, default to 'sales'
      if (!response.user.role) {
        console.warn('⚠️ WARNING: User object missing role! Defaulting to "sales"');
        response.user.role = 'sales';
      }
      
      setLoadingStep('Setting up session...');
      // Store auth data
      salesAPI.setAuthData(response.token, response.user);
      console.log('✅ Auth data stored');
      console.log('✅ Stored user object:', JSON.stringify(response.user, null, 2));
      console.log('✅ Stored user.role:', response.user.role);
      
      // Check if user needs to set password
      if (response.mustChangePassword) {
        console.log('⚠️ User must change password');
        setCurrentUserEmail(response.user.email);
        setShowPasswordSetup(true);
        setIsLoading(false);
        setLoadingStep('');
        return;
      }
      
      setLoadingStep('Loading dashboard...');
      
      // Start prefetching data in the background for better performance
      dataPrefetcher.prefetchUserData().catch(console.warn);
      
      // Login successful, proceed normally
      console.log('✅ Login successful, calling onLogin callback with user:', JSON.stringify(response.user, null, 2));
      console.log('✅ User role before callback:', response.user.role);
      onLogin(response.user);
      
    } catch (error: any) {
      console.error('❌ ========== LOGIN ERROR IN MODAL ==========');
      console.error('❌ Error type:', error?.constructor?.name);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Error stack:', error?.stack);
      console.error('❌ Full error:', error);
      console.error('❌ Error toString:', error?.toString());
      console.error('❌ =========================================');
      
      // Display error message, handling both string errors and Error objects
      let errorMessage = error?.message || error?.toString() || 'Login failed. Please check your credentials.';
      
      // Provide more helpful error messages
      if (errorMessage.includes('Cannot connect') || errorMessage.includes('Failed to connect') || errorMessage.includes('fetch')) {
        errorMessage = `Cannot connect to backend server.\n\nPlease ensure:\n1. Backend server is running on port 3001\n2. Backend URL is correct: ${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}\n3. No firewall is blocking the connection\n4. Test: Open http://localhost:3001/health in browser\n\nTo start the backend:\ncd backend && npm start`;
      } else if (errorMessage.includes('Invalid email or password')) {
        errorMessage = `Invalid email or password.\n\nPlease check:\n1. Email is correct (e.g., ashoo.nitin@orion-led.com)\n2. Password is correct (default: Orion@123)\n3. Database has been seeded with sales users\n\nTo seed the database:\ncd backend && npm run seed`;
      } else if (errorMessage.includes('Internal server error')) {
        errorMessage = `Server error occurred.\n\nPlease check:\n1. MongoDB is running\n2. Database connection is working\n3. Backend server logs for errors\n\nCommon fixes:\n- Start MongoDB: mongod (or check MongoDB service)\n- Seed database: cd backend && npm run seed\n- Check backend console for error messages`;
      } else if (errorMessage.includes('CORS')) {
        errorMessage = `CORS error detected.\n\nPlease check:\n1. Backend CORS configuration in backend/server.js\n2. Frontend URL is in CORS origins\n3. Backend is allowing credentials\n\nFix: Add your frontend URL to CORS origins in backend/server.js`;
      } else if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        errorMessage = `Login endpoint not found.\n\nPlease check:\n1. Backend API routes are configured correctly\n2. Backend server is running\n3. API URL is correct: ${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}\n\nFix: Check backend/routes/sales.js for /login route`;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handlePasswordSetupSuccess = (token: string, user: SalesUser) => {
    setShowPasswordSetup(false);
    setCurrentUserEmail('');
    onLogin(user);
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    setShowPasswordSetup(false);
    setCurrentUserEmail('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-black text-white p-6 rounded-t-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white/10">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Sales Team Login</h2>
                <p className="text-sm text-gray-300">Access to view and download documents</p>
              </div>
            </div>
            <button
              className="text-gray-300 hover:text-white p-2"
              onClick={handleClose}
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm whitespace-pre-line">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                id="email"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-black focus:border-black text-base transition-all"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
              />
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                id="password"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-black focus:border-black text-base transition-all"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-black text-white font-semibold py-3 px-6 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{loadingStep || 'Signing In...'}</span>
              </div>
            ) : (
              'Sign In'
            )}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Continue as normal user
            </button>
          </div>
        </form>
      </div>

      {/* Password Setup Modal */}
      <SalesSetPassword
        isOpen={showPasswordSetup}
        onClose={() => setShowPasswordSetup(false)}
        onSuccess={handlePasswordSetupSuccess}
        userEmail={currentUserEmail}
      />
    </div>
  );
};
