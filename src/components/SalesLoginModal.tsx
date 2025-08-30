import React, { useState } from 'react';
import { X, Mail, Lock, User } from 'lucide-react';

export interface SalesUser {
  email: string;
  name: string;
}

export interface SalesCredential {
  email: string;
  password: string;
  name: string;
}

interface SalesLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: SalesUser) => void;
}

// Hardcoded sales team credentials
const SALES_TEAM_CREDENTIALS: SalesCredential[] = [
  { email: 'ashwani.yadav@orion-led.com', password: 'orion2024', name: 'Ashwani Yadav' },
  { email: 'sales@orion-led.com', password: 'orion2024', name: 'Sales Team' },
  { email: 'admin@orion-led.com', password: 'orion2024', name: 'Admin' },
];

export const SalesLoginModal: React.FC<SalesLoginModalProps> = ({
  isOpen,
  onClose,
  onLogin
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check credentials - now requires all three fields to match
    const user = SALES_TEAM_CREDENTIALS.find(
      cred => 
        cred.name.toLowerCase() === name.toLowerCase() &&
        cred.email.toLowerCase() === email.toLowerCase() && 
        cred.password === password
    );

    if (user) {
      onLogin({ email: user.email, name: user.name });
    } else {
      setError('Invalid name, email, or password. Please check all fields and try again.');
    }

    setIsLoading(false);
  };

  const handleClose = () => {
    setName('');
    setEmail('');
    setPassword('');
    setError('');
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="name"
                className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-black focus:border-black text-base transition-all"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                required
              />
              <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

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
            {isLoading ? 'Signing In...' : 'Sign In'}
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
    </div>
  );
};
