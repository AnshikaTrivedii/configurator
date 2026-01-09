import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, FileText, Package, Calendar, RefreshCw, LogOut, MessageSquare, ArrowLeft, Eye } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { PdfViewModal } from './PdfViewModal';
import { generateConfigurationHtml } from '../utils/docxGenerator';

interface SalesPerson {
  _id: string;
  name: string;
  email: string;
  location: string;
  contactNumber: string;
  role: string;
}

interface Quotation {
  quotationId: string;
  productName: string;
  productDetails: any;
  totalPrice: number;
  message: string;
  userType: string;
  userTypeDisplayName: string;
  createdAt: string;
  pdfPage6HTML?: string | null;
  exactPricingBreakdown?: any;
  exactProductSpecs?: any;
  quotationData?: any;
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
  loggedInUser?: {
    role?: string;
    name?: string;
    email?: string;
  };
}

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ onBack, onLogout, loggedInUser }) => {
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

  useEffect(() => {
    console.log('🎯 SalesDashboard mounted, fetching data...');
    fetchDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing sales dashboard data...');
      fetchDashboardData();
    }, 30000);
    
    return () => {
      console.log('🎯 SalesDashboard unmounting, clearing interval...');
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Fetching sales dashboard data...', forceRefresh ? '(FORCE REFRESH)' : '');
      console.log('🔑 Auth token present:', !!localStorage.getItem('salesToken'));
      
      const response = await salesAPI.getMyDashboard();
      console.log('📊 Sales Dashboard API response:', response);
      
      if (!response || !response.success) {
        throw new Error(response?.message || 'Invalid response from server');
      }
      
      setSalesPerson(response.salesPerson);
      setCustomers(response.customers || []);
      setTotalQuotations(response.totalQuotations || 0);
      setTotalCustomers(response.totalCustomers || 0);
      setTotalRevenue(response.totalRevenue || 0);
      setLastRefreshTime(new Date());
    } catch (err: any) {
      console.error('❌ Error fetching sales dashboard data:', err);
      console.error('❌ Error details:', JSON.stringify(err, null, 2));
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
      
      // If PDF HTML is stored, use it directly
      if (quotation.pdfPage6HTML) {
        setPdfHtmlContent(quotation.pdfPage6HTML);
        setIsPdfModalOpen(true);
        return;
      }

      // Otherwise, try to regenerate PDF from stored data
      // CRITICAL: Use exactPricingBreakdown and exactProductSpecs to ensure exact match
      if (quotation.exactPricingBreakdown && quotation.exactProductSpecs) {
        const productDetails = quotation.productDetails;
        const exactSpecs = quotation.exactProductSpecs;
        
        // Extract necessary data for PDF generation - use stored specs first
        const product = productDetails?.product || productDetails;
        
        // Use stored config from quotationData if available, otherwise extract from productDetails
        let config = quotation.quotationData?.config;
        if (!config && exactSpecs.displaySize) {
          // Convert display size from meters to mm
          config = {
            width: (exactSpecs.displaySize.width * 1000) || 0,
            height: (exactSpecs.displaySize.height * 1000) || 0,
            unit: 'mm'
          };
        } else if (!config) {
          // Fallback to productDetails
          config = {
            width: productDetails?.width || productDetails?.displaySize?.width || 0,
            height: productDetails?.height || productDetails?.displaySize?.height || 0,
            unit: productDetails?.unit || 'mm'
          };
        }
        
        // Use stored specs for cabinetGrid and processor
        const cabinetGrid = exactSpecs.cabinetGrid || productDetails?.cabinetGrid;
        const processor = exactSpecs.processor || productDetails?.processor || null;
        const mode = exactSpecs.mode || productDetails?.mode || undefined;
        
        // Find customer info for userInfo
        const customer = customers.find(c => 
          c.quotations.some(q => q.quotationId === quotation.quotationId)
        );
        
        // Map userType to the format expected by generateConfigurationHtml
        let userTypeForHtml = 'End User';
        if (quotation.userType === 'siChannel') {
          userTypeForHtml = 'SI/Channel Partner';
        } else if (quotation.userType === 'reseller') {
          userTypeForHtml = 'Reseller';
        }
        
        const userInfo = {
          userType: userTypeForHtml,
          fullName: customer?.customerName || '',
          email: customer?.customerEmail || '',
          phoneNumber: customer?.customerPhone || ''
        };
        
        // Generate HTML content using EXACT stored pricing breakdown
        // This ensures prices match exactly what was saved
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
      console.error('Error viewing PDF:', error);
      alert('Failed to load PDF. Please try again or contact support.');
    }
  };

  const handleDownloadPdf = async () => {
    if (!selectedQuotation || !pdfHtmlContent) return;
    
    try {
      // Import html2pdf dynamically
      const html2pdf = (await import('html2pdf.js')).default;
      
      // Create a temporary container for the HTML
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
      
      // Cleanup
      document.body.removeChild(element);
    } catch (error) {
      console.error('Error downloading PDF:', error);
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
                className="px-3 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                title="Back to Configurator"
              >
                <ArrowLeft size={16} />
                Back
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
      {selectedQuotation && (
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
          selectedProduct={selectedQuotation.productDetails?.product || selectedQuotation.productDetails}
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
        />
      )}
    </div>
  );
};

