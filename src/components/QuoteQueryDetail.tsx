import React, { useState, useEffect } from 'react';
import { X, RefreshCw, ArrowLeft } from 'lucide-react';
import { adminAPI, QuoteQuery } from '../api/admin';
import { salesAPI } from '../api/sales';

interface QuoteQueryDetailProps {
  quoteId: string;
  onClose: () => void;
  userRole?: 'sales' | 'super' | 'super_admin' | 'normal' | 'partner';
}

export const QuoteQueryDetail: React.FC<QuoteQueryDetailProps> = ({ quoteId, onClose, userRole }) => {
  const [quote, setQuote] = useState<QuoteQuery | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Determine user role if not provided as prop
        let currentRole = userRole;
        if (!currentRole) {
          // Try to get role from stored user
          const storedUser = salesAPI.getStoredUser();
          currentRole = storedUser?.role as any;
        }
        
        // Use appropriate API based on user role
        // Sales users use sales API (only sees assigned quotes)
        // Super admins use admin API (sees all quotes)
        const isSalesUser = currentRole === 'sales';
        
        let response;
        if (isSalesUser) {
          // Sales users: Use sales API - only returns quotes assigned to them
          response = await salesAPI.getAssignedQuote(quoteId);
        } else {
          // Super admins: Use admin API - can see all quotes
          response = await adminAPI.getQuoteQuery(quoteId);
        }
        
        if (response.success) {
          setQuote(response.data);
        } else {
          setError('Failed to load quote details');
        }
      } catch (err: any) {
        console.error('Error fetching quote:', err);
        setError(err.message || 'Failed to load quote details');
      } finally {
        setLoading(false);
      }
    };

    if (quoteId) {
      fetchQuote();
    }
  }, [quoteId, userRole]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Loading quote details...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Quote not found'}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full my-8 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white p-6 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold">Quote Request Details</h2>
            <p className="text-purple-100 mt-1">Quote ID: {quote.quoteId}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-purple-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Matching Email Structure Exactly */}
        <div className="p-6 space-y-8">
          {/* Customer Information */}
          <section className="border-b border-gray-200 pb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-purple-600 inline-block">
              👤 Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Customer Name
                </strong>
                <span className="text-gray-900 font-medium">{quote.customerName}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Email Address
                </strong>
                <span className="text-gray-900 font-medium">{quote.email}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Phone Number
                </strong>
                <span className="text-gray-900 font-medium">{quote.phone}</span>
              </div>
            </div>
          </section>

          {/* Product Information */}
          <section className="border-b border-gray-200 pb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-purple-600 inline-block">
              🖥️ Product Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Product ID
                </strong>
                <span className="text-gray-900 font-medium">{quote.productId}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Product Name
                </strong>
                <span className="text-gray-900 font-medium">{quote.productName}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Category
                </strong>
                <span className="text-gray-900 font-medium">{quote.category}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Pixel Pitch
                </strong>
                <span className="text-gray-900 font-medium">{quote.pixelPitch}mm</span>
              </div>
            </div>
          </section>

          {/* Display Specifications */}
          <section className="border-b border-gray-200 pb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-purple-600 inline-block">
              📐 Display Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Resolution
                </strong>
                <span className="text-gray-900 font-medium">
                  {quote.resolution.width} × {quote.resolution.height}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Cabinet Dimensions
                </strong>
                <span className="text-gray-900 font-medium">
                  {quote.cabinetDimensions.width}mm × {quote.cabinetDimensions.height}mm
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Module Dimensions
                </strong>
                <span className="text-gray-900 font-medium">
                  {quote.moduleDimensions.width}mm × {quote.moduleDimensions.height}mm
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Module Resolution
                </strong>
                <span className="text-gray-900 font-medium">
                  {quote.moduleResolution.width} × {quote.moduleResolution.height}
                </span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Module Quantity
                </strong>
                <span className="text-gray-900 font-medium">{quote.moduleQuantity}</span>
              </div>
              {quote.displaySize && (
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                  <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                    Display Size
                  </strong>
                  <span className="text-gray-900 font-medium">
                    {quote.displaySize.width}m × {quote.displaySize.height}m
                  </span>
                </div>
              )}
              {quote.aspectRatio && (
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                  <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                    Aspect Ratio
                  </strong>
                  <span className="text-gray-900 font-medium">{quote.aspectRatio}</span>
                </div>
              )}
            </div>
          </section>

          {/* Technical Specifications */}
          <section className="border-b border-gray-200 pb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-purple-600 inline-block">
              ⚙️ Technical Specifications
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Pixel Density
                </strong>
                <span className="text-gray-900 font-medium">{quote.pixelDensity} PPI</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Brightness
                </strong>
                <span className="text-gray-900 font-medium">{quote.brightness} nits</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Refresh Rate
                </strong>
                <span className="text-gray-900 font-medium">{quote.refreshRate} Hz</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Environment
                </strong>
                <span className="text-gray-900 font-medium">{quote.environment}</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Max Power Consumption
                </strong>
                <span className="text-gray-900 font-medium">{quote.maxPowerConsumption}W</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Avg Power Consumption
                </strong>
                <span className="text-gray-900 font-medium">{quote.avgPowerConsumption}W</span>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                  Weight Per Cabinet
                </strong>
                <span className="text-gray-900 font-medium">{quote.weightPerCabinet}kg</span>
              </div>
            </div>
          </section>

          {/* Display Configuration */}
          {quote.cabinetGrid && (
            <section className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-purple-600 inline-block">
                🔲 Display Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                  <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                    Cabinet Grid
                  </strong>
                  <span className="text-gray-900 font-medium">
                    {quote.cabinetGrid.columns} columns × {quote.cabinetGrid.rows} rows
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Additional Options */}
          {(quote.processor || quote.mode) && (
            <section className="border-b border-gray-200 pb-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-purple-600 inline-block">
                🔧 Additional Options
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {quote.processor && (
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                    <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                      Processor
                    </strong>
                    <span className="text-gray-900 font-medium">{quote.processor}</span>
                  </div>
                )}
                {quote.mode && (
                  <div className="bg-gray-50 p-4 rounded-lg border-l-4 border-purple-600">
                    <strong className="text-gray-600 text-sm uppercase tracking-wide block mb-2">
                      Mode
                    </strong>
                    <span className="text-gray-900 font-medium">{quote.mode}</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Customer Message */}
          <section>
            <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b-2 border-purple-600 inline-block">
              💬 Customer Message
            </h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-4">
              <h4 className="text-blue-800 font-semibold mb-2">
                Message from {quote.customerName}
                {quote.userType && ` (${quote.userType})`}
              </h4>
              <p className="text-gray-700 whitespace-pre-wrap">{quote.message || 'No message provided'}</p>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <button
            onClick={onClose}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to List
          </button>
          <div className="text-sm text-gray-600">
            Created: {new Date(quote.createdAt).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

