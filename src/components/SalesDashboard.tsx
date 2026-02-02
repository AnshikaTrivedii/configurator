import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, FileText, Package, RefreshCw, LogOut, Plus, Eye, Edit, Search, Clock, MapPin, Trash2, UserCheck } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { clientAPI } from '../api/clients';
import { leadsAPI, Lead } from '../api/leads';
import { PdfViewModal } from './PdfViewModal';
import { QuoteModal } from './QuoteModal';
import { DeleteConfirmationModal } from './DeleteConfirmationModal';
import { LeadDetailsModal } from './LeadDetailsModal';
import { LeadStatusModal } from './LeadStatusModal';
import { generateConfigurationHtml } from '../utils/docxGenerator';
import { Quotation } from '../types';
import { products } from '../data/products';

interface SalesDashboardProps {
  onBack: () => void;
  onLogout: () => void;
  onEditQuotation?: (quotation: Quotation) => void;
  loggedInUser?: {
    role?: string;
    name?: string;
    email?: string;
    _id?: string;
  };
}

// Interfaces here...
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

export const SalesDashboard: React.FC<SalesDashboardProps> = ({ onBack, onLogout, onEditQuotation, loggedInUser }) => {
  const [salesPerson, setSalesPerson] = useState<SalesPerson | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [assignedLeads, setAssignedLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
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
  const [quotationToDelete, setQuotationToDelete] = useState<Quotation | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(null);

  // Leads Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetailLead, setSelectedDetailLead] = useState<Lead | null>(null);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [selectedStatusLead, setSelectedStatusLead] = useState<Lead | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Filter filtered customers based on search query
  const filteredCustomers = customers.filter(customer => {
    const query = searchQuery.toLowerCase();
    return (
      customer.customerName?.toLowerCase().includes(query) ||
      customer.customerEmail?.toLowerCase().includes(query) ||
      customer.customerPhone?.includes(query) ||
      customer.quotations.some(q => q.quotationId.toLowerCase().includes(query))
    );
  });

  useEffect(() => {

    fetchDashboardData();

  }, []);

  useEffect(() => {
    if (salesPerson && salesPerson._id) {
      fetchAssignedLeads(salesPerson._id);
    }
  }, [salesPerson]);

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

  const fetchAssignedLeads = async (salesPersonId: string) => {
    try {
      setLoadingLeads(true);
      // Pass salesPersonId to filter leads assigned to this user
      // Assuming getLeads supports filtering by assignedTo or we might need to update API
      // Based on previous implementation, getLeads might return all leads for admin.
      // Let's check leadsAPI.getLeads implementation. 
      // It calls axios.get(`${API_URL}/leads`, { params: { status, assignedTo } });
      // So passing assignedTo should work.
      const response = await leadsAPI.getLeads(undefined, salesPersonId);
      if (response.success) {
        setAssignedLeads(response.leads);
      }
    } catch (error) {
      console.error('Error fetching assigned leads:', error);
    } finally {
      setLoadingLeads(false);
    }
  };

  const openDetailModal = (lead: Lead) => {
    setSelectedDetailLead(lead);
    setDetailModalOpen(true);
  };

  const openStatusModal = (lead: Lead) => {
    setSelectedStatusLead(lead);
    setStatusModalOpen(true);
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
          // Use 'any' cast to handle various potential shapes of clientId from MongoDB/Mongoose
          const cId = quotation.clientId as any;

          if (typeof cId === 'string') {
            clientIdString = cId;
          } else if (cId?.$oid) {
            clientIdString = cId.$oid;
          } else if (cId?._id) {
            clientIdString = String(cId._id);
          } else if (typeof cId?.toString === 'function') {
            clientIdString = cId.toString();
          } else {
            clientIdString = String(cId);
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

  const handleDeleteQuotation = (quotation: Quotation) => {
    setQuotationToDelete(quotation);
    setIsDeleteModalOpen(true);
    setDeleteSuccessMessage(null);
    setDeleteErrorMessage(null);
  };

  const confirmDeleteQuotation = async () => {
    if (!quotationToDelete) return;

    try {
      setIsDeleting(true);
      setDeleteErrorMessage(null);

      await salesAPI.deleteQuotation(quotationToDelete.quotationId);

      // Show success message
      setDeleteSuccessMessage('Quotation deleted successfully');

      // Remove quotation from UI immediately
      setCustomers(prevCustomers => {
        return prevCustomers.map(customer => ({
          ...customer,
          quotations: customer.quotations.filter(
            q => q.quotationId !== quotationToDelete.quotationId
          )
        })).filter(customer => customer.quotations.length > 0); // Remove customers with no quotations
      });

      // Update totals
      setTotalQuotations(prev => Math.max(0, prev - 1));
      setTotalRevenue(prev => Math.max(0, prev - (quotationToDelete.totalPrice || 0)));

      // Close modal after a short delay
      setTimeout(() => {
        setIsDeleteModalOpen(false);
        setQuotationToDelete(null);
        setDeleteSuccessMessage(null);
      }, 1500);
    } catch (err: any) {
      console.error('Error deleting quotation:', err);
      setDeleteErrorMessage(err.message || 'Failed to delete quotation');
    } finally {
      setIsDeleting(false);
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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      {/* Modern Header with Gradient */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg relative overflow-hidden">
        {/* Abstract Background Design */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500 opacity-10 rounded-full blur-2xl transform -translate-x-1/4 translate-y-1/4"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="p-1.5 bg-blue-500/20 rounded-lg backdrop-blur-sm">
                  <Package size={20} className="text-blue-200" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Sales Dashboard</h1>
              </div>
              <p className="text-gray-300 text-sm flex items-center gap-2">
                Welcome back, <span className="text-white font-medium">{salesPerson?.name || 'Sales Partner'}</span>
                {lastRefreshTime && (
                  <span className="flex items-center gap-1 text-xs bg-black/20 px-2 py-0.5 rounded-full ml-2">
                    <Clock size={10} />
                    Updated {lastRefreshTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => fetchDashboardData(true)}
                className="px-4 py-2 bg-white/10 text-white text-sm font-medium rounded-lg hover:bg-white/20 transition-all flex items-center gap-2 backdrop-blur-sm border border-white/10"
                title="Refresh Data"
              >
                <RefreshCw size={16} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <button
                onClick={onBack}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20 active:transform active:scale-95"
              >
                <Plus size={18} />
                New Quotation
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-500/10 text-red-200 text-sm font-medium rounded-lg hover:bg-red-500/20 hover:text-red-100 transition-all flex items-center gap-2 border border-red-500/20"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Performance Stats Cards - Modern Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-indigo-50 rounded-lg">
              <FileText className="text-indigo-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Quotations</p>
              <p className="text-2xl font-bold text-gray-900">{totalQuotations}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-emerald-50 rounded-lg">
              <User className="text-emerald-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Active Customers</p>
              <p className="text-2xl font-bold text-gray-900">{totalCustomers}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className="p-3 bg-blue-50 rounded-lg">
              <MapPin className="text-blue-600" size={24} />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Your Location</p>
              <p className="text-lg font-bold text-gray-900 truncate max-w-[150px]" title={salesPerson?.location || 'N/A'}>
                {salesPerson?.location || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Leads Section - Moved to top */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <UserCheck size={20} className="text-gray-500" />
              Assigned Leads
            </h2>
            <button
              onClick={() => salesPerson && fetchAssignedLeads(salesPerson._id)}
              className="p-2 bg-white rounded-full hover:bg-gray-100 border border-gray-200 shadow-sm"
              title="Refresh Leads"
            >
              <RefreshCw className={`w-5 h-5 text-gray-500 ${loadingLeads ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="p-0">
            {assignedLeads.length === 0 ? (
              <div className="p-8 text-center bg-white flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                  <UserCheck className="text-gray-300" size={24} />
                </div>
                <p className="text-gray-500">No leads assigned to you yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product / Interest</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assignedLeads.map((lead) => (
                      <tr key={lead._id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{lead.name}</div>
                          {lead.company && <div className="text-xs text-gray-500">{lead.company}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center gap-1.5"><Mail size={14} className="text-gray-400" /> {lead.email}</div>
                          <div className="flex items-center gap-1.5 mt-1"><Phone size={14} className="text-gray-400" /> {lead.phone}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="font-medium text-gray-900">{lead.productName}</div>
                          {lead.location && <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5"><MapPin size={12} className="text-gray-400" /> {lead.location}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2.5 py-0.5 text-xs font-medium rounded-full ${lead.status === 'New' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            lead.status === 'Assigned' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                              lead.status === 'Contacted' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                lead.status === 'Converted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  'bg-gray-100 text-gray-800'
                            }`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(lead.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openDetailModal(lead)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => openStatusModal(lead)}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Change Status"
                            >
                              <Edit size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Dashboard Main Content */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <User size={20} className="text-gray-500" />
              Customers & Quotations
            </h2>

            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search customers, emails, or quotes..."
                className="pl-10 pr-4 py-2.5 w-full bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredCustomers.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="text-gray-400" size={24} />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No customers found</h3>
              <p className="text-gray-500 text-sm mb-6">
                {searchQuery ? `No results matching "${searchQuery}"` : "Get started by creating your first quotation."}
              </p>
              {!searchQuery && (
                <button
                  onClick={onBack}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus size={16} />
                  Create Quotation
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {filteredCustomers.map((customer, customerIndex) => (
                <div key={customerIndex} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Customer Header */}
                  <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-gray-900">{customer.customerName}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${customer.userType === 'reseller' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                          customer.userType === 'siChannel' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                            'bg-blue-50 text-blue-700 border-blue-100'
                          }`}>
                          {customer.userTypeDisplayName}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <Mail size={14} />
                          <span>{customer.customerEmail}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Phone size={14} />
                          <span>{customer.customerPhone}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Total Quotes</p>
                      <p className="text-xl font-bold text-gray-900">{customer.quotations.length}</p>
                    </div>
                  </div>

                  {/* Quotations Grid */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {customer.quotations.map((quotation, qIndex) => (
                        <div
                          key={qIndex}
                          className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm transition-all relative"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                #{quotation.quotationId.split('/').pop()}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDate(quotation.createdAt)}
                              </span>
                            </div>
                            <div className="flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditQuotation({
                                    ...quotation,
                                    customerName: customer.customerName,
                                    customerEmail: customer.customerEmail,
                                    customerPhone: customer.customerPhone,
                                    userType: customer.userType,
                                    userTypeDisplayName: customer.userTypeDisplayName
                                  });
                                }}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit Quote"
                              >
                                <Edit size={14} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteQuotation(quotation);
                                }}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                title="Delete Quote"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1" title={quotation.productName}>
                              {quotation.productName}
                            </h4>
                            <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-2">
                              {quotation.exactProductSpecs?.cabinetGrid && (
                                <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                  {quotation.exactProductSpecs.cabinetGrid.columns}x{quotation.exactProductSpecs.cabinetGrid.rows}
                                </span>
                              )}
                              {quotation.exactProductSpecs?.displaySize && (
                                <span className="flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                                  {quotation.exactProductSpecs.displaySize.width?.toFixed(2)}m x {quotation.exactProductSpecs.displaySize.height?.toFixed(2)}m
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 line-clamp-2 min-h-[2.5rem]">
                              {quotation.message || "No additional notes."}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-auto">
                            <p className="text-lg font-bold text-gray-900">
                              {formatCurrency(quotation.totalPrice)}
                            </p>
                            <button
                              onClick={() => handleViewPdf(quotation)}
                              className="px-3 py-1.5 bg-gray-900 text-white text-xs font-medium rounded-md hover:bg-black transition-colors flex items-center gap-1.5"
                            >
                              <Eye size={12} />
                              View PDF
                            </button>
                          </div>
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



      <LeadDetailsModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        lead={selectedDetailLead}
      />

      <LeadStatusModal
        isOpen={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        lead={selectedStatusLead}
        onStatusUpdated={() => salesPerson && fetchAssignedLeads(salesPerson._id)}
      />

      {/* PDF View Modal */}
      {selectedQuotation && (() => {
        // Get full product with prices from products.ts
        const productDetails = selectedQuotation.productDetails;
        const productId = productDetails?.productId || (productDetails as any)?.product?.id || productDetails?.id;
        let fullProduct = productId ? products.find(p => p.id === productId) : null;

        // If not found, fallback to productDetails
        if (!fullProduct) {
          fullProduct = (productDetails as any)?.product || productDetails;
          // Ensure id is set for PdfViewModal lookup
          if (fullProduct && !fullProduct.id && productId) {
            fullProduct = { ...fullProduct, id: productId };
          } else if (fullProduct && !fullProduct.id && (fullProduct as any).productId) {
            fullProduct = { ...fullProduct, id: (fullProduct as any).productId };
          }
        } else {
          // Merge: Start with product from products.ts (has prices), then add fields from productDetails
          // But preserve price fields from products.ts to ensure they're not overwritten
          const productFromDetails = (productDetails as any)?.product || productDetails;
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
            selectedProduct={fullProduct as any}
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
            clientId={selectedQuotation.clientId as string | undefined} // Fix type error here if clientId is object
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
        const productId = productDetails?.productId || (productDetails as any)?.product?.id || productDetails?.id;

        // Try to find the full product from products.ts with all price fields
        let product = productId ? products.find(p => p.id === productId) : null;

        // If not found, fallback to productDetails
        if (!product) {
          product = (productDetails as any)?.product || productDetails;
        } else {
          // Merge logic...
          const productFromDetails = (productDetails as any)?.product || productDetails;
          product = {
            ...product,
            ...productFromDetails,
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
            width: productDetails?.width || (productDetails as any)?.displaySize?.width || 0,
            height: productDetails?.height || (productDetails as any)?.displaySize?.height || 0,
            unit: productDetails?.unit || 'mm'
          };
        }

        // Use exactProductSpecs first, then fallback to quotationData/productDetails
        const cabinetGrid = exactSpecs?.cabinetGrid || productDetails?.cabinetGrid || editingQuotation.quotationData?.cabinetGrid;
        const processor = exactSpecs?.processor || productDetails?.processor || editingQuotation.quotationData?.processor || null;
        const mode = exactSpecs?.mode || productDetails?.mode || editingQuotation.quotationData?.mode;

        // Fix clientId type for QuoteModal
        let cleanClientId: string | undefined = undefined;
        if (editingQuotation.clientId) {
          const cId = editingQuotation.clientId as any;
          if (typeof cId === 'string') {
            cleanClientId = cId;
          } else if (cId?.$oid) {
            cleanClientId = cId.$oid;
          } else if (cId?._id) {
            cleanClientId = String(cId._id);
          } else if (typeof cId?.toString === 'function') {
            cleanClientId = cId.toString();
          }
        }

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
            selectedProduct={product || undefined}
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
            clientId={cleanClientId}
            salesUser={salesPerson ? {
              _id: salesPerson._id,
              name: salesPerson.name,
              email: salesPerson.email,
              role: salesPerson.role as 'sales' | 'super' | 'super_admin' | 'partner',
              location: salesPerson.location,
              contactNumber: salesPerson.contactNumber,
              allowedCustomerTypes: []
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

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setQuotationToDelete(null);
            setDeleteErrorMessage(null);
            setDeleteSuccessMessage(null);
          }
        }}
        onConfirm={confirmDeleteQuotation}
        title="Delete Quotation"
        message={quotationToDelete
          ? `Are you sure you want to delete quotation "${quotationToDelete.quotationId}"? This action cannot be undone.`
          : 'Are you sure you want to delete this quotation? This action cannot be undone.'
        }
        loading={isDeleting}
      />

      {/* Success/Error Messages */}
      {deleteSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>{deleteSuccessMessage}</span>
        </div>
      )}
      {deleteErrorMessage && (
        <div className="fixed top-4 right-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2">
          <span>{deleteErrorMessage}</span>
          <button
            onClick={() => setDeleteErrorMessage(null)}
            className="text-red-600 hover:text-red-800"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

