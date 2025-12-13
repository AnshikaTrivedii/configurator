import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Save } from 'lucide-react';
import { salesAPI } from '../api/sales';
import QuotationIdGenerator from '../utils/quotationIdGenerator';
import { getProcessorPrice } from '../utils/processorPrices';
import { calculateCentralizedPricing } from '../utils/centralizedPricing';
import { applyDiscount, DiscountInfo } from '../utils/discountCalculator';
import { generateConfigurationHtml } from '../utils/docxGenerator';

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
  userRole?: 'normal' | 'sales' | 'super' | 'super_admin';
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
  userRole,
  quotationId,
  customPricing
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);
  const [loadingSalesPersons, setLoadingSalesPersons] = useState(false);
  
  // Discount state (only for superadmin)
  const [discountType, setDiscountType] = useState<'led' | 'controller' | 'total' | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Define getUserType before useMemo to avoid "before initialization" error
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

  // Regenerate HTML with discount applied when discount changes
  const htmlContentWithDiscount = useMemo(() => {
    if (!selectedProduct || !config || !userInfo) {
      return htmlContent; // Fallback to original HTML if data not available
    }

    const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';
    
    // If no discount, use original HTML
    if (!isSuperAdmin || !discountType || discountPercent <= 0) {
      return htmlContent;
    }

    // Calculate pricing with discount
    const userTypeForCalc = getUserType();
    const pricingResult = calculateCentralizedPricing(
      selectedProduct,
      cabinetGrid,
      processor,
      userTypeForCalc,
      config,
      customPricing
    );

    if (!pricingResult.isAvailable) {
      return htmlContent; // Fallback if price not available
    }

    // Apply discount
    const discountInfo: DiscountInfo = {
      discountType,
      discountPercent
    };
    const discountedResult = applyDiscount(pricingResult, discountInfo);

    // Create exactPricingBreakdown with discounted values
    const exactPricingBreakdown = {
      unitPrice: discountedResult.unitPrice,
      quantity: discountedResult.quantity,
      subtotal: discountedResult.productSubtotal,
      gstAmount: discountedResult.productGST,
      processorPrice: discountedResult.processorPrice,
      processorGst: discountedResult.processorGST,
      grandTotal: discountedResult.grandTotal,
      discount: {
        discountedProductTotal: discountedResult.discountedProductTotal,
        discountedProcessorTotal: discountedResult.discountedProcessorTotal,
        discountedGrandTotal: discountedResult.grandTotal
      }
    };

    // Regenerate HTML with discounted values
    const discountedHtml = generateConfigurationHtml(
      config,
      selectedProduct,
      cabinetGrid,
      processor,
      mode,
      userInfo,
      salesUser,
      quotationId,
      customPricing,
      exactPricingBreakdown
    );

    console.log('🔄 Regenerated HTML with discount:', {
      discountType,
      discountPercent: `${discountPercent}%`,
      originalGrandTotal: pricingResult.grandTotal,
      discountedGrandTotal: discountedResult.grandTotal,
      discountAmount: discountedResult.discountAmount
    });

    return discountedHtml;
  }, [htmlContent, selectedProduct, config, cabinetGrid, processor, mode, userInfo, salesUser, quotationId, customPricing, discountType, discountPercent, userRole]);

  // Load sales persons if user is superadmin
  useEffect(() => {
    if ((userRole === 'super' || userRole === 'super_admin') && isOpen) {
      const loadSalesPersons = async () => {
        try {
          setLoadingSalesPersons(true);
          const response = await salesAPI.getSalesPersons();
          const persons = response.salesPersons || [];
          setSalesPersons(persons);
          
          console.log('📋 Loaded sales persons for dropdown:', {
            count: persons.length,
            persons: persons.map(p => ({
              _id: p._id,
              _idType: typeof p._id,
              name: p.name,
              email: p.email
            }))
          });
          
          // Default to current user if available
          if (salesUser?._id) {
            const currentUserId = salesUser._id.toString();
            setSelectedSalesPersonId(currentUserId);
            console.log('✅ Defaulted to current user:', {
              salesUserId: currentUserId,
              salesUserName: salesUser.name
            });
          } else if (persons.length > 0) {
            const firstPersonId = persons[0]._id?.toString();
            setSelectedSalesPersonId(firstPersonId);
            console.log('✅ Defaulted to first person in list:', {
              personId: firstPersonId,
              personName: persons[0].name
            });
          }
        } catch (error) {
          console.error('Error loading sales persons:', error);
        } finally {
          setLoadingSalesPersons(false);
        }
      };
      loadSalesPersons();
    }
  }, [userRole, isOpen, salesUser]);

  const handleSave = async () => {
    // For superadmin, require salesUser or selectedSalesPersonId
    const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';
    if (isSuperAdmin && !salesUser && !selectedSalesPersonId) {
      setSaveError('Please select a sales person to assign this quotation to');
      return;
    }
    
    if ((!isSuperAdmin && !salesUser) || !selectedProduct || !userInfo) {
      setSaveError('Missing required data for saving quotation');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Generate quotationId if not provided
    let finalQuotationId = quotationId;
    if (!finalQuotationId) {
      // For superadmin, use selected sales person name or current user name
      const nameForId = isSuperAdmin && selectedSalesPersonId 
        ? salesPersons.find(p => p._id === selectedSalesPersonId)?.name || salesUser?.name
        : salesUser?.name;
      if (nameForId) {
        finalQuotationId = await QuotationIdGenerator.generateQuotationId(nameForId);
        console.log('🆔 Generated new quotationId:', finalQuotationId);
      } else {
        setSaveError('Unable to generate quotation ID - missing sales person name');
        setIsSaving(false);
        return;
      }
    }
    
    // CRITICAL: Determine salesUserId and salesUserName for quotation attribution
    // This determines which user the quotation will be counted under in the dashboard
    let finalSalesUserId: string | undefined;
    let finalSalesUserName: string | undefined;
    
    if (isSuperAdmin) {
      // Superadmin can assign to selected sales person or themselves
      if (selectedSalesPersonId) {
        console.log('🔍 DEBUG: Looking for selected sales person:', {
          selectedSalesPersonId,
          selectedSalesPersonIdType: typeof selectedSalesPersonId,
          salesPersonsCount: salesPersons.length,
          salesPersonsIds: salesPersons.map(p => ({ id: p._id, idType: typeof p._id, name: p.name }))
        });
        
        const selectedPerson = salesPersons.find(p => {
          // Handle both string and ObjectId comparisons
          const personId = p._id?.toString();
          const selectedId = selectedSalesPersonId?.toString();
          return personId === selectedId;
        });
        
        if (selectedPerson) {
          // Assign to the selected sales person
          // CRITICAL: Use the _id as-is (could be string or ObjectId, backend will handle conversion)
          finalSalesUserId = selectedPerson._id;
          finalSalesUserName = selectedPerson.name;
          console.log('✅ Superadmin assigning quotation to:', {
            selectedSalesPersonId: selectedSalesPersonId,
            finalSalesUserId: finalSalesUserId,
            finalSalesUserIdType: typeof finalSalesUserId,
            finalSalesUserIdString: finalSalesUserId?.toString(),
            finalSalesUserName: finalSalesUserName,
            email: selectedPerson.email,
            note: 'This ID will be sent to backend and converted to ObjectId'
          });
        } else {
          // Fallback to current user (should not happen if dropdown works correctly)
          console.error('❌ Selected person not found in salesPersons list!', {
            selectedSalesPersonId,
            availableIds: salesPersons.map(p => p._id),
            availableNames: salesPersons.map(p => p.name)
          });
          finalSalesUserId = salesUser?._id;
          finalSalesUserName = salesUser?.name;
          console.log('⚠️ Selected person not found, falling back to superadmin themselves');
        }
      } else {
        // Default to current user (superadmin creating for themselves)
        finalSalesUserId = salesUser?._id;
        finalSalesUserName = salesUser?.name;
        console.log('📊 Superadmin creating quotation for themselves:', {
          salesUserId: finalSalesUserId,
          salesUserName: finalSalesUserName
        });
      }
    } else {
      // Regular sales user - always uses their own ID
      finalSalesUserId = salesUser?._id;
      finalSalesUserName = salesUser?.name;
      console.log('📊 Sales user creating quotation:', {
        salesUserId: finalSalesUserId,
        salesUserName: finalSalesUserName
      });
    }
    
    if (!finalSalesUserId || !finalSalesUserName) {
      setSaveError('Missing sales user information');
      setIsSaving(false);
      return;
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

    // Get centralized pricing for discount calculation
    const pricingResult = calculateCentralizedPricing(
      selectedProduct,
      cabinetGrid,
      processor,
      userTypeForCalc,
      config || { width: 2400, height: 1010, unit: 'mm' },
      customPricing
    );

    // Apply discount if superadmin has set one
    let finalPricingResult = pricingResult;
    let finalTotalPrice = correctTotalPrice;
    let discountInfo: DiscountInfo | null = null;
    
    // isSuperAdmin is already declared at the top of handleSave function
    if (isSuperAdmin && discountType && discountPercent > 0) {
      discountInfo = {
        discountType,
        discountPercent
      };
      
      // Apply discount to pricing result
      const discountedResult = applyDiscount(pricingResult, discountInfo);
      finalPricingResult = discountedResult;
      finalTotalPrice = discountedResult.grandTotal;
      
      console.log('💰 DISCOUNT APPLIED TO QUOTATION:', {
        discountType,
        discountPercent: `${discountPercent}%`,
        originalTotal: correctTotalPrice,
        discountedTotal: finalTotalPrice,
        discountAmount: discountedResult.discountAmount,
        savings: `₹${discountedResult.discountAmount.toLocaleString('en-IN')}`
      });
    }

    console.log('💰 Calculated price for quotation (WITH GST - matches PDF):', {
      quotationId: finalQuotationId,
      totalPrice: finalTotalPrice,
      originalTotal: correctTotalPrice,
      formatted: `₹${finalTotalPrice.toLocaleString('en-IN')}`,
      includesGST: true,
      gstRate: '18%',
      userType: getUserTypeDisplayName(userTypeForCalc),
      product: selectedProduct.name,
      hasDiscount: !!discountInfo,
      note: discountInfo ? 'Price includes discount (not shown in PDF)' : 'This price includes 18% GST and matches PDF Grand Total'
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
      totalPrice: finalTotalPrice,  // CRITICAL: Grand Total with GST (and discount if applied) - matches PDF exactly
      
      // CRITICAL: Include salesUserId and salesUserName for quotation attribution
      // This determines which user the quotation is counted under in the dashboard
      // For superadmin: can be assigned user or themselves
      // For sales users: always their own ID
      salesUserId: finalSalesUserId,
      salesUserName: finalSalesUserName,
      
      // Store discount information in quotationData
      discountType: discountInfo?.discountType || null,
      discountPercent: discountInfo?.discountPercent || 0,
      
      // Store exact pricing breakdown using centralized calculation + discount
      exactPricingBreakdown: {
        unitPrice: finalPricingResult.unitPrice,
        quantity: finalPricingResult.quantity,
        subtotal: finalPricingResult.productSubtotal,
        gstRate: 18,
        gstAmount: finalPricingResult.productGST,
        processorPrice: finalPricingResult.processorPrice,
        processorGst: finalPricingResult.processorGST,
        grandTotal: finalTotalPrice,
        // Discount information (stored but never shown in PDF)
        discount: discountInfo ? {
          discountType: discountInfo.discountType,
          discountPercent: discountInfo.discountPercent,
          // Store original values for reference
          originalProductTotal: 'originalProductTotal' in finalPricingResult ? finalPricingResult.originalProductTotal : finalPricingResult.productTotal,
          originalProcessorTotal: 'originalProcessorTotal' in finalPricingResult ? finalPricingResult.originalProcessorTotal : finalPricingResult.processorTotal,
          originalGrandTotal: 'originalGrandTotal' in finalPricingResult ? finalPricingResult.originalGrandTotal : correctTotalPrice,
          // Store discounted values (these are what appear in PDF)
          discountedProductTotal: 'discountedProductTotal' in finalPricingResult ? finalPricingResult.discountedProductTotal : finalPricingResult.productTotal,
          discountedProcessorTotal: 'discountedProcessorTotal' in finalPricingResult ? finalPricingResult.discountedProcessorTotal : finalPricingResult.processorTotal,
          discountedGrandTotal: finalTotalPrice,
          discountAmount: 'discountAmount' in finalPricingResult ? finalPricingResult.discountAmount : 0
        } : undefined
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
      console.log('📤 Sending exact quotation data to API:', {
        ...exactQuotationData,
        salesUserId: exactQuotationData.salesUserId,
        salesUserIdType: typeof exactQuotationData.salesUserId,
        salesUserIdString: exactQuotationData.salesUserId?.toString(),
        salesUserName: exactQuotationData.salesUserName
      });

      const saveResult = await salesAPI.saveQuotation(exactQuotationData);
      console.log('✅ Quotation saved to database successfully:', saveResult);

      setSaveSuccess(true);
      saveSuccessful = true;
      
      // Automatically download PDF after successful save with discount applied
      if (saveSuccessful) {
        // Generate PDF with discount applied
        try {
          const { generateConfigurationPdf } = await import('../utils/docxGenerator');
          
          // Create exactPricingBreakdown with discounted values for PDF generation
          const exactPricingBreakdownForPdf = {
            unitPrice: finalPricingResult.unitPrice,
            quantity: finalPricingResult.quantity,
            subtotal: finalPricingResult.productSubtotal,
            gstAmount: finalPricingResult.productGST,
            processorPrice: finalPricingResult.processorPrice,
            processorGst: finalPricingResult.processorGST,
            grandTotal: finalTotalPrice,
            discount: discountInfo ? {
              discountedProductTotal: finalPricingResult.discountedProductTotal,
              discountedProcessorTotal: finalPricingResult.discountedProcessorTotal,
              discountedGrandTotal: finalTotalPrice
            } : undefined
          };

          const blob = await generateConfigurationPdf(
            config || { width: 2400, height: 1010, unit: 'mm' },
            selectedProduct,
            cabinetGrid,
            processor,
            mode,
            userInfo,
            salesUser,
            quotationId,
            customPricing,
            exactPricingBreakdownForPdf
          );

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        } catch (pdfError) {
          console.error('Error generating PDF with discount:', pdfError);
          // Fallback to original onDownload if PDF generation fails
          onDownload();
        }
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
          const fallbackQuotationId = QuotationIdGenerator.generateFallbackQuotationId(
            isSuperAdmin && selectedSalesPersonId
              ? salesPersons.find(p => p._id === selectedSalesPersonId)?.name || salesUser?.name || 'Admin'
              : salesUser?.name || 'Admin'
          );
          console.log('🆔 Generated fallback quotationId:', fallbackQuotationId);
          
          const fallbackQuotationData = {
            ...exactQuotationData,
            quotationId: fallbackQuotationId
          };
          
          const fallbackResult = await salesAPI.saveQuotation(fallbackQuotationData);
          console.log('✅ Quotation saved with fallback ID:', fallbackResult);
          
          setSaveSuccess(true);
          saveSuccessful = true;
          
          // Automatically download PDF after successful save with discount applied
          if (saveSuccessful) {
            // Generate PDF with discount applied
            try {
              const { generateConfigurationPdf } = await import('../utils/docxGenerator');
              
              // Create exactPricingBreakdown with discounted values for PDF generation
              const exactPricingBreakdownForPdf = {
                unitPrice: finalPricingResult.unitPrice,
                quantity: finalPricingResult.quantity,
                subtotal: finalPricingResult.productSubtotal,
                gstAmount: finalPricingResult.productGST,
                processorPrice: finalPricingResult.processorPrice,
                processorGst: finalPricingResult.processorGST,
                grandTotal: finalTotalPrice,
                discount: discountInfo ? {
                  discountedProductTotal: finalPricingResult.discountedProductTotal,
                  discountedProcessorTotal: finalPricingResult.discountedProcessorTotal,
                  discountedGrandTotal: finalTotalPrice
                } : undefined
              };

              const blob = await generateConfigurationPdf(
                config || { width: 2400, height: 1010, unit: 'mm' },
                selectedProduct,
                cabinetGrid,
                processor,
                mode,
                userInfo,
                salesUser,
                quotationId,
                customPricing,
                exactPricingBreakdownForPdf
              );

              const url = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(url);
            } catch (pdfError) {
              console.error('Error generating PDF with discount:', pdfError);
              // Fallback to original onDownload if PDF generation fails
              onDownload();
            }
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
              {/* Sales Person Dropdown for Super Admin */}
              {(userRole === 'super' || userRole === 'super_admin') && salesPersons.length > 0 && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-white/80">Assign to:</label>
                  <select
                    value={selectedSalesPersonId || ''}
                    onChange={(e) => {
                      const newId = e.target.value;
                      console.log('🔄 Sales person dropdown changed:', {
                        newId,
                        newIdType: typeof newId,
                        selectedPerson: salesPersons.find(p => {
                          const personId = p._id?.toString();
                          return personId === newId;
                        })
                      });
                      setSelectedSalesPersonId(newId);
                    }}
                    disabled={isSaving || loadingSalesPersons}
                    className="px-3 py-1.5 bg-white/10 border border-white/20 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loadingSalesPersons ? (
                      <option>Loading...</option>
                    ) : (
                      <>
                        {salesPersons.map((person) => {
                          // CRITICAL: Convert _id to string for option value
                          const personId = person._id?.toString() || person._id;
                          return (
                            <option key={personId} value={personId} className="text-gray-900">
                              {person.name} ({person.email})
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                </div>
              )}
              
              {/* Discount Section for Super Admin */}
              {(userRole === 'super' || userRole === 'super_admin') && (
                <div className="flex items-center space-x-4 bg-white/10 p-2 rounded border border-white/20">
                  <div className="flex flex-col space-y-1">
                    <label className="text-xs text-white/80">Discount Type:</label>
                    <select
                      value={discountType || ''}
                      onChange={(e) => setDiscountType(e.target.value as 'led' | 'controller' | 'total' | null || null)}
                      disabled={isSaving}
                      className="px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">No Discount</option>
                      <option value="led">LED Screen Price</option>
                      <option value="controller">Controller Price</option>
                      <option value="total">Total Amount</option>
                    </select>
                  </div>
                  {discountType && (
                    <div className="flex flex-col space-y-1">
                      <label className="text-xs text-white/80">Discount %:</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={discountPercent}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          setDiscountPercent(Math.max(0, Math.min(100, value)));
                        }}
                        disabled={isSaving}
                        placeholder="0-100"
                        className="w-20 px-2 py-1 bg-white/10 border border-white/20 rounded text-white text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {/* Combined Save & Download button for sales users and superadmin */}
              {((salesUser || (userRole === 'super' || userRole === 'super_admin')) && userInfo) ? (
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
                  onClick={async () => {
                    // Generate PDF with discount applied if applicable
                    if (selectedProduct && config && userInfo) {
                      const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';
                      if (isSuperAdmin && discountType && discountPercent > 0) {
                        // Calculate pricing with discount
                        const userTypeForCalc = getUserType();
                        const pricingResult = calculateCentralizedPricing(
                          selectedProduct,
                          cabinetGrid,
                          processor,
                          userTypeForCalc,
                          config,
                          customPricing
                        );

                        if (pricingResult.isAvailable) {
                          const discountInfo: DiscountInfo = {
                            discountType,
                            discountPercent
                          };
                          const discountedResult = applyDiscount(pricingResult, discountInfo);

                          const exactPricingBreakdown = {
                            unitPrice: discountedResult.unitPrice,
                            quantity: discountedResult.quantity,
                            subtotal: discountedResult.productSubtotal,
                            gstAmount: discountedResult.productGST,
                            processorPrice: discountedResult.processorPrice,
                            processorGst: discountedResult.processorGST,
                            grandTotal: discountedResult.grandTotal,
                            discount: {
                              discountedProductTotal: discountedResult.discountedProductTotal,
                              discountedProcessorTotal: discountedResult.discountedProcessorTotal,
                              discountedGrandTotal: discountedResult.grandTotal
                            }
                          };

                          // Generate PDF with discount
                          const { generateConfigurationPdf } = await import('../utils/docxGenerator');
                          const blob = await generateConfigurationPdf(
                            config,
                            selectedProduct,
                            cabinetGrid,
                            processor,
                            mode,
                            userInfo,
                            salesUser,
                            quotationId,
                            customPricing,
                            exactPricingBreakdown
                          );

                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                          return;
                        }
                      }
                    }
                    // Fallback to original onDownload if no discount or data not available
                    onDownload();
                  }}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
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
            srcDoc={htmlContentWithDiscount}
            className="w-full h-full border-0"
            title="Configuration Report Preview"
            style={{ minHeight: '100%' }}
          />
        </div>
      </div>
    </div>
  );
};
