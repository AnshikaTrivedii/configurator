import React, { useState } from 'react';
import { X, Download, Save } from 'lucide-react';
import { salesAPI } from '../api/sales';
import QuotationIdGenerator from '../utils/quotationIdGenerator';

// Calculate correct total price with GST - same logic as QuoteModal
function calculateCorrectTotalPrice(
  product: any,
  cabinetGrid: { columns: number; rows: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string }
): number {
  const METERS_TO_FEET = 3.28084;
  
  // Determine user type for pricing
  let pdfUserType = 'End User';
  if (userType === 'reseller') {
    pdfUserType = 'Reseller';
  } else if (userType === 'siChannel') {
    pdfUserType = 'Channel';
  }
  
  // Get unit price based on user type
  let unitPrice = product.price || 0;
  if (pdfUserType === 'Reseller' && product.resellerPrice) {
    unitPrice = product.resellerPrice;
  } else if (pdfUserType === 'Channel' && product.siChannelPrice) {
    unitPrice = product.siChannelPrice;
  }
  
  // Calculate quantity - SAME AS PDF LOGIC
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const quantity = widthInFeet * heightInFeet;
  
  // Calculate subtotal
  const subtotal = unitPrice * quantity;
  
  // Get processor price based on user type
  let processorPrice = 0;
  if (processor) {
    const processorPrices: Record<string, { endUser: number; reseller: number; channel: number }> = {
      'TB2': { endUser: 15000, reseller: 12000, channel: 10000 },
      'TB40': { endUser: 25000, reseller: 20000, channel: 17000 },
      'TB60': { endUser: 35000, reseller: 28000, channel: 24000 },
      'VX1': { endUser: 20000, reseller: 16000, channel: 14000 },
      'VX400': { endUser: 30000, reseller: 24000, channel: 21000 },
      'VX400 Pro': { endUser: 35000, reseller: 28000, channel: 24000 },
      'VX600': { endUser: 45000, reseller: 36000, channel: 31000 },
      'VX600 Pro': { endUser: 50000, reseller: 40000, channel: 34000 },
      'VX1000': { endUser: 65000, reseller: 52000, channel: 44000 },
      'VX1000 Pro': { endUser: 70000, reseller: 56000, channel: 48000 },
      '4K PRIME': { endUser: 100000, reseller: 80000, channel: 68000 }
    };
    
    const procPricing = processorPrices[processor];
    if (procPricing) {
      if (pdfUserType === 'Reseller') {
        processorPrice = procPricing.reseller;
      } else if (pdfUserType === 'Channel') {
        processorPrice = procPricing.channel;
      } else {
        processorPrice = procPricing.endUser;
      }
    }
  }
  
  // Calculate totals with GST (18%) - SAME LOGIC AS PDF
  const gstProduct = subtotal * 0.18;
  const totalProduct = subtotal + gstProduct;
  
  const gstProcessor = processorPrice * 0.18;
  const totalProcessor = processorPrice + gstProcessor;
  
  // GRAND TOTAL (A + B) - This matches the PDF exactly
  const grandTotal = totalProduct + totalProcessor;
  
  return Math.round(grandTotal);
}

// Get processor price based on user type
const getProcessorPrice = (processor: string, userType: string): number => {
  const processorPrices: Record<string, { endUser: number; reseller: number; channel: number }> = {
    'TB2': { endUser: 15000, reseller: 12000, channel: 10000 },
    'TB40': { endUser: 25000, reseller: 20000, channel: 17000 },
    'TB60': { endUser: 35000, reseller: 28000, channel: 24000 },
    'VX1': { endUser: 20000, reseller: 16000, channel: 14000 },
    'VX400': { endUser: 30000, reseller: 24000, channel: 21000 },
    'VX400 Pro': { endUser: 35000, reseller: 28000, channel: 24000 },
    'VX600': { endUser: 45000, reseller: 36000, channel: 31000 },
    'VX600 Pro': { endUser: 50000, reseller: 40000, channel: 34000 },
    'VX1000': { endUser: 65000, reseller: 52000, channel: 44000 },
    'VX1000 Pro': { endUser: 70000, reseller: 56000, channel: 48000 },
    '4K PRIME': { endUser: 100000, reseller: 80000, channel: 68000 }
  };
  
  const procPricing = processorPrices[processor];
  if (!procPricing) return 0;
  
  if (userType === 'reseller') {
    return procPricing.reseller;
  } else if (userType === 'siChannel') {
    return procPricing.channel;
  } else {
    return procPricing.endUser;
  }
};

// Get user type display name
const getUserTypeDisplayName = (type: string): string => {
  switch(type) {
    case 'siChannel':
      return 'SI/Channel Partner';
    case 'reseller':
      return 'Reseller';
    default:
      return 'End Customer';
  }
};

