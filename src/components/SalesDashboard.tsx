import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, FileText, Package, Calendar, RefreshCw, LogOut, MessageSquare, Plus, Eye, Edit } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { clientAPI } from '../api/clients';
import { PdfViewModal } from './PdfViewModal';
import { QuoteModal } from './QuoteModal';
import { generateConfigurationHtml } from '../utils/docxGenerator';
import { Quotation } from '../types';
import { products } from '../data/products';

interface SalesPerson {
  _id: string;
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  role: string;
}

interface Customer {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  userType: string;
  userTypeDisplayName: string;
  quotations: Quotation[];
}

interface SalesDashboardProps {
  onBack: () => void;
  onLogout: () => void;
  onEditQuotation?: (quotation: Quotation) => void;
  loggedInUser?: {
    role?: string;
    name?: string;
    email?: string;
  };
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ onBack, onLogout, onEditQuotation, loggedInUser }) => {
  const [salesPerson, setSalesPerson] = useState<SalesPerson | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalQuotations, setTotalQuotations] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfHtmlContent, setPdfHtmlContent] = useState<string>('');

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [editingClientInfo, setEditingClientInfo] = useState<{ name?: string; email?: string; phone?: string; projectTitle?: string; location?: string } | null>(null);

  useEffect(() => {

    fetchDashboardData();

  }, []);

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);

      const response = await salesAPI.getMyDashboard();

      if (!response || !response.success) {
        throw new Error('Invalid response from server');
      }

      setSalesPerson(response.salesPerson);
      setCustomers(response.customers || []);
      setTotalQuotations(response.totalQuotations || 0);
      setTotalCustomers(response.totalCustomers || 0);
      setTotalRevenue(response.totalRevenue || 0);
      setLastRefreshTime(new Date());
    } catch (err: any) {

      setError(err.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleViewPdf = async (quotation: Quotation) => {
    try {
      setSelectedQuotation(quotation);

      if (quotation.pdfS3Key || quotation.pdfS3Url) {
        try {

          const pdfUrlResponse = await salesAPI.getQuotationPdfUrl(quotation.quotationId);

          window.open(pdfUrlResponse.pdfS3Url, '_blank');
          return;
        } catch (s3Error) {

        }
      }

      if (quotation.pdfPage6HTML) {
        setPdfHtmlContent(quotation.pdfPage6HTML);
        setIsPdfModalOpen(true);
        return;
      }

      if (quotation.exactPricingBreakdown && quotation.exactProductSpecs) {
        const productDetails = quotation.productDetails;
        const exactSpecs = quotation.exactProductSpecs;

        const product = productDetails?.product || productDetails;

        let config = quotation.quotationData?.config;
        if (!config && exactSpecs.displaySize) {

          config = {
            width: (exactSpecs.displaySize.width * 1000) || 0,
            height: (exactSpecs.displaySize.height * 1000) || 0,
            unit: 'mm'
          };
        } else if (!config) {

          config = {
            width: productDetails?.width || productDetails?.displaySize?.width || 0,
            height: productDetails?.height || productDetails?.displaySize?.height || 0,
            unit: productDetails?.unit || 'mm'
          };
        }

        const cabinetGrid = exactSpecs.cabinetGrid || productDetails?.cabinetGrid;
        const processor = exactSpecs.processor || productDetails?.processor || null;
        const mode = exactSpecs.mode || productDetails?.mode || undefined;

        const customer = customers.find(c =>
          c.quotations.some(q => q.quotationId === quotation.quotationId)
        );

        let userTypeForHtml: 'End User' | 'Reseller' | 'Channel' = 'End User';
        if (quotation.userType === 'siChannel') {
          userTypeForHtml = 'Channel';
        } else if (quotation.userType === 'reseller') {
          userTypeForHtml = 'Reseller';
        }

        const userInfo = {
          userType: userTypeForHtml,
          fullName: customer?.customerName || '',
          email: customer?.customerEmail || '',
          phoneNumber: customer?.customerPhone || ''
        };

        const htmlContent = generateConfigurationHtml(
          config,
          product,
          cabinetGrid,
          processor,
          mode,
          userInfo,
          salesPerson ? {
            email: salesPerson.email,
            name: salesPerson.name,
            contactNumber: salesPerson.contactNumber,
            location: salesPerson.location
          } : null,
          quotation.quotationId,
          undefined, // customPricing
          quotation.exactPricingBreakdown // CRITICAL: Use exact pricing breakdown
        );

        setPdfHtmlContent(htmlContent);
        setIsPdfModalOpen(true);
      } else {
        alert('PDF data not available for this quotation. The quotation may have been created before PDF storage was implemented. Please contact support.');
      }
    } catch (error) {

      alert('Failed to load PDF. Please try again or contact support.');
    }
  };

  const handleEditQuotation = async (quotation: Quotation) => {
    if (onEditQuotation) {
      onEditQuotation(quotation);
    } else {
      setEditingQuotation(quotation);
      
      // Fetch client info if clientId exists
      let clientInfo = null;
      if (quotation.clientId) {
        try {
          // Convert clientId to string if needed
          let clientIdString: string;
          if (typeof quotation.clientId === 'string') {
            clientIdString = quotation.clientId;
          } else if (quotation.clientId.$oid) {
            clientIdString = quotation.clientId.$oid;
          } else if (quotation.clientId._id) {
            clientIdString = String(quotation.clientId._id);
          } else if (typeof quotation.clientId.toString === 'function') {
            clientIdString = quotation.clientId.toString();
          } else {
            clientIdString = String(quotation.clientId);
          }
          
          const clientResponse = await clientAPI.getClientById(clientIdString);
          if (clientResponse.success && clientResponse.client) {
            clientInfo = clientResponse.client;
          }
        } catch (error) {
          console.error('Failed to fetch client info for editing:', error);
        }
      }
      
      // Store full client info for use in QuoteModal
      setEditingClientInfo(clientInfo ? {
        name: clientInfo.name,
        email: clientInfo.email,
        phone: clientInfo.phone,
        projectTitle: clientInfo.projectTitle || '',
        location: clientInfo.location || ''
      } : null);
      
      setIsEditModalOpen(true);
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedQuotation || !pdfHtmlContent) return;

    try {

      const html2pdf = (await import('html2pdf.js')).default;

      const element = document.createElement('div');
      element.innerHTML = pdfHtmlContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      document.body.appendChild(element);

      const opt = {
        margin: [10, 10, 10, 10],
        filename: `${selectedQuotation.quotationId}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();

      document.body.removeChild(element);
    } catch (error) {

      alert('Failed to download PDF. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="text-red-600 mb-4">
            <X size={48} className="mx-auto" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData(true)}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-black text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl sm:text-2xl font-bold">Sales Dashboard</h1>
              {lastRefreshTime && (
                <span className="text-sm text-gray-300">
                  Last updated: {lastRefreshTime.toLocaleTimeString()}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                title="Create New Quotation"
              >
                <Plus size={16} />
                New Quotation
              </button>
              <button
                onClick={() => fetchDashboardData(true)}
                className="px-3 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                title="Refresh"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={onLogout}
                className="px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Quotations</p>
                <p className="text-2xl font-bold text-gray-900">{totalQuotations}</p>
              </div>
              <FileText className="text-blue-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Customers</p>
                <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
              </div>
              <User className="text-green-600" size={32} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">User Info</p>
                <p className="text-lg font-semibold text-gray-900">{salesPerson?.name || 'N/A'}</p>
              </div>
              <User className="text-indigo-600" size={32} />
            </div>
          </div>
        </div>

        {/* Customers List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">My Customers & Quotations</h2>
          </div>

          {customers.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="mx-auto text-gray-400 mb-4" size={48} />
              <p className="text-gray-600 text-lg">No customers or quotations yet</p>
              <p className="text-gray-500 text-sm mt-2">Start creating quotations to see them here</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {customers.map((customer, customerIndex) => (
                <div key={customerIndex} className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{customer.customerName}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Mail size={16} />
                          <span>{customer.customerEmail}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Phone size={16} />
                          <span>{customer.customerPhone}</span>
                        </div>
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                          {customer.userTypeDisplayName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {customer.quotations.map((quotation, qIndex) => (
                      <div key={qIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Package size={16} className="text-gray-500" />
                              <span className="font-semibold text-gray-900">{quotation.productName}</span>
                              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                                {quotation.quotationId}
                              </span>
                            </div>
                            {quotation.message && (
                              <p className="text-sm text-gray-600 mb-2 flex items-start gap-2">
                                <MessageSquare size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
                                <span>{quotation.message}</span>
                              </p>
                            )}
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>{formatDate(quotation.createdAt)}</span>
                              </div>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded font-medium">
                                {quotation.userTypeDisplayName}
                              </span>
                            </div>
                          </div>
                          <div className="text-right ml-4 flex flex-col items-end gap-2">
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(quotation.totalPrice)}
                            </p>
                            <button
                              onClick={() => handleViewPdf(quotation)}
                              className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1"
                              title="View PDF"
                            >
                              <Eye size={14} />
                              View PDF
                            </button>
                            <button
                              onClick={() => handleEditQuotation({
                                ...quotation,
                                customerName: customer.customerName,
                                customerEmail: customer.customerEmail,
                                customerPhone: customer.customerPhone,
                                userType: customer.userType, // Ensure userType is passed from customer if missing
                                userTypeDisplayName: customer.userTypeDisplayName
                              })}
                              className="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1"
                              title="Edit Quote"
                            >
                              <Edit size={14} />
                              Edit
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF View Modal */}
      {selectedQuotation && (() => {
        // Get full product with prices from products.ts
        const productDetails = selectedQuotation.productDetails;
        const productId = productDetails?.productId || productDetails?.product?.id || productDetails?.id;
        let fullProduct = productId ? products.find(p => p.id === productId) : null;
        
        // If not found, fallback to productDetails
        if (!fullProduct) {
          fullProduct = productDetails?.product || productDetails;
          // Ensure id is set for PdfViewModal lookup
          if (fullProduct && !fullProduct.id && productId) {
            fullProduct = { ...fullProduct, id: productId };
          } else if (fullProduct && !fullProduct.id && fullProduct.productId) {
            fullProduct = { ...fullProduct, id: fullProduct.productId };
          }
        } else {
          // Merge: Start with product from products.ts (has prices), then add fields from productDetails
          // But preserve price fields from products.ts to ensure they're not overwritten
          const productFromDetails = productDetails?.product || productDetails;
          fullProduct = {
            ...fullProduct,
            ...productFromDetails,
            // Ensure price fields from products.ts are preserved
            price: fullProduct.price ?? productFromDetails.price,
            resellerPrice: fullProduct.resellerPrice ?? productFromDetails.resellerPrice,
            siChannelPrice: fullProduct.siChannelPrice ?? productFromDetails.siChannelPrice,
            prices: fullProduct.prices ?? productFromDetails.prices,
            // Ensure id is set (use productFromList.id which is the canonical id)
            id: fullProduct.id
          };
        }
        
        return (
          <PdfViewModal
            isOpen={isPdfModalOpen}
            onClose={() => {
              setIsPdfModalOpen(false);
              setSelectedQuotation(null);
              setPdfHtmlContent('');
            }}
            htmlContent={pdfHtmlContent}
            onDownload={handleDownloadPdf}
            fileName={`${selectedQuotation.quotationId}.pdf`}
            selectedProduct={fullProduct}
          config={selectedQuotation.quotationData?.config || {
            width: selectedQuotation.productDetails?.width || 0,
            height: selectedQuotation.productDetails?.height || 0,
            unit: selectedQuotation.productDetails?.unit || 'mm'
          }}
          cabinetGrid={selectedQuotation.productDetails?.cabinetGrid || selectedQuotation.quotationData?.cabinetGrid}
          processor={selectedQuotation.productDetails?.processor || selectedQuotation.quotationData?.processor || null}
          userInfo={{
            userType: selectedQuotation.userTypeDisplayName,
            customerName: customers.find(c => c.quotations.some(q => q.quotationId === selectedQuotation.quotationId))?.customerName || '',
            customerEmail: customers.find(c => c.quotations.some(q => q.quotationId === selectedQuotation.quotationId))?.customerEmail || '',
            customerPhone: customers.find(c => c.quotations.some(q => q.quotationId === selectedQuotation.quotationId))?.customerPhone || ''
          }}
          salesUser={salesPerson ? {
            _id: salesPerson._id,
            name: salesPerson.name,
            email: salesPerson.email,
            role: salesPerson.role
          } : null}
          userRole="sales"
          quotationId={selectedQuotation.quotationId}
          clientId={selectedQuotation.clientId}
          exactPricingBreakdown={selectedQuotation.exactPricingBreakdown}
          />
        );
      })()}

      {/* Edit Quotation Modal */}
      {editingQuotation && (() => {
        // Extract configuration from exactProductSpecs (same as PDF viewing)
        const exactSpecs = editingQuotation.exactProductSpecs;
        const productDetails = editingQuotation.productDetails;
        
        // Get product ID from productDetails
        const productId = productDetails?.productId || productDetails?.product?.id || productDetails?.id;
        
        // Try to find the full product from products.ts with all price fields
        let product = productId ? products.find(p => p.id === productId) : null;
        
        // If not found, fallback to productDetails
        if (!product) {
          product = productDetails?.product || productDetails;
        } else {
          // Merge: Start with product from products.ts (has prices), then add fields from productDetails
          // But preserve price fields from products.ts to ensure they're not overwritten
          const productFromDetails = productDetails?.product || productDetails;
          product = {
            ...product,
            ...productFromDetails,
            // Ensure price fields from products.ts are preserved
            price: product.price ?? productFromDetails.price,
            resellerPrice: product.resellerPrice ?? productFromDetails.resellerPrice,
            siChannelPrice: product.siChannelPrice ?? productFromDetails.siChannelPrice,
            prices: product.prices ?? productFromDetails.prices
          };
        }

        // Build config from exactProductSpecs.displaySize (convert meters to mm)
        let config = editingQuotation.quotationData?.config;
        if (!config && exactSpecs?.displaySize) {
          config = {
            width: (exactSpecs.displaySize.width * 1000) || 0,
            height: (exactSpecs.displaySize.height * 1000) || 0,
            unit: 'mm'
          };
        } else if (!config) {
          // Fallback to quotationData or productDetails
          config = {
            width: productDetails?.width || productDetails?.displaySize?.width || 0,
            height: productDetails?.height || productDetails?.displaySize?.height || 0,
            unit: productDetails?.unit || 'mm'
          };
        }

        // Use exactProductSpecs first, then fallback to quotationData/productDetails
        const cabinetGrid = exactSpecs?.cabinetGrid || productDetails?.cabinetGrid || editingQuotation.quotationData?.cabinetGrid;
        const processor = exactSpecs?.processor || productDetails?.processor || editingQuotation.quotationData?.processor || null;
        const mode = exactSpecs?.mode || productDetails?.mode || editingQuotation.quotationData?.mode;

        return (
          <QuoteModal
            isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingQuotation(null);
            setEditingClientInfo(null);
          }}
            onSubmit={() => {

              fetchDashboardData(true);
              setIsEditModalOpen(false);
              setEditingQuotation(null);
              setEditingClientInfo(null);
            }}
            selectedProduct={product}
            config={config}
            cabinetGrid={cabinetGrid}
            processor={processor}
            mode={mode}
            userInfo={{
              userType: editingQuotation.userTypeDisplayName as any,
              // Prioritize client info from Client collection (most up-to-date)
              fullName: editingClientInfo?.name || customers.find(c => c.quotations.some(q => q.quotationId === editingQuotation.quotationId))?.customerName || '',
              email: editingClientInfo?.email || customers.find(c => c.quotations.some(q => q.quotationId === editingQuotation.quotationId))?.customerEmail || '',
              phoneNumber: editingClientInfo?.phone || customers.find(c => c.quotations.some(q => q.quotationId === editingQuotation.quotationId))?.customerPhone || '',
              // Use client info if available (from Client collection), otherwise fallback to quotationData.userInfo
              projectTitle: editingClientInfo?.projectTitle || editingQuotation.quotationData?.userInfo?.projectTitle || '',
              address: editingClientInfo?.location || editingQuotation.quotationData?.userInfo?.address || '',
              validity: editingQuotation.quotationData?.userInfo?.validity,
              paymentTerms: editingQuotation.quotationData?.userInfo?.paymentTerms,
              warranty: editingQuotation.quotationData?.userInfo?.warranty
            }}
            clientId={editingQuotation.clientId}
            salesUser={salesPerson ? {
              _id: salesPerson._id,
              name: salesPerson.name,
              email: salesPerson.email,
              role: salesPerson.role as 'sales' | 'super' | 'super_admin' | 'partner',
              location: salesPerson.location,
              contactNumber: salesPerson.contactNumber,
              allowedCustomerTypes: [] // Add missing required property
            } : null}
            userRole="sales"
            existingQuotation={{
              quotationId: editingQuotation.quotationId,
              customerName: customers.find(c => c.quotations.some(q => q.quotationId === editingQuotation.quotationId))?.customerName || '',
              customerEmail: customers.find(c => c.quotations.some(q => q.quotationId === editingQuotation.quotationId))?.customerEmail || '',
              customerPhone: customers.find(c => c.quotations.some(q => q.quotationId === editingQuotation.quotationId))?.customerPhone || '',
              message: editingQuotation.message || '',
              userType: (editingQuotation.userType === 'siChannel' ? 'SI/Channel Partner' : editingQuotation.userType === 'reseller' ? 'Reseller' : 'End User')
            }}
            customPricing={editingQuotation.quotationData?.customPricing}
          />
        );
      })()}
    </div>
  );
};

