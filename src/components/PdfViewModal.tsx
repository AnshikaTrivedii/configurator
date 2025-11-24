import React, { useState } from 'react';
import { X, Download, Save } from 'lucide-react';
import { salesAPI } from '../api/sales';
import QuotationIdGenerator from '../utils/quotationIdGenerator';
import { getProcessorPrice } from '../utils/processorPrices';
import { calculateCentralizedPricing } from '../utils/centralizedPricing';

// Conversion constant
const METERS_TO_FEET = 3.2808399;

// Calculate correct total price with GST - using centralized pricing for consistency
// Returns null if price is not available
function calculateCorrectTotalPrice(
  product: any,
  cabinetGrid: { columns: number; rows: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string },
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }
): number | null {
  try {
    // Use centralized pricing calculation for 100% consistency
    // Pass customPricing to centralized pricing function which now handles structure and installation separately
    const pricingResult = calculateCentralizedPricing(
      product,
      cabinetGrid,
      processor,
      userType,
      config,
      customPricing
    );
    
    // Check if price is available
    if (!pricingResult.isAvailable) {
      console.log('⚠️ PdfViewModal - Price not available:', {
        product: product.name,
        userType: pricingResult.userType,
        reason: 'Price is set to NA'
      });
      return null;
    }
    
    // Structure and Installation are now calculated separately in centralized pricing function
    // The grand total already includes them separately - never combined
    const grandTotal = pricingResult.grandTotal;
    
    console.log('💰 PdfViewModal - Using Centralized Calculation:', {
      product: product.name,
      userType: pricingResult.userType,
      baseGrandTotal: pricingResult.productTotal + pricingResult.processorTotal,
      structureCost: pricingResult.structureCost,
      structureGST: pricingResult.structureGST,
      structureTotal: pricingResult.structureTotal,
      installationCost: pricingResult.installationCost,
      installationGST: pricingResult.installationGST,
      installationTotal: pricingResult.installationTotal,
      finalGrandTotal: grandTotal,
      customPricing: customPricing?.enabled ? 'Enabled' : 'Disabled',
      note: 'Using centralized pricing function with Structure (separate) + Installation (separate)'
    });
    
    return Math.round(grandTotal);
    
  } catch (error) {
    console.error('Error in PdfViewModal calculation:', error);
    // Fallback to simple calculation
    return 6254;
  }
}

// Get processor price based on user type (using centralized pricing)
const getProcessorPriceLocal = (processor: string, userType: string): number => {
  // Convert userType to match centralized pricing format
  let pdfUserType: 'End User' | 'Reseller' | 'Channel' = 'End User';
  if (userType === 'reseller') {
    pdfUserType = 'Reseller';
  } else if (userType === 'siChannel') {
    pdfUserType = 'Channel';
  }
  
  return getProcessorPrice(processor, pdfUserType);
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
  onDownloadDocx?: () => void;
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
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  };
}

export const PdfViewModal: React.FC<PdfViewModalProps> = ({
  isOpen,
  onClose,
  htmlContent,
  onDownload,
  onDownloadDocx,
  fileName,
  selectedProduct,
  config,
  cabinetGrid,
  processor,
  mode,
  userInfo,
  salesUser,
  quotationId,
  customPricing
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

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
    
    // Track if save was successful to trigger download
    let saveSuccessful = false;

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
      config || { width: 2400, height: 1010, unit: 'mm' },
      customPricing
    );

    // Check if price is available
    if (correctTotalPrice === null) {
      alert('❌ Price is not available for this product configuration. Please contact sales for pricing information.');
      return;
    }

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
      totalPrice: correctTotalPrice,  // CRITICAL: Grand Total with GST - matches PDF exactly
      
      // Store exact pricing breakdown using centralized calculation
      exactPricingBreakdown: (() => {
        const pricingResult = calculateCentralizedPricing(
          selectedProduct,
          cabinetGrid,
          processor,
          userTypeForCalc,
          config || { width: 2400, height: 1010, unit: 'mm' }
        );
        
        return {
          unitPrice: pricingResult.unitPrice,
          quantity: pricingResult.quantity,
          subtotal: pricingResult.productSubtotal,
          gstRate: 18,
          gstAmount: pricingResult.productGST,
          processorPrice: pricingResult.processorPrice,
          processorGst: pricingResult.processorGST,
          grandTotal: pricingResult.grandTotal
        };
      })(),
      
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
      saveSuccessful = true;
      
      // Automatically download PDF after successful save
      if (saveSuccessful) {
        // Start download immediately - no delay needed
        onDownload();
      }
      
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
          saveSuccessful = true;
          
          // Automatically download PDF after successful save
          if (saveSuccessful) {
            // Start download immediately - no delay needed
            onDownload();
          }
          
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
              {/* Combined Save & Download button for sales users */}
              {salesUser && userInfo ? (
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className={`w-4 h-4 mr-2 ${isSaving ? 'animate-pulse' : ''}`} />
                  {isSaving ? 'Saving & Downloading...' : 'Save & Download PDF'}
                </button>
              ) : (
                <button
                  onClick={onDownload}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </button>
              )}
              {onDownloadDocx && (
                <button
                  onClick={onDownloadDocx}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Word
                </button>
              )}
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
