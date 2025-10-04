import React, { useState } from 'react';
import { X, Download, Save } from 'lucide-react';
import { salesAPI } from '../api/sales';
import QuotationIdGenerator from '../utils/quotationIdGenerator';
import { calculateUserSpecificPrice } from '../utils/pricingCalculator';

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
      finalQuotationId = QuotationIdGenerator.generateQuotationId(salesUser.name);
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

    const quotationData = {
      quotationId: finalQuotationId,
      customerName: userInfo.fullName.trim(),
      customerEmail: userInfo.email.trim(),
      customerPhone: userInfo.phoneNumber.trim(),
      productName: selectedProduct.name,
      productDetails: comprehensiveProductDetails,
      message: 'Quotation saved from PDF view',
      userType: getUserType(),
      userTypeDisplayName: getUserTypeDisplayName(),
      status: quotationStatus,
      totalPrice: calculateUserSpecificPrice(comprehensiveProductDetails, getUserType()).userPrice
    };

    try {
      console.log('🔄 Saving quotation from PDF view...');
      console.log('📤 Sending quotation data to API:', quotationData);

      const saveResult = await salesAPI.saveQuotation(quotationData);
      console.log('✅ Quotation saved successfully:', saveResult);

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
                    ...quotationData,
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

  const getUserType = (): 'endUser' | 'reseller' => {
    switch (userInfo?.userType) {
      case 'Reseller':
        return 'reseller';
      case 'End User':
      default:
        return 'endUser';
    }
  };

  const getUserTypeDisplayName = (): string => {
    return userInfo?.userType || 'End Customer';
  };

  const calculateAspectRatio = (width: number, height: number): string => {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(width, height);
    return `${width / divisor}:${height / divisor}`;
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
