import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, FileText, DollarSign, Package, Clock, MessageSquare, RefreshCw } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { getPricingDisplayInfo, formatPrice, getUserTypeFromQuotation } from '../utils/pricingCalculator';

// Import pricing utilities

interface SalesPerson {
  _id: string;
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  role: string;
  createdAt: string;
}

interface Quotation {
  quotationId: string;
  productName: string;
  productDetails: any;
  totalPrice: number;
  status: string;
  message: string;
  createdAt: string;
}

interface Customer {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  userType: string;
  userTypeDisplayName: string;
  quotations: Quotation[];
}

interface SalesPersonDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  salesPersonId: string | null;
  loggedInUser?: {
    role?: string;
    name?: string;
    email?: string;
  };
}

export const SalesPersonDetailsModal: React.FC<SalesPersonDetailsModalProps> = ({
  isOpen,
  onClose,
  salesPersonId,
  loggedInUser
}) => {
  const [salesPerson, setSalesPerson] = useState<SalesPerson | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalQuotations, setTotalQuotations] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && salesPersonId) {
      fetchSalesPersonDetails();
    }
  }, [isOpen, salesPersonId]);

  // Component lifecycle

  const fetchSalesPersonDetails = async () => {
    if (!salesPersonId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching sales person details for ID:', salesPersonId);
      // Add cache-busting parameter to ensure fresh data
      const response = await salesAPI.getSalesPersonDetails(salesPersonId + '?t=' + Date.now());
      
      console.log('📊 Sales person details response:', response);
      console.log('👥 Customers found:', response.customers?.length || 0);
      
      // Log quotation statuses for debugging
      response.customers?.forEach((customer, index) => {
        console.log(`📋 Customer ${index + 1}: ${customer.customerName}`);
        customer.quotations?.forEach((quotation, qIndex) => {
          console.log(`  Quotation ${qIndex + 1}: ${quotation.quotationId} - Status: ${quotation.status}`);
          console.log(`    Status type: ${typeof quotation.status}`);
          console.log(`    Status length: ${quotation.status?.length}`);
          console.log(`    Raw status: "${quotation.status}"`);
        });
      });
      
      setSalesPerson(response.salesPerson);
      setCustomers(response.customers);
      setTotalQuotations(response.totalQuotations);
      setTotalCustomers(response.totalCustomers);
    } catch (err) {
      console.error('Error fetching sales person details:', err);
      setError('Failed to load sales person details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Hold': return 'bg-orange-100 text-orange-800';
      case 'Converted': return 'bg-green-100 text-green-800';
      // Legacy status values for backward compatibility
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'followed_up': return 'bg-purple-100 text-purple-800';
      case 'converted': return 'bg-green-100 text-green-800';
      case 'lost': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatProductDetails = (productDetails: any) => {
    if (!productDetails) return 'N/A';
    
    const details = [];
    
    // Basic product info
    if (productDetails.productName) details.push(`Product: ${productDetails.productName}`);
    if (productDetails.pixelPitch) details.push(`Pixel Pitch: ${productDetails.pixelPitch}mm`);
    if (productDetails.category) details.push(`Category: ${productDetails.category}`);
    
    // Display specifications
    if (productDetails.resolution) {
      details.push(`Resolution: ${productDetails.resolution.width}×${productDetails.resolution.height}px`);
    }
    if (productDetails.displaySize) {
      details.push(`Display Size: ${productDetails.displaySize.width}×${productDetails.displaySize.height}m`);
    }
    if (productDetails.aspectRatio) details.push(`Aspect Ratio: ${productDetails.aspectRatio}`);
    
    // Cabinet configuration
    if (productDetails.cabinetGrid) {
      details.push(`Cabinet Grid: ${productDetails.cabinetGrid.columns}×${productDetails.cabinetGrid.rows}`);
    }
    if (productDetails.processor) details.push(`Processor: ${productDetails.processor}`);
    if (productDetails.mode) details.push(`Mode: ${productDetails.mode}`);
    
    // Technical specs
    if (productDetails.brightness) details.push(`Brightness: ${productDetails.brightness}cd/m²`);
    if (productDetails.refreshRate) details.push(`Refresh Rate: ${productDetails.refreshRate}Hz`);
    if (productDetails.environment) details.push(`Environment: ${productDetails.environment}`);
    if (productDetails.maxPowerConsumption) details.push(`Max Power: ${productDetails.maxPowerConsumption}W`);
    if (productDetails.avgPowerConsumption) details.push(`Avg Power: ${productDetails.avgPowerConsumption}W`);
    if (productDetails.weightPerCabinet) details.push(`Weight: ${productDetails.weightPerCabinet}kg`);
    
    return details.length > 0 ? details.join(', ') : 'N/A';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              {loading ? 'Loading...' : salesPerson?.name || 'Sales Person Details'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchSalesPersonDetails}
              disabled={loading}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading sales person details...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 mb-4">{error}</div>
              <button
                onClick={fetchSalesPersonDetails}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : salesPerson ? (
            <div className="p-6">
              {/* Sales Person Info */}
              <div className="bg-gray-50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Person Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{salesPerson.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{salesPerson.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Contact Number</p>
                      <p className="font-medium">{salesPerson.contactNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Location</p>
                      <p className="font-medium">{salesPerson.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Joined</p>
                      <p className="font-medium">{new Date(salesPerson.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">Total Quotations</p>
                      <p className="font-medium">{totalQuotations}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Customers and Quotations */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Clients & Quotations ({totalCustomers} clients, {totalQuotations} quotations)
                </h3>
                
                {customers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No quotations found for this sales person.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {customers.map((customer, customerIndex) => (
                      <div key={customerIndex} className="border border-gray-200 rounded-lg p-6">
                        {/* Customer Info */}
                        <div className="mb-4">
                          <h4 className="text-md font-semibold text-gray-900 mb-2">{customer.customerName}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center space-x-2">
                              <Mail className="w-4 h-4 text-gray-400" />
                              <span>{customer.customerEmail}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Phone className="w-4 h-4 text-gray-400" />
                              <span>{customer.customerPhone}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <User className="w-4 h-4 text-gray-400" />
                              <span>{customer.userTypeDisplayName}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quotations */}
                        <div>
                          <h5 className="text-sm font-medium text-gray-700 mb-3">
                            Quotations ({customer.quotations.length})
                          </h5>
                          <div className="space-y-3">
                            {customer.quotations.map((quotation, quotationIndex) => (
                              <div key={quotationIndex} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                {/* Header with Product and Status */}
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center space-x-3">
                                    <Package className="w-5 h-5 text-blue-600" />
                                    <div>
                                      <p className="font-semibold text-gray-900 text-lg">{quotation.productName}</p>
                                      <p className="text-sm text-gray-600">Quotation ID: {quotation.quotationId}</p>
                                    </div>
                                  </div>
                                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(quotation.status)}`}>
                                    {(() => {
                                      const displayStatus = quotation.status?.replace('_', ' ') || 'Unknown';
                                      console.log(`🎨 Rendering status for ${quotation.quotationId}:`, {
                                        original: quotation.status,
                                        display: displayStatus,
                                        colorClass: getStatusColor(quotation.status)
                                      });
                                      return displayStatus;
                                    })()}
                                  </span>
                                </div>
                                
                                {/* Product Specifications Grid */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                  {/* Basic Product Info */}
                                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                                    <h6 className="font-semibold text-gray-900 mb-3 flex items-center">
                                      <Package className="w-4 h-4 mr-2 text-blue-600" />
                                      Product Specifications
                                    </h6>
                                    <div className="space-y-2 text-sm">
                                      {quotation.productDetails?.pixelPitch && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Pixel Pitch:</span>
                                          <span className="font-medium">{quotation.productDetails.pixelPitch}mm</span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.category && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Category:</span>
                                          <span className="font-medium">{quotation.productDetails.category}</span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.resolution && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Resolution:</span>
                                          <span className="font-medium">
                                            {quotation.productDetails.resolution.width}×{quotation.productDetails.resolution.height}px
                                          </span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.displaySize && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Display Size:</span>
                                          <span className="font-medium">
                                            {quotation.productDetails.displaySize.width}×{quotation.productDetails.displaySize.height}m
                                          </span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.aspectRatio && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Aspect Ratio:</span>
                                          <span className="font-medium">{quotation.productDetails.aspectRatio}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Technical Specifications */}
                                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                                    <h6 className="font-semibold text-gray-900 mb-3 flex items-center">
                                      <Clock className="w-4 h-4 mr-2 text-green-600" />
                                      Technical Specs
                                    </h6>
                                    <div className="space-y-2 text-sm">
                                      {quotation.productDetails?.brightness && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Brightness:</span>
                                          <span className="font-medium">{quotation.productDetails.brightness}cd/m²</span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.refreshRate && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Refresh Rate:</span>
                                          <span className="font-medium">{quotation.productDetails.refreshRate}Hz</span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.environment && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Environment:</span>
                                          <span className="font-medium capitalize">{quotation.productDetails.environment}</span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.maxPowerConsumption && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Max Power:</span>
                                          <span className="font-medium">{quotation.productDetails.maxPowerConsumption}W</span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.avgPowerConsumption && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Avg Power:</span>
                                          <span className="font-medium">{quotation.productDetails.avgPowerConsumption}W</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Configuration and Pricing */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
                                  {/* Configuration */}
                                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                                    <h6 className="font-semibold text-gray-900 mb-3 flex items-center">
                                      <FileText className="w-4 h-4 mr-2 text-purple-600" />
                                      Configuration
                                    </h6>
                                    <div className="space-y-2 text-sm">
                                      {quotation.productDetails?.cabinetGrid && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Cabinet Grid:</span>
                                          <span className="font-medium">
                                            {quotation.productDetails.cabinetGrid.columns}×{quotation.productDetails.cabinetGrid.rows}
                                          </span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.processor && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Processor:</span>
                                          <span className="font-medium">{quotation.productDetails.processor}</span>
                                        </div>
                                      )}
                                      {quotation.productDetails?.mode && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Mode:</span>
                                          <span className="font-medium">{quotation.productDetails.mode}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Pricing and Timeline */}
                                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                                    <h6 className="font-semibold text-gray-900 mb-3 flex items-center">
                                      <DollarSign className="w-4 h-4 mr-2 text-green-600" />
                                      Pricing & Timeline
                                    </h6>
                                    <div className="space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">User Type:</span>
                                        <span className="font-medium">{customer.userTypeDisplayName}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Total Price:</span>
                                        <div className="text-right">
                                          {(() => {
                                            // Use the actual stored price from the database
                                            const actualPrice = quotation.totalPrice || 0;
                                            const userTypeDisplayName = quotation.userTypeDisplayName || 'End User';
                                            
                                            return (
                                              <div>
                                                <span className="font-semibold text-green-600">
                                                  ₹{actualPrice.toLocaleString('en-IN')}
                                                </span>
                                                <div className="text-xs text-blue-600">
                                                  {userTypeDisplayName} Pricing
                                                </div>
                                              </div>
                                            );
                                          })()}
                                        </div>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Created:</span>
                                        <span className="font-medium">
                                          {new Date(quotation.createdAt).toLocaleDateString('en-IN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit'
                                          })}
                                        </span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Time:</span>
                                        <span className="font-medium">
                                          {new Date(quotation.createdAt).toLocaleTimeString('en-IN', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                          })}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Message */}
                                {quotation.message && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-100">
                                    <h6 className="font-semibold text-gray-900 mb-2 flex items-center">
                                      <MessageSquare className="w-4 h-4 mr-2 text-orange-600" />
                                      Additional Message
                                    </h6>
                                    <p className="text-gray-700 text-sm">{quotation.message}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