// Calculate aspect ratio
const calculateAspectRatio = (width: number, height: number): string => {
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

interface PdfViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  htmlContent: string;
  onDownload: () => void;
  fileName: string;
  // Data needed for saving quotation
  selectedProduct?: any;
  config?: any;
  cabinetGrid?: any;
  processor?: string;
  mode?: string;
  userInfo?: any;
  salesUser?: any;
  quotationId?: string;
}

export const PdfViewModal: React.FC<PdfViewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  onDownload,
  fileName,
  selectedProduct,
  config,
  cabinetGrid,
  processor,
  mode,
  userInfo,
  salesUser,
  quotationId
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [quotationStatus, setQuotationStatus] = useState<'New' | 'In Progress' | 'Rejected' | 'Hold' | 'Converted'>('New');

  const handleSave = async () => {
    if (!salesUser || !selectedProduct || !userInfo) {
      setSaveError('Missing required data for saving quotation');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Generate quotationId if not provided
    let finalQuotationId = quotationId;
    if (!finalQuotationId) {
      finalQuotationId = await QuotationIdGenerator.generateQuotationId(salesUser.name);
      console.log('🆔 Generated new quotationId:', finalQuotationId);
    }

    // Create comprehensive product details object
    const comprehensiveProductDetails = {
      // Basic product info
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      category: selectedProduct.category,
      
      // Display specifications
      pixelPitch: selectedProduct.pixelPitch,
      resolution: selectedProduct.resolution,
      cabinetDimensions: selectedProduct.cabinetDimensions,
      moduleDimensions: selectedProduct.moduleDimensions,
      moduleResolution: selectedProduct.moduleResolution,
      moduleQuantity: selectedProduct.moduleQuantity,
      pixelDensity: selectedProduct.pixelDensity,
      brightness: selectedProduct.brightness,
      refreshRate: selectedProduct.refreshRate,
      environment: selectedProduct.environment,
      maxPowerConsumption: selectedProduct.maxPowerConsumption,
      avgPowerConsumption: selectedProduct.avgPowerConsumption,
      weightPerCabinet: selectedProduct.weightPerCabinet,
      
      // Configuration details
      cabinetGrid: cabinetGrid,
      displaySize: selectedProduct.cabinetDimensions && cabinetGrid ? {
        width: Number((selectedProduct.cabinetDimensions.width * (cabinetGrid?.columns || 1) / 1000).toFixed(2)),
        height: Number((selectedProduct.cabinetDimensions.height * (cabinetGrid?.rows || 1) / 1000).toFixed(2))
      } : undefined,
      aspectRatio: selectedProduct.resolution ? 
        calculateAspectRatio(selectedProduct.resolution.width, selectedProduct.resolution.height) : undefined,
      processor: processor,
      mode: mode,
      
      // User type and timestamp
      userType: getUserType(),
      userTypeDisplayName: getUserTypeDisplayName(),
      generatedAt: new Date().toISOString()
    };

    // Calculate correct total price using the same logic as QuoteModal
    const userTypeForCalc = getUserType();
    const correctTotalPrice = calculateCorrectTotalPrice(
      selectedProduct,
      cabinetGrid,
      processor || null,
      userTypeForCalc,
      config || { width: 2400, height: 1010, unit: 'mm' }
    );

    console.log('💰 Calculated price for quotation (WITH GST - matches PDF):', {
      quotationId: finalQuotationId,
      totalPrice: correctTotalPrice,
      formatted: `₹${correctTotalPrice.toLocaleString('en-IN')}`,
      includesGST: true,
      gstRate: '18%',
      userType: getUserTypeDisplayName(userTypeForCalc),
      product: selectedProduct.name
    });

    // Capture exact quotation data as shown on the page
    const exactQuotationData = {
      // Basic quotation info
      quotationId: finalQuotationId,
      customerName: userInfo.fullName.trim(),
      customerEmail: userInfo.email.trim(),
      customerPhone: userInfo.phoneNumber.trim(),
      productName: selectedProduct.name,
      message: 'Quotation saved from PDF view',
      userType: userTypeForCalc,
      userTypeDisplayName: getUserTypeDisplayName(userTypeForCalc),
      status: quotationStatus,
      totalPrice: correctTotalPrice,  // CRITICAL: Grand Total with GST - matches PDF exactly
      
      // Store exact pricing breakdown as shown on the page
      exactPricingBreakdown: {
        unitPrice: selectedProduct.price || selectedProduct.resellerPrice || selectedProduct.siChannelPrice || 0,
        quantity: cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1,
        subtotal: (selectedProduct.price || selectedProduct.resellerPrice || selectedProduct.siChannelPrice || 0) * (cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1),
        gstRate: 18,
        gstAmount: ((selectedProduct.price || selectedProduct.resellerPrice || selectedProduct.siChannelPrice || 0) * (cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1)) * 0.18,
        processorPrice: processor ? getProcessorPrice(processor, userTypeForCalc) : 0,
        processorGst: processor ? (getProcessorPrice(processor, userTypeForCalc) * 0.18) : 0,
        grandTotal: correctTotalPrice
      },
      
      // Store exact product specifications as shown
      exactProductSpecs: {
        productName: selectedProduct.name,
        category: selectedProduct.category,
        pixelPitch: selectedProduct.pixelPitch,
        resolution: selectedProduct.resolution,
        cabinetDimensions: selectedProduct.cabinetDimensions,
        displaySize: selectedProduct.cabinetDimensions && cabinetGrid ? {
          width: Number((selectedProduct.cabinetDimensions.width * (cabinetGrid?.columns || 1) / 1000).toFixed(2)),
          height: Number((selectedProduct.cabinetDimensions.height * (cabinetGrid?.rows || 1) / 1000).toFixed(2))
        } : undefined,
        aspectRatio: selectedProduct.resolution ? 
          calculateAspectRatio(selectedProduct.resolution.width, selectedProduct.resolution.height) : undefined,
        processor: processor,
        mode: mode,
        cabinetGrid: cabinetGrid
      },
      
      // Store comprehensive product details for backend compatibility
      productDetails: comprehensiveProductDetails,
      
      // Timestamp when quotation was created
      createdAt: new Date().toISOString()
    };

    try {
      console.log('🔄 Saving quotation from PDF view...');
      console.log('📤 Sending exact quotation data to API:', exactQuotationData);

      const saveResult = await salesAPI.saveQuotation(exactQuotationData);
      console.log('✅ Quotation saved to database successfully:', saveResult);

      setSaveSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('❌ Error saving quotation:', error);
      
      // If it's a duplicate ID error, try with a fallback ID
      if (error.message && error.message.includes('already exists')) {
        console.log('🔄 Duplicate ID detected, trying with fallback ID...');
        try {
          const fallbackQuotationId = QuotationIdGenerator.generateFallbackQuotationId(salesUser.name);
          console.log('🆔 Generated fallback quotationId:', fallbackQuotationId);
          
          const fallbackQuotationData = {
            ...exactQuotationData,
            quotationId: fallbackQuotationId
          };
          
          const fallbackResult = await salesAPI.saveQuotation(fallbackQuotationData);
          console.log('✅ Quotation saved with fallback ID:', fallbackResult);
          
          setSaveSuccess(true);
          
          // Clear success message after 3 seconds
          setTimeout(() => {
            setSaveSuccess(false);
          }, 3000);
          
        } catch (fallbackError: any) {
          console.error('❌ Fallback save also failed:', fallbackError);
          setSaveError(fallbackError.message || 'Failed to save quotation even with fallback ID');
        }
      } else {
        setSaveError(error.message || 'Failed to save quotation');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getUserType = (): 'endUser' | 'reseller' | 'siChannel' => {
    switch (userInfo?.userType) {
      case 'Reseller':
        return 'reseller';
      case 'SI/Channel Partner':
        return 'siChannel';
      case 'End User':
      default:
        return 'endUser';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      <div className="bg-white w-full h-full flex flex-col">
        {/* Header */}
        <div className="bg-black text-white p-4 border-b border-white/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg bg-white/10">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Configuration Report Preview</h2>
                <p className="text-sm text-gray-300">{fileName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Quotation Status Dropdown and Save button - only show for sales users */}
              {salesUser && userInfo && (
                <>
                  {/* Quotation Status Dropdown */}
                  <div className="flex items-center space-x-2">
                    <label htmlFor="quotationStatus" className="text-white text-sm font-medium">
                      Status:
                    </label>
                    <select
                      id="quotationStatus"
                      value={quotationStatus}
                      onChange={(e) => {
                        const newStatus = e.target.value as 'New' | 'In Progress' | 'Rejected' | 'Hold' | 'Converted';
                        setQuotationStatus(newStatus);
                      }}
                      className="px-3 py-1 bg-white text-gray-900 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={isSaving}
                    >
                      <option value="New">New</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Rejected">Rejected</option>
                      <option value="Hold">Hold</option>
                      <option value="Converted">Converted</option>
                    </select>
                  </div>
                  
                  {/* Save button */}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Save className={`w-4 h-4 mr-2 ${isSaving ? 'animate-pulse' : ''}`} />
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
              <button
                onClick={onDownload}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                className="text-gray-300 hover:text-white p-2"
                onClick={onClose}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {(saveError || saveSuccess) && (
          <div className="px-4 py-2">
            {saveError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <X className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{saveError}</p>
                  </div>
                </div>
              </div>
            )}
            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Save className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">Quotation saved successfully! It will appear in the Super User Dashboard.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto">
          <iframe
            srcDoc={htmlContent}
            className="w-full h-full border-0"
            title="Configuration Report Preview"
            style={{ minHeight: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
