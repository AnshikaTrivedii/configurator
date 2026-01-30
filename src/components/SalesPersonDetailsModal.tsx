import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Calendar, FileText, DollarSign, Package, Clock, MessageSquare, RefreshCw, Percent, Trash2 } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { PdfViewModal } from './PdfViewModal';
import { generateConfigurationHtml, generateConfigurationPdf } from '../utils/docxGenerator';
import { applyDiscount, DiscountInfo } from '../utils/discountCalculator';
import { calculateCentralizedPricing } from '../utils/centralizedPricing';
import { Save as SaveIcon } from 'lucide-react';

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
  originalTotalPrice?: number;
  message: string;
  createdAt: string;
  pdfS3Key?: string | null;
  pdfS3Url?: string | null;
  userType?: string;
  userTypeDisplayName?: string;

  exactPricingBreakdown?: {
    unitPrice: number;
    quantity: number;
    subtotal: number;
    gstRate: number;
    gstAmount: number;
    processorPrice: number;
    processorGst: number;
    grandTotal: number;
  };
  exactProductSpecs?: {
    productName: string;
    category: string;
    pixelPitch: number;
    resolution: any;
    cabinetDimensions: any;
    displaySize: any;
    aspectRatio: string;
    processor: string;
    mode: string;
    cabinetGrid: any;
  };
  quotationData?: any;
  originalPricingBreakdown?: any;
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
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfHtmlContent, setPdfHtmlContent] = useState<string>('');

  const [editingDiscountQuotationId, setEditingDiscountQuotationId] = useState<string | null>(null);
  const [discountType, setDiscountType] = useState<'led' | 'controller' | 'total' | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [isUpdatingDiscount, setIsUpdatingDiscount] = useState(false);

  useEffect(() => {
    if (isOpen && salesPersonId) {
      fetchSalesPersonDetails();
    }
  }, [isOpen, salesPersonId]);

  const fetchSalesPersonDetails = async () => {
    if (!salesPersonId) return;

    try {
      setLoading(true);
      setError(null);

      const response = await salesAPI.getSalesPersonDetails(salesPersonId + '?t=' + Date.now());

      const allQuotationIds: string[] = [];
      const allQuotationPrices: number[] = [];

      response.customers?.forEach((customer, custIndex) => {

        customer.quotations?.forEach((quotation: Quotation, qIndex: number) => {
          allQuotationIds.push(quotation.quotationId);
          allQuotationPrices.push(quotation.totalPrice);

        });
      });

      const uniqueIds = [...new Set(allQuotationIds)];
      if (allQuotationIds.length === uniqueIds.length) {

      } else {

        const duplicates = allQuotationIds.filter((id, index) => allQuotationIds.indexOf(id) !== index);

      }

      const uniquePrices = [...new Set(allQuotationPrices)];

      setSalesPerson(response.salesPerson);
      setCustomers(response.customers);
      setTotalQuotations(response.totalQuotations);
      setTotalCustomers(response.totalCustomers);
    } catch (err) {

      setError('Failed to load sales person details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPdf = async (quotation: Quotation) => {
    try {
      setSelectedQuotation(quotation);

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
        }

        const cabinetGrid = exactSpecs.cabinetGrid || productDetails?.cabinetGrid;
        const processor = exactSpecs.processor || productDetails?.processor || null;
        const mode = exactSpecs.mode || productDetails?.mode || undefined;

        const customer = customers.find(c =>
          c.quotations.some(q => q.quotationId === quotation.quotationId)
        );

        let userTypeForHtml = 'End User';
        if (quotation.userType === 'siChannel') {
          userTypeForHtml = 'SI/Channel Partner';
        } else if (quotation.userType === 'reseller') {
          userTypeForHtml = 'Reseller';
        }

        const userInfo = {
          userType: userTypeForHtml as any,
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
          undefined,
          quotation.exactPricingBreakdown
        );

        setPdfHtmlContent(htmlContent);
        setIsPdfModalOpen(true);
        return;
      }

      if (quotation.productDetails?.pdfPage6HTML) {

        setPdfHtmlContent(quotation.productDetails.pdfPage6HTML);
        setIsPdfModalOpen(true);
        return;
      }

      alert('PDF data not available for this quotation.');

    } catch (error) {

      alert('Failed to load PDF. Please try again.');
    }
  };

  const handleApplyDiscount = async (quotation: Quotation) => {
    if (!discountType || discountPercent < 0) {
      alert('Please select a discount type and enter a valid percentage >= 0');
      return;
    }

    try {
      setIsUpdatingDiscount(true);

      let finalPricingResult: any = null;

      const productDetails = quotation.productDetails;
      const exactSpecs = (quotation.exactProductSpecs || {}) as any;
      const product = productDetails?.product || productDetails;

      let config = quotation.quotationData?.config;

      if (!config && exactSpecs?.displaySize) {
        config = {
          width: (exactSpecs.displaySize.width * 1000) || 0,
          height: (exactSpecs.displaySize.height * 1000) || 0,
          unit: 'mm'
        };
      }

      if (!config && productDetails?.displaySize) {
        config = {
          width: (productDetails.displaySize.width * 1000) || 0,
          height: (productDetails.displaySize.height * 1000) || 0,
          unit: 'mm'
        };
      }

      let isRestoredFromOriginalBreakdown = false;
      if (quotation.originalPricingBreakdown) {

        isRestoredFromOriginalBreakdown = true;
        const ob = quotation.originalPricingBreakdown;

        finalPricingResult = {
          unitPrice: ob.unitPrice || 0,
          quantity: ob.quantity || 0,
          productSubtotal: ob.productSubtotal || ob.subtotal || 0,
          productGST: ob.productGST || ob.gstAmount || 0,
          productTotal: (ob.productSubtotal || ob.subtotal || 0) + (ob.productGST || ob.gstAmount || 0),

          processorPrice: ob.processorPrice || 0,
          processorGST: ob.processorGST || ob.processorGst || 0,
          processorTotal: (ob.processorPrice || 0) + (ob.processorGST || ob.processorGst || 0),

          structureCost: ob.structureCost || 0,
          structureGST: ob.structureGST || 0,
          structureTotal: ob.structureTotal || 0,

          installationCost: ob.installationCost || 0,
          installationGST: ob.installationGST || 0,
          installationTotal: ob.installationTotal || 0,

          grandTotal: ob.grandTotal || 0,

          userType: quotation.userTypeDisplayName || 'End User',
          productName: quotation.productName || 'Unknown Product',
          isAvailable: true
        };
      }

      else if (quotation.exactPricingBreakdown && !quotation.quotationData?.discountApplied) {

        const eb = quotation.exactPricingBreakdown as any;

        finalPricingResult = {
          unitPrice: eb.unitPrice || 0,
          quantity: eb.quantity || 0,
          productSubtotal: eb.productSubtotal || eb.subtotal || 0,
          productGST: eb.productGST || eb.gstAmount || 0,
          productTotal: (eb.productSubtotal || eb.subtotal || 0) + (eb.productGST || eb.gstAmount || 0),

          processorPrice: eb.processorPrice || 0,
          processorGST: eb.processorGST || eb.processorGst || 0,
          processorTotal: (eb.processorPrice || 0) + (eb.processorGST || eb.processorGst || 0),

          structureCost: eb.structureCost || 0,
          structureGST: eb.structureGST || 0,
          structureTotal: eb.structureTotal || 0,

          installationCost: eb.installationCost || 0,
          installationGST: eb.installationGST || 0,
          installationTotal: eb.installationTotal || 0,

          grandTotal: eb.grandTotal || 0,

          originalProductTotal: undefined,
          originalProcessorTotal: undefined,
          originalGrandTotal: undefined,

          userType: quotation.userTypeDisplayName || 'End User',
          productName: quotation.productName || 'Unknown Product',
          isAvailable: true
        };
      }

      if (!finalPricingResult && product && config) {

        const userType = quotation.userTypeDisplayName === 'Reseller' ? 'reseller' : (quotation.userTypeDisplayName === 'SI/Channel Partner' ? 'siChannel' : 'endUser');
        const cabinetGrid = exactSpecs.cabinetGrid || productDetails?.cabinetGrid;
        const processor = exactSpecs.processor || productDetails?.processor || null;
        const customPricing = quotation.quotationData?.customPricing;

        const pricingResult = calculateCentralizedPricing(
          product,
          cabinetGrid,
          processor,
          userType,
          config,
          customPricing
        );

        if (pricingResult.isAvailable) {

          finalPricingResult = pricingResult;
        }
      }

      if (!finalPricingResult && quotation.exactPricingBreakdown && quotation.quotationData?.discountApplied) {

        const eb = quotation.exactPricingBreakdown as any;
        const di = quotation.quotationData.discountInfo;
        const discountAmount = di?.amount || 0;
        const discountType = di?.type;

        finalPricingResult = {
          unitPrice: eb.unitPrice || 0,
          quantity: eb.quantity || 0,
          productSubtotal: eb.productSubtotal || eb.subtotal || 0,
          productGST: eb.productGST || eb.gstAmount || 0,
          productTotal: (eb.productSubtotal || eb.subtotal || 0) + (eb.productGST || eb.gstAmount || 0),

          processorPrice: eb.processorPrice || 0,
          processorGST: eb.processorGST || eb.processorGst || 0,
          processorTotal: (eb.processorPrice || 0) + (eb.processorGST || eb.processorGst || 0),

          structureCost: eb.structureCost || 0,
          structureGST: eb.structureGST || 0,
          structureTotal: eb.structureTotal || 0,

          installationCost: eb.installationCost || 0,
          installationGST: eb.installationGST || 0,
          installationTotal: eb.installationTotal || 0,

          grandTotal: eb.grandTotal || 0,

          userType: quotation.userTypeDisplayName || 'End User',
          productName: quotation.productName || 'Unknown Product',
          isAvailable: true
        };

        if (discountAmount > 0 && discountType) {

          finalPricingResult.grandTotal += discountAmount;

          if (discountType === 'led') {

            finalPricingResult.productTotal += discountAmount;
            finalPricingResult.productSubtotal += discountAmount; // Approximation
          } else if (discountType === 'controller') {
            finalPricingResult.processorTotal += discountAmount;
            finalPricingResult.processorPrice += discountAmount; // Approximation
          }
        }
      }

      if (finalPricingResult && !isRestoredFromOriginalBreakdown) {

        let restoredGrandTotal = 0;
        let restoreInfoFromDiscountData = false;

        if (quotation.originalTotalPrice && quotation.originalTotalPrice > 0) {

          restoredGrandTotal = quotation.originalTotalPrice;
          (finalPricingResult as any).originalGrandTotal = restoredGrandTotal;
          finalPricingResult.grandTotal = restoredGrandTotal; // RESET grandTotal to original

          if (quotation.quotationData?.discountApplied && quotation.quotationData.discountInfo) {
            restoreInfoFromDiscountData = true;
          }
        } else if (quotation.quotationData?.discountApplied && quotation.quotationData.discountInfo) {
          restoreInfoFromDiscountData = true;
        }

        if (restoreInfoFromDiscountData && quotation.quotationData?.discountInfo) {
          const di = quotation.quotationData.discountInfo;
          const amount = di.amount || 0;
          const type = di.type;

          if (!restoredGrandTotal) {
            restoredGrandTotal = (finalPricingResult.grandTotal || 0) + amount;
            (finalPricingResult as any).originalGrandTotal = restoredGrandTotal;
            finalPricingResult.grandTotal = restoredGrandTotal;
          }

          if (type === 'led') {
            const originalProduct = (finalPricingResult.productTotal || 0) + amount;
            (finalPricingResult as any).originalProductTotal = originalProduct;
            finalPricingResult.productTotal = originalProduct; // RESET productTotal
          } else if (type === 'controller') {
            const originalProcessor = (finalPricingResult.processorTotal || 0) + amount;
            (finalPricingResult as any).originalProcessorTotal = originalProcessor;
            finalPricingResult.processorTotal = originalProcessor; // RESET processorTotal
          } else if (type === 'total') {
            (finalPricingResult as any).originalProductTotal = finalPricingResult.productTotal;
            (finalPricingResult as any).originalProcessorTotal = finalPricingResult.processorTotal;
          }
        }
      }

      if (!finalPricingResult) {
        throw new Error("Could not calculate base pricing. Missing configuration data and valid breakdown.");
      }

      let newOriginalPricingBreakdown = quotation.originalPricingBreakdown;

      if (!newOriginalPricingBreakdown) {

        newOriginalPricingBreakdown = {
          unitPrice: finalPricingResult.unitPrice,
          quantity: finalPricingResult.quantity,
          subtotal: finalPricingResult.productSubtotal,
          gstAmount: finalPricingResult.productGST,
          processorPrice: finalPricingResult.processorPrice,
          processorGst: finalPricingResult.processorGST,
          structureCost: finalPricingResult.structureCost,
          structureGST: finalPricingResult.structureGST,
          structureTotal: finalPricingResult.structureTotal,
          installationCost: finalPricingResult.installationCost,
          installationGST: finalPricingResult.installationGST,
          installationTotal: finalPricingResult.installationTotal,
          grandTotal: finalPricingResult.grandTotal
        };

      }

      const discountInfo: DiscountInfo = {
        discountType,
        discountPercent
      };

      const discountedPricing = applyDiscount(finalPricingResult, discountInfo);

      const newExactPricingBreakdown = {
        unitPrice: discountedPricing.unitPrice,
        quantity: discountedPricing.quantity,
        subtotal: discountedPricing.productSubtotal,
        gstAmount: discountedPricing.productGST,
        gstRate: 18,
        processorPrice: discountedPricing.processorPrice,
        processorGst: discountedPricing.processorGST,
        grandTotal: discountedPricing.grandTotal,
        discount: {
          discountedProductTotal: discountedPricing.discountedProductTotal,
          discountedProcessorTotal: discountedPricing.discountedProcessorTotal,
          discountedGrandTotal: discountedPricing.grandTotal
        }
      };

      let userTypeForHtml = 'End User';
      if (quotation.userType === 'siChannel') {
        userTypeForHtml = 'SI/Channel Partner';
      } else if (quotation.userType === 'reseller') {
        userTypeForHtml = 'Reseller';
      }

      const customer = customers.find(c =>
        c.quotations.some(q => q.quotationId === quotation.quotationId)
      );

      const userInfo = {
        userType: userTypeForHtml as any,
        fullName: customer?.customerName || '',
        email: customer?.customerEmail || '',
        phoneNumber: customer?.customerPhone || ''
      };

      const pdfBlob = await generateConfigurationPdf(
        config,
        product,
        exactSpecs.cabinetGrid || productDetails?.cabinetGrid,
        exactSpecs.processor || productDetails?.processor || null,
        exactSpecs.mode || productDetails?.mode || undefined,
        userInfo,
        salesPerson ? {
          email: salesPerson.email,
          name: salesPerson.name,
          contactNumber: salesPerson.contactNumber,
          location: salesPerson.location
        } : null,
        quotation.quotationId,
        quotation.quotationData?.customPricing,
        newExactPricingBreakdown
      );

      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      const updateData = {
        totalPrice: discountedPricing.grandTotal,
        originalTotalPrice: discountedPricing.originalGrandTotal,
        exactPricingBreakdown: newExactPricingBreakdown,
        originalPricingBreakdown: newOriginalPricingBreakdown, // SAVE THE SOURCE OF TRUTH
        pdfBase64: pdfBase64,
        quotationData: {
          ...quotation.quotationData,
          updatedAt: new Date().toISOString(),
          discountApplied: discountPercent > 0,
          discountInfo: {
            type: discountType,
            percent: discountPercent,
            amount: discountedPricing.discountAmount
          }
        }
      };

      const result = await salesAPI.updateQuotation(quotation.quotationId, updateData);

      setEditingDiscountQuotationId(null);
      setDiscountType(null);
      setDiscountPercent(0);

      fetchSalesPersonDetails();

    } catch (error: any) {

      alert(`Failed to update discount: ${error.message}`);
    } finally {
      setIsUpdatingDiscount(false);
    }
  };

  const handleDeleteQuotation = async (quotationId: string) => {

    if (loggedInUser?.role !== 'super' && loggedInUser?.role !== 'super_admin') {
      alert('Only super admins can delete quotations.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this quotation? This action cannot be undone.')) {
      return;
    }

    try {
      await salesAPI.deleteQuotation(quotationId);

      fetchSalesPersonDetails();
    } catch (error: any) {

      alert(`Failed to delete quotation: ${error.message}`);
    }
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
                      <div key={`customer-${customer.customerEmail}-${customerIndex}`} className="border border-gray-200 rounded-lg p-6">
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
                            {customer.quotations.map((quotation, quotationIndex) => {

                              return (
                                <div key={quotation.quotationId} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                  {/* Header with Product */}
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center space-x-3">
                                      <Package className="w-5 h-5 text-blue-600" />
                                      <div>
                                        <p className="font-semibold text-gray-900 text-lg">{quotation.productName}</p>
                                        <p className="text-sm text-gray-600">Quotation ID: {quotation.quotationId}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={() => handleViewPdf(quotation)}
                                        className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-blue-600 transition-colors"
                                        title="View/Download PDF"
                                      >
                                        <FileText className="w-4 h-4" />
                                        <span>View PDF</span>
                                      </button>

                                      {/* Delete Button - Super Admin Only */}
                                      {(loggedInUser?.role === 'super' || loggedInUser?.role === 'super_admin') && (
                                        <button
                                          onClick={() => handleDeleteQuotation(quotation.quotationId)}
                                          className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                                          title="Delete Quotation"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span>Delete</span>
                                        </button>
                                      )}
                                    </div>
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

                                              const actualPrice = quotation.totalPrice || 0;
                                              const userTypeDisplayName = quotation.userTypeDisplayName || 'End User';

                                              return (
                                                <div>
                                                  <span className="font-semibold text-green-600 text-lg">
                                                    ₹{actualPrice.toLocaleString('en-IN')}
                                                  </span>
                                                  <div className="text-xs text-blue-600">
                                                    {userTypeDisplayName} Pricing
                                                  </div>
                                                  <div className="text-xs text-gray-500">
                                                    (Incl. 18% GST - From DB)
                                                  </div>
                                                </div>
                                              );
                                            })()}
                                          </div>
                                        </div>

                                        {/* Display exact pricing breakdown if available */}
                                        {quotation.exactPricingBreakdown && (
                                          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                              📊 Exact Pricing Breakdown (As Shown on Page):
                                            </div>
                                            <div className="space-y-1 text-xs">
                                              <div className="flex justify-between">
                                                <span>Unit Price:</span>
                                                <span>₹{quotation.exactPricingBreakdown.unitPrice?.toLocaleString('en-IN')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Quantity:</span>
                                                <span>{quotation.exactPricingBreakdown.quantity}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Subtotal:</span>
                                                <span>₹{quotation.exactPricingBreakdown.subtotal?.toLocaleString('en-IN')}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>GST ({quotation.exactPricingBreakdown.gstRate}%):</span>
                                                <span>₹{quotation.exactPricingBreakdown.gstAmount?.toLocaleString('en-IN')}</span>
                                              </div>
                                              {quotation.exactPricingBreakdown.processorPrice > 0 && (
                                                <>
                                                  <div className="flex justify-between">
                                                    <span>Processor:</span>
                                                    <span>₹{quotation.exactPricingBreakdown.processorPrice?.toLocaleString('en-IN')}</span>
                                                  </div>
                                                  <div className="flex justify-between">
                                                    <span>Processor GST:</span>
                                                    <span>₹{quotation.exactPricingBreakdown.processorGst?.toLocaleString('en-IN')}</span>
                                                  </div>
                                                </>
                                              )}
                                              <div className="flex justify-between font-semibold border-t pt-1">
                                                <span>Grand Total:</span>
                                                <span className="text-green-600">₹{quotation.exactPricingBreakdown.grandTotal?.toLocaleString('en-IN')}</span>
                                              </div>
                                              {/* Show discount info if present */}
                                              {quotation.quotationData?.discountApplied && (
                                                <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
                                                  <div className="flex justify-between text-green-600">
                                                    <span>Discount ({quotation.quotationData.discountInfo?.percent}%):</span>
                                                    <span>-₹{quotation.quotationData.discountInfo?.amount?.toLocaleString('en-IN')}</span>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}

                                        {/* Super Admin Discount Controls */}
                                        {(() => {
                                          const hasPermission = loggedInUser?.role === 'super' || loggedInUser?.role === 'super_admin';

                                          return hasPermission;
                                        })() && (
                                            <div className="mt-4 pt-3 border-t border-gray-200">
                                              {editingDiscountQuotationId === quotation.quotationId ? (
                                                <div className="bg-blue-50 p-3 rounded-md animate-fadeIn">
                                                  <div className="flex items-center justify-between mb-2">
                                                    <span className="text-xs font-bold text-blue-700 uppercase tracking-wide">Apply Discount</span>
                                                    <button
                                                      onClick={() => setEditingDiscountQuotationId(null)}
                                                      className="text-gray-400 hover:text-gray-600"
                                                    >
                                                      <X className="w-4 h-4" />
                                                    </button>
                                                  </div>
                                                  <div className="space-y-3">
                                                    <div>
                                                      <label className="text-xs text-gray-600 block mb-1">Discount Type</label>
                                                      <select
                                                        value={discountType || ''}
                                                        onChange={(e) => setDiscountType(e.target.value as any)}
                                                        className="w-full text-xs border border-gray-300 rounded p-1.5 bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                      >
                                                        <option value="">Select Type</option>
                                                        <option value="led">LED Screen Price</option>
                                                        <option value="controller">Controller Price</option>
                                                        <option value="total">Grand Total</option>
                                                      </select>
                                                    </div>
                                                    <div>
                                                      <label className="text-xs text-gray-600 block mb-1">Percentage (%)</label>
                                                      <div className="flex items-center space-x-2">
                                                        <input
                                                          type="number"
                                                          min="0"
                                                          max="100"
                                                          step="0.1"
                                                          value={discountPercent}
                                                          onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 0)}
                                                          className="flex-1 text-xs border border-gray-300 rounded p-1.5 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                                          placeholder="0-100"
                                                        />
                                                        <button
                                                          onClick={() => handleApplyDiscount(quotation)}
                                                          disabled={isUpdatingDiscount || !discountType || discountPercent < 0}
                                                          className="bg-blue-600 text-white min-w-[32px] h-[32px] flex items-center justify-center rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                                          title="Apply Discount"
                                                        >
                                                          {isUpdatingDiscount ? (
                                                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                          ) : (
                                                            <SaveIcon className="w-4 h-4" />
                                                          )}
                                                        </button>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              ) : (
                                                <button
                                                  onClick={() => {
                                                    setEditingDiscountQuotationId(quotation.quotationId);

                                                    if (quotation.quotationData?.discountApplied) {
                                                      setDiscountType(quotation.quotationData.discountInfo?.type || null);
                                                      setDiscountPercent(quotation.quotationData.discountInfo?.percent || 0);
                                                    } else {
                                                      setDiscountType(null);
                                                      setDiscountPercent(0);
                                                    }
                                                  }}
                                                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 rounded-md border border-indigo-200 transition-all shadow-sm text-xs font-semibold"
                                                >
                                                  <Percent className="w-3.5 h-3.5" />
                                                  {quotation.quotationData?.discountApplied ? 'Edit Discount' : 'Add Discount'}
                                                </button>
                                              )}
                                            </div>
                                          )}

                                        {/* Display exact product specs if available */}
                                        {quotation.exactProductSpecs && (
                                          <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                              📋 Exact Product Specs (As Shown on Page):
                                            </div>
                                            <div className="space-y-1 text-xs">
                                              <div className="flex justify-between">
                                                <span>Product:</span>
                                                <span>{quotation.exactProductSpecs.productName}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Category:</span>
                                                <span>{quotation.exactProductSpecs.category}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                <span>Pixel Pitch:</span>
                                                <span>P{quotation.exactProductSpecs.pixelPitch}</span>
                                              </div>
                                              {quotation.exactProductSpecs.displaySize && (
                                                <div className="flex justify-between">
                                                  <span>Display Size:</span>
                                                  <span>{quotation.exactProductSpecs.displaySize.width}m × {quotation.exactProductSpecs.displaySize.height}m</span>
                                                </div>
                                              )}
                                              {quotation.exactProductSpecs.aspectRatio && (
                                                <div className="flex justify-between">
                                                  <span>Aspect Ratio:</span>
                                                  <span>{quotation.exactProductSpecs.aspectRatio}</span>
                                                </div>
                                              )}
                                              {quotation.exactProductSpecs.processor && (
                                                <div className="flex justify-between">
                                                  <span>Processor:</span>
                                                  <span>{quotation.exactProductSpecs.processor}</span>
                                                </div>
                                              )}
                                              {quotation.exactProductSpecs.cabinetGrid && (
                                                <div className="flex justify-between">
                                                  <span>Cabinet Grid:</span>
                                                  <span>{quotation.exactProductSpecs.cabinetGrid.columns}×{quotation.exactProductSpecs.cabinetGrid.rows}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        )}
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
                              );
                            })}
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
          onDownload={() => {

            if (selectedQuotation.pdfS3Key) {
              salesAPI.getQuotationPdfUrl(selectedQuotation.quotationId)
                .then(response => {
                  const link = document.createElement('a');
                  link.href = response.pdfS3Url;
                  link.download = `${selectedQuotation.quotationId}.pdf`;
                  link.click();
                });
            }
          }}
          fileName={`${selectedQuotation.quotationId}.pdf`}
          selectedProduct={selectedQuotation.productDetails?.product || selectedQuotation.productDetails}
          config={
            selectedQuotation.quotationData?.config ||
            (selectedQuotation.exactProductSpecs?.displaySize ? {
              width: (selectedQuotation.exactProductSpecs.displaySize.width * 1000),
              height: (selectedQuotation.exactProductSpecs.displaySize.height * 1000),
              unit: 'mm'
            } : undefined)
          }
          cabinetGrid={
            selectedQuotation.exactProductSpecs?.cabinetGrid ||
            selectedQuotation.productDetails?.cabinetGrid ||
            selectedQuotation.quotationData?.cabinetGrid
          }
          processor={selectedQuotation.exactProductSpecs?.processor || selectedQuotation.productDetails?.processor || selectedQuotation.quotationData?.processor || null}
          customPricing={selectedQuotation.quotationData?.customPricing}
          userInfo={{
            userType: customers.find(c => c.quotations.some(q => q.quotationId === selectedQuotation.quotationId))?.userTypeDisplayName || 'End User',
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
          userRole="super"
          quotationId={selectedQuotation.quotationId}
        />
      )}
    </div>
  );
};
