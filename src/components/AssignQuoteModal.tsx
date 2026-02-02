import React, { useState, useEffect } from 'react';
import { X, User, CheckCircle, AlertCircle } from 'lucide-react';
import { adminAPI } from '../api/admin';
import { salesAPI } from '../api/sales';
import { QuoteQuery } from '../api/admin';

interface SalesUser {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface AssignQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: QuoteQuery | null;
  onAssignSuccess: () => void;
}

export const AssignQuoteModal: React.FC<AssignQuoteModalProps> = ({
  isOpen,
  onClose,
  quote,
  onAssignSuccess
}) => {
  const [salesUsers, setSalesUsers] = useState<SalesUser[]>([]);
  const [selectedSalesUserId, setSelectedSalesUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && quote) {
      fetchSalesUsers();
      // Pre-select if already assigned
      if (quote.assignedTo) {
        if (typeof quote.assignedTo === 'string') {
          setSelectedSalesUserId(quote.assignedTo);
        } else {
          const assignedObj = quote.assignedTo as { _id: string; name: string; email: string };
          if (assignedObj && assignedObj._id) {
            setSelectedSalesUserId(assignedObj._id);
          } else {
            setSelectedSalesUserId('');
          }
        }
      } else {
        setSelectedSalesUserId('');
      }
      setError(null);
      setSuccess(false);
    }
  }, [isOpen, quote]);

  const fetchSalesUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await salesAPI.getSalesPersons();
      // Filter only active sales users (role === 'sales')
      const activeSalesUsers = (response.salesPersons || []).filter(
        (user: SalesUser) => user.role === 'sales'
      );
      setSalesUsers(activeSalesUsers);
    } catch (err: any) {
      console.error('Error fetching sales users:', err);
      setError('Failed to load sales users');
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssign = async () => {
    if (!quote || !selectedSalesUserId) {
      setError('Please select a sales person');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await adminAPI.assignQuote(quote.quoteId, selectedSalesUserId);
      
      setSuccess(true);
      
      // Close modal after 1.5 seconds and refresh list
      setTimeout(() => {
        onAssignSuccess();
        onClose();
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('Error assigning quote:', err);
      setError(err.message || 'Failed to assign quote');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !quote) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {quote.assignedTo ? 'Reassign Quote' : 'Assign Quote'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Quote Information */}
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Quote ID</label>
              <div className="mt-1 text-sm text-gray-900 font-mono">{quote.quoteId}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Client Name</label>
              <div className="mt-1 text-sm text-gray-900">{quote.customerName}</div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Product Name</label>
              <div className="mt-1 text-sm text-gray-900">{quote.productName}</div>
            </div>
          </div>

          {/* Sales User Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assign to Sales Person <span className="text-red-500">*</span>
            </label>
            {loadingUsers ? (
              <div className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm text-gray-500">
                Loading sales users...
              </div>
            ) : (
              <select
                value={selectedSalesUserId}
                onChange={(e) => setSelectedSalesUserId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loading}
              >
                <option value="">Select a sales person...</option>
                {salesUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            )}
            {salesUsers.length === 0 && !loadingUsers && (
              <p className="mt-1 text-sm text-gray-500">No active sales users found</p>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-600">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              <span>Quote assigned successfully!</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedSalesUserId || loadingUsers}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <User className="w-4 h-4" />
                {quote.assignedTo ? 'Reassign' : 'Assign'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

