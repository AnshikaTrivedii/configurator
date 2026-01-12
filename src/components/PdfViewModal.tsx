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

// Helper function to trigger PDF download reliably
const triggerPdfDownload = (blob: Blob, fileName: string, setBlob?: (blob: Blob) => void, setUrl?: (url: string) => void) => {
  console.log('📥 Starting PDF download...', {
    blobSize: blob.size,
    blobType: blob.type,
    fileName: fileName
  });

  if (!blob || blob.size === 0) {
    console.error('❌ Invalid blob for download');
    alert('Failed to generate PDF. The file is empty.');
    return;
  }

  try {
    const url = window.URL.createObjectURL(blob);
    
    // Store blob and URL for manual download if automatic fails
    if (setBlob) setBlob(blob);
    if (setUrl) setUrl(url);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    link.setAttribute('download', fileName);
    
    // Add to DOM
    document.body.appendChild(link);
    
    console.log('🖱️ Clicking download link...');
    
    // Trigger click immediately
    link.click();
    
    // Note: Removed window.open fallback as it can cause navigation/page refresh issues
    
    // Cleanup after delay to ensure download starts
    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }
      // Don't revoke URL immediately - give browser time to download
      // URL will be revoked when component unmounts or new PDF is generated
      console.log('✅ Download link removed (URL kept for manual download)');
    }, 1000);
    
    console.log('✅ Download triggered successfully');
  } catch (error: any) {
    console.error('❌ Error triggering download:', error);
    alert(`Failed to download PDF: ${error.message || 'Unknown error'}`);
  }
};

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
  userRole?: 'normal' | 'sales' | 'super' | 'super_admin' | 'partner';
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
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);
  
  // Discount state (only for superadmin)
  const [discountType, setDiscountType] = useState<'led' | 'controller' | 'total' | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Debug: Log salesUser when component mounts or changes
  useEffect(() => {
    if (isOpen) {
      console.log('📋 PdfViewModal opened with:', {
        salesUser: salesUser ? { id: salesUser._id, name: salesUser.name, role: salesUser.role } : null,
        userRole: userRole,
        userInfo: userInfo ? { name: userInfo.fullName, userType: userInfo.userType } : null,
        quotationId: quotationId
      });
      
      // Check if salesUser is missing for sales/partner users
      if ((userRole === 'sales' || userRole === 'partner') && !salesUser) {
        console.error('❌ CRITICAL: salesUser is missing for', userRole, 'user');
        setSaveError('Sales user information is missing. Please log out and log in again.');
      } else if ((userRole === 'sales' || userRole === 'partner') && salesUser && !salesUser._id) {
        console.error('❌ CRITICAL: salesUser missing _id field:', {
          userRole: userRole,
          salesUser: salesUser,
          salesUserKeys: Object.keys(salesUser || {}),
          salesUserStringified: JSON.stringify(salesUser, null, 2),
          note: 'User object may be from old login. Clearing cache and forcing logout.'
        });
        // Clear invalid user data and force logout
        localStorage.removeItem('salesToken');
        localStorage.removeItem('salesUser');
        setSaveError('User ID is missing. Session cleared. Please refresh the page and log in again.');
        // Don't set error state - let the user see the message and refresh
      } else {
        setSaveError(null); // Clear error if salesUser is available with _id
      }
    }
  }, [isOpen, salesUser, userRole, userInfo, quotationId]);

  // Cleanup PDF URL when component unmounts
  useEffect(() => {
    return () => {
      if (pdfDownloadUrl) {
        window.URL.revokeObjectURL(pdfDownloadUrl);
        console.log('🧹 Cleaned up PDF download URL on unmount');
      }
    };
  }, [pdfDownloadUrl]);

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
    // Map UI label to legacy pricing userType expected by docxGenerator/html helpers
    const uiUserType: string | undefined = userInfo?.userType;
    const legacyUserTypeForPricing: 'End User' | 'Reseller' | 'Channel' =
      uiUserType === 'SI/Channel Partner'
        ? 'Channel'
        : (uiUserType === 'Reseller' ? 'Reseller' : 'End User');

    const discountedHtml = generateConfigurationHtml(
      config,
      selectedProduct,
      cabinetGrid,
      processor,
      mode,
      userInfo ? { ...userInfo, userType: legacyUserTypeForPricing } : undefined,
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

  // Prevent URL revocation - keep it alive for manual downloads
  useEffect(() => {
    // Don't revoke URLs - let them persist for manual downloads
    // They will be cleaned up when component unmounts or new PDF is generated
    return () => {
      // Only revoke on unmount if we're closing the modal
      if (!isOpen && pdfDownloadUrl) {
        console.log('🧹 Cleaning up PDF URL on modal close');
        window.URL.revokeObjectURL(pdfDownloadUrl);
      }
    };
  }, [isOpen, pdfDownloadUrl]);

  const handleSave = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    // CRITICAL: Prevent default form submission behavior to avoid page refresh
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Prevent multiple simultaneous saves
    if (isSaving) {
      console.log('⚠️ Save already in progress, ignoring duplicate click');
      return;
    }
    
    // For superadmin, require salesUser or selectedSalesPersonId
    const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';
    const isPartner = userRole === 'partner';
    const isSalesUser = userRole === 'sales';
    
    if (isSuperAdmin && !salesUser && !selectedSalesPersonId) {
      setSaveError('Please select a sales person to assign this quotation to');
      return;
    }
    
    // For sales users and partners, salesUser is required
    if ((isSalesUser || isPartner) && !salesUser) {
      console.error('❌ Missing salesUser for sales/partner:', {
        userRole: userRole,
        salesUser: salesUser,
        isPartner: isPartner,
        isSalesUser: isSalesUser
      });
      setSaveError('Sales user information is missing. Please log out and log in again.');
      setIsSaving(false);
      return;
    }
    
    // CRITICAL: Check if salesUser has _id (required for saving quotations)
    if ((isSalesUser || isPartner) && salesUser && !salesUser._id) {
      console.error('❌ CRITICAL: salesUser missing _id field:', {
        userRole: userRole,
        salesUser: salesUser,
        salesUserKeys: Object.keys(salesUser || {}),
        note: 'User object may be from old login. Please log out and log in again to get updated user data with _id.'
      });
      setSaveError('User ID is missing. Please log out and log in again to refresh your session.');
      setIsSaving(false);
      return;
    }
    
    if ((!isSuperAdmin && !salesUser) || !selectedProduct || !userInfo) {
      console.error('❌ Missing required data:', {
        isSuperAdmin: isSuperAdmin,
        salesUser: !!salesUser,
        selectedProduct: !!selectedProduct,
        userInfo: !!userInfo,
        userRole: userRole
      });
      setSaveError('Missing required data for saving quotation');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Use already generated PDF if available (from button click), otherwise generate it
    let pdfBlob: Blob | null = generatedPdfBlob || null;
    let pdfUrl: string | null = pdfDownloadUrl || null;
    
    // Only generate PDF if we don't already have it (it was generated in button click handler)
    if (!pdfBlob || !pdfUrl) {
      try {
        console.log('📄 Generating PDF in handleSave (not generated in button click)...');
        const { generateConfigurationPdf } = await import('../utils/docxGenerator');
        
        // Calculate pricing for PDF
        const userTypeForCalc = getUserType();
        const pricingResult = calculateCentralizedPricing(
          selectedProduct,
          cabinetGrid,
          processor,
          userTypeForCalc,
          config || { width: 2400, height: 1010, unit: 'mm' },
          customPricing
        );

        // Apply discount if applicable
        let finalPricingResult = pricingResult;
        if (isSuperAdmin && discountType && discountPercent > 0) {
          const discountInfo: DiscountInfo = {
            discountType,
            discountPercent
          };
          finalPricingResult = applyDiscount(pricingResult, discountInfo);
        }

        // Create exactPricingBreakdown for PDF generation
        const exactPricingBreakdownForPdf = {
          unitPrice: finalPricingResult.unitPrice,
          quantity: finalPricingResult.quantity,
          subtotal: finalPricingResult.productSubtotal,
          gstAmount: finalPricingResult.productGST,
          processorPrice: finalPricingResult.processorPrice,
          processorGst: finalPricingResult.processorGST,
          grandTotal: finalPricingResult.grandTotal,
          discount: (isSuperAdmin && discountType && discountPercent > 0) ? {
            discountedProductTotal: finalPricingResult.discountedProductTotal,
            discountedProcessorTotal: finalPricingResult.discountedProcessorTotal,
            discountedGrandTotal: finalPricingResult.grandTotal
          } : undefined
        };

        // Map UI user type label to legacy pricing userType expected by docxGenerator/html helpers
        const uiUserType: string | undefined = userInfo?.userType;
        const legacyUserTypeForPricing: 'End User' | 'Reseller' | 'Channel' =
          uiUserType === 'SI/Channel Partner'
            ? 'Channel'
            : (uiUserType === 'Reseller' ? 'Reseller' : 'End User');

        pdfBlob = await generateConfigurationPdf(
          config || { width: 2400, height: 1010, unit: 'mm' },
          selectedProduct,
          cabinetGrid,
          processor,
          mode,
          userInfo ? { ...userInfo, userType: legacyUserTypeForPricing } : undefined,
          salesUser,
          quotationId,
          customPricing,
          exactPricingBreakdownForPdf
        );

        pdfUrl = window.URL.createObjectURL(pdfBlob);
        setGeneratedPdfBlob(pdfBlob);
        setPdfDownloadUrl(pdfUrl);
        
        console.log('✅ PDF generated in handleSave', {
          blobSize: pdfBlob.size,
          blobType: pdfBlob.type,
          fileName: fileName
        });
        
      } catch (pdfGenError: any) {
        console.error('❌ Error generating PDF in handleSave:', pdfGenError);
        // Continue with save even if PDF generation fails
      }
    } else {
      console.log('✅ Using already generated PDF from button click');
    }

    // Generate quotationId if not provided
    let finalQuotationId = quotationId;
    if (!finalQuotationId) {
      // For superadmin, use selected sales person name or current user name
      const nameForId = isSuperAdmin && selectedSalesPersonId 
        ? salesPersons.find(p => p._id === selectedSalesPersonId)?.name || salesUser?.name
        : salesUser?.name;
      if (nameForId) {
        try {
          finalQuotationId = await QuotationIdGenerator.generateQuotationId(nameForId);
      console.log('🆔 Generated new quotationId:', finalQuotationId);
        } catch (idError: any) {
          console.warn('⚠️ Failed to generate quotation ID, using fallback:', idError);
          // Use fallback ID with timestamp for uniqueness
          const now = new Date();
          const timestamp = now.getTime().toString().slice(-6); // Last 6 digits of timestamp
          const firstName = nameForId.trim().split(' ')[0].toUpperCase();
          finalQuotationId = `ORION/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${firstName}/${timestamp}`;
          console.log('🆔 Using fallback quotationId:', finalQuotationId);
        }
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
          // CRITICAL: Always convert to string to ensure consistent format
          // Backend will validate and convert to ObjectId
          finalSalesUserId = selectedPerson._id?.toString();
          finalSalesUserName = selectedPerson.name;
          console.log('✅ Superadmin assigning quotation to:', {
            selectedSalesPersonId: selectedSalesPersonId,
            finalSalesUserId: finalSalesUserId,
            finalSalesUserIdType: typeof finalSalesUserId,
            finalSalesUserIdString: finalSalesUserId,
            finalSalesUserName: finalSalesUserName,
            email: selectedPerson.email,
            note: 'ID sent as string - backend will convert to ObjectId'
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
        finalSalesUserId = salesUser?._id?.toString();
        finalSalesUserName = salesUser?.name;
        console.log('📊 Superadmin creating quotation for themselves:', {
          salesUserId: finalSalesUserId,
          salesUserName: finalSalesUserName
        });
      }
    } else {
      // Regular sales user or partner - always uses their own ID
      // Partners are treated the same as sales users for quotation attribution
      finalSalesUserId = salesUser?._id?.toString();
      finalSalesUserName = salesUser?.name;
      console.log('📊 Sales user/Partner creating quotation:', {
        salesUserId: finalSalesUserId,
        salesUserIdType: typeof finalSalesUserId,
        salesUserName: finalSalesUserName,
        userRole: userRole,
        isPartner: userRole === 'partner',
        note: 'Quotation will be attributed to this user in dashboard'
      });
    }
    
    if (!finalSalesUserId || !finalSalesUserName) {
      console.error('❌ Missing sales user information:', {
        finalSalesUserId: !!finalSalesUserId,
        finalSalesUserName: !!finalSalesUserName,
        salesUser: salesUser ? { id: salesUser._id, name: salesUser.name, role: salesUser.role } : null,
        userRole: userRole,
        isSuperAdmin: isSuperAdmin,
        selectedSalesPersonId: selectedSalesPersonId,
        salesPersonsCount: salesPersons.length
      });
      setSaveError('Missing sales user information. Please ensure you are logged in as a sales user or partner.');
      setIsSaving(false);
      return;
    }
    
    // Track if save was successful to trigger download
    let saveSuccessful = false;

    // PRODUCTION DEBUG: Log the exact payload being sent
    console.log('🚀 QUOTATION SAVE (PDF) - Payload being sent:', {
      environment: import.meta.env.MODE,
      apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
      quotationId: quotationId,
      salesUserId: finalSalesUserId,
      salesUserIdType: typeof finalSalesUserId,
      salesUserName: finalSalesUserName,
      isSuperAdmin: isSuperAdmin,
      selectedSalesPersonId: selectedSalesPersonId,
      currentUser: salesUser?.name,
      currentUserId: salesUser?._id,
      timestamp: new Date().toISOString()
    });

    // Create comprehensive product details object
    const comprehensiveProductDetails = {
      // Basic product info
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      // Store config for accurate PDF regeneration
      config: config || { width: 2400, height: 1010, unit: 'mm' },
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

    // Generate the exact HTML that's being displayed (with discount if applicable)
    // This is the HTML that should be saved as pdfPage6HTML
    let finalHtmlContent = htmlContent;
    if (isSuperAdmin && discountType && discountPercent > 0) {
      // Use the discounted HTML that's actually displayed
      const legacyUserTypeForPricing: 'End User' | 'Reseller' | 'Channel' =
        userInfo?.userType === 'SI/Channel Partner'
          ? 'Channel'
          : (userInfo?.userType === 'Reseller' ? 'Reseller' : 'End User');
      
      finalHtmlContent = generateConfigurationHtml(
        config || { width: 2400, height: 1010, unit: 'mm' },
        selectedProduct,
        cabinetGrid,
        processor,
        mode,
        userInfo ? { ...userInfo, userType: legacyUserTypeForPricing } : undefined,
        salesUser,
        finalQuotationId,
        customPricing,
        {
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
        }
      );
    }

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
      
      // CRITICAL: Save the exact HTML that's displayed in the PDF
      pdfPage6HTML: finalHtmlContent,
      
      // CRITICAL: Include salesUserId and salesUserName for quotation attribution
      // This determines which user the quotation is counted under in the dashboard
      // For superadmin: can be assigned user or themselves
      // For sales users and partners: always their own ID
      // Partners are saved with the same structure as sales users
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
      
      // Store config in quotationData for accurate PDF regeneration
      config: config || { width: 2400, height: 1010, unit: 'mm' },
      
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

      // Generate PDF first (before saving quotation)
      console.log('📄 Generating PDF for upload to S3...');
      
      let pdfBlob: Blob;
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

        // Map UI user type label to legacy pricing userType expected by docxGenerator/html helpers
        const uiUserType: string | undefined = userInfo?.userType;
        const legacyUserTypeForPricing: 'End User' | 'Reseller' | 'Channel' =
          uiUserType === 'SI/Channel Partner'
            ? 'Channel'
            : (uiUserType === 'Reseller' ? 'Reseller' : 'End User');

        pdfBlob = await generateConfigurationPdf(
          config || { width: 2400, height: 1010, unit: 'mm' },
          selectedProduct,
          cabinetGrid,
          processor,
          mode,
          userInfo ? { ...userInfo, userType: legacyUserTypeForPricing } : undefined,
          salesUser,
          quotationId,
          customPricing,
          exactPricingBreakdownForPdf
        );

        console.log('✅ PDF generated successfully', {
          blobSize: pdfBlob.size,
          blobType: pdfBlob.type
        });
      } catch (pdfError: any) {
        console.error('❌ Error generating PDF:', pdfError);
        console.error('❌ PDF Error details:', {
          message: pdfError?.message,
          stack: pdfError?.stack,
          name: pdfError?.name
        });
        
        // Provide user-friendly error message
        let errorMessage = 'Failed to generate PDF. Please try again.';
        if (pdfError?.message) {
          if (pdfError.message.includes('canvas') || pdfError.message.includes('html2canvas')) {
            errorMessage = 'Failed to render PDF. This may be due to image loading issues. Please check your connection and try again.';
          } else if (pdfError.message.includes('timeout')) {
            errorMessage = 'PDF generation timed out. Please try again.';
          } else {
            errorMessage = `PDF error: ${pdfError.message}`;
          }
        }
        
        alert(errorMessage);
        // Fallback to original onDownload if PDF generation fails
        console.log('🔄 Falling back to original onDownload handler...');
        onDownload();
        return;
      }

      // Convert PDF blob to base64 for sending to backend
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob);
      });

      // Add PDF base64 to quotation data
      exactQuotationData.pdfBase64 = pdfBase64;

      // Save quotation with PDF data
      const saveResult = await salesAPI.saveQuotation(exactQuotationData);
      console.log('✅ Quotation saved to database successfully:', saveResult);

      setSaveSuccess(true);
      saveSuccessful = true;
      
      // Store blob and URL for manual download
      setGeneratedPdfBlob(pdfBlob);
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfDownloadUrl(url);
      
      // Automatically download PDF after successful save
      if (saveSuccessful) {
        console.log('✅ Quotation saved, starting PDF download...');
        // Use helper function to trigger download
        triggerPdfDownload(pdfBlob, fileName, setGeneratedPdfBlob, setPdfDownloadUrl);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

    } catch (error: any) {
      console.error('❌ Error saving quotation:', error);
      
      // If it's a duplicate ID error, try with a timestamp-based fallback ID
      if (error.message && error.message.includes('already exists')) {
        console.log('🔄 Duplicate ID detected, trying with timestamp-based fallback ID...');
        try {
          // Generate a truly unique ID using timestamp
          const now = new Date();
          const timestamp = now.getTime().toString().slice(-6); // Last 6 digits for uniqueness
          const nameForId = isSuperAdmin && selectedSalesPersonId
            ? salesPersons.find(p => p._id === selectedSalesPersonId)?.name || salesUser?.name || 'Admin'
            : salesUser?.name || 'Admin';
          const firstName = nameForId.trim().split(' ')[0].toUpperCase();
          const fallbackQuotationId = `ORION/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${firstName}/${timestamp}`;
          
          console.log('🆔 Generated timestamp-based fallback quotationId:', fallbackQuotationId);
          
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

              console.log('✅ PDF generated successfully (fallback)');
              
              // Store blob and URL for manual download
              setGeneratedPdfBlob(blob);
              const url = window.URL.createObjectURL(blob);
              setPdfDownloadUrl(url);
              
              // Use helper function to trigger download
              triggerPdfDownload(blob, fileName, setGeneratedPdfBlob, setPdfDownloadUrl);
            } catch (pdfError: any) {
              console.error('❌ Error generating PDF with discount (fallback):', pdfError);
              console.error('❌ PDF Error details:', {
                message: pdfError?.message,
                stack: pdfError?.stack,
                name: pdfError?.name
              });
              
              // Provide user-friendly error message
              let errorMessage = 'Failed to generate PDF. Please try again.';
              if (pdfError?.message) {
                if (pdfError.message.includes('canvas') || pdfError.message.includes('html2canvas')) {
                  errorMessage = 'Failed to render PDF. This may be due to image loading issues. Please check your connection and try again.';
                } else if (pdfError.message.includes('timeout')) {
                  errorMessage = 'PDF generation timed out. Please try again.';
                } else {
                  errorMessage = `PDF error: ${pdfError.message}`;
                }
              }
              
              alert(errorMessage);
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
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Prevent multiple clicks
                    if (isSaving) {
                      console.log('⚠️ Already saving, ignoring click');
                      return;
                    }
                    
                    console.log('🔵 Save & Download PDF button clicked');
                    
                    // Set saving state immediately to prevent double clicks
                    setIsSaving(true);
                    
                    // CRITICAL: Generate and download PDF IMMEDIATELY on click
                    // This must happen BEFORE any async operations to maintain user gesture context
                    try {
                      // Validate required data
                      if (!selectedProduct) {
                        throw new Error('Missing selectedProduct');
                      }
                      if (!config) {
                        throw new Error('Missing config');
                      }
                      if (!userInfo) {
                        throw new Error('Missing userInfo');
                      }
                      
                      console.log('📄 Generating PDF immediately on button click...', {
                        hasProduct: !!selectedProduct,
                        hasConfig: !!config,
                        hasUserInfo: !!userInfo
                      });
                      
                      const { generateConfigurationPdf } = await import('../utils/docxGenerator');
                      
                      // Calculate pricing for PDF
                      const userTypeForCalc = getUserType();
                      const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';
                      
                      console.log('💰 Calculating pricing...', { userTypeForCalc, isSuperAdmin });
                      
                      const pricingResult = calculateCentralizedPricing(
                        selectedProduct,
                        cabinetGrid,
                        processor,
                        userTypeForCalc,
                        config || { width: 2400, height: 1010, unit: 'mm' },
                        customPricing
                      );

                      // Apply discount if applicable
                      let finalPricingResult = pricingResult;
                      if (isSuperAdmin && discountType && discountPercent > 0) {
                        const discountInfo: DiscountInfo = {
                          discountType,
                          discountPercent
                        };
                        finalPricingResult = applyDiscount(pricingResult, discountInfo);
                      }

                      // Create exactPricingBreakdown for PDF generation
                      const exactPricingBreakdownForPdf = {
                        unitPrice: finalPricingResult.unitPrice,
                        quantity: finalPricingResult.quantity,
                        subtotal: finalPricingResult.productSubtotal,
                        gstAmount: finalPricingResult.productGST,
                        processorPrice: finalPricingResult.processorPrice,
                        processorGst: finalPricingResult.processorGST,
                        grandTotal: finalPricingResult.grandTotal,
                        discount: (isSuperAdmin && discountType && discountPercent > 0) ? {
                          discountedProductTotal: finalPricingResult.discountedProductTotal,
                          discountedProcessorTotal: finalPricingResult.discountedProcessorTotal,
                          discountedGrandTotal: finalPricingResult.grandTotal
                        } : undefined
                      };

                      console.log('📝 Generating PDF blob...');
                      
                      // Generate PDF
                      // Map UI user type label to legacy pricing userType expected by docxGenerator/html helpers
                      const uiUserType: string | undefined = userInfo?.userType;
                      const legacyUserTypeForPricing: 'End User' | 'Reseller' | 'Channel' =
                        uiUserType === 'SI/Channel Partner'
                          ? 'Channel'
                          : (uiUserType === 'Reseller' ? 'Reseller' : 'End User');

                      const pdfBlob = await generateConfigurationPdf(
                        config || { width: 2400, height: 1010, unit: 'mm' },
                        selectedProduct,
                        cabinetGrid,
                        processor,
                        mode,
                        userInfo ? { ...userInfo, userType: legacyUserTypeForPricing } : undefined,
                        salesUser,
                        quotationId,
                        customPricing,
                        exactPricingBreakdownForPdf
                      );

                      if (!pdfBlob || pdfBlob.size === 0) {
                        throw new Error('PDF generation failed - empty blob');
                      }

                      console.log('✅ PDF generated, triggering download IMMEDIATELY...', {
                        blobSize: pdfBlob.size,
                        blobType: pdfBlob.type,
                        fileName: fileName
                      });
                      
                      // DOWNLOAD IMMEDIATELY - simple and direct, no async operations
                      const pdfUrl = window.URL.createObjectURL(pdfBlob);
                      
                      // Create and trigger download link immediately
                      const link = document.createElement('a');
                      link.href = pdfUrl;
                      link.download = fileName;
                      link.setAttribute('download', fileName);
                      link.style.position = 'fixed';
                      link.style.left = '-9999px';
                      link.style.top = '-9999px';
                      link.style.opacity = '0';
                      link.style.pointerEvents = 'none';
                      
                      document.body.appendChild(link);
                      
                      // Force reflow to ensure link is in DOM
                      void link.offsetWidth;
                      
                      // Trigger download immediately
                      link.click();
                      
                      console.log('✅ Download triggered immediately');
                      
                      // Clean up after delay
                      setTimeout(() => {
                        if (link.parentNode) {
                          document.body.removeChild(link);
                        }
                        // Don't revoke URL immediately - keep it available
                      }, 1000);
                      
                      // Store for potential future use (but don't show manual download button)
                      setGeneratedPdfBlob(pdfBlob);
                      setPdfDownloadUrl(pdfUrl);
                      
                      console.log('✅ PDF download completed');
                      
                    } catch (pdfError: any) {
                      console.error('❌ Error generating PDF on button click:', pdfError);
                      alert(`Error generating PDF: ${pdfError.message}. Please check the console for details.`);
                      setIsSaving(false);
                      return;
                    }
                    
                    // Now save the quotation in the background (don't block on errors)
                    // PDF has already been downloaded, so save errors won't affect user experience
                    handleSave(e).catch((saveError: any) => {
                      console.error('❌ Error saving quotation (non-blocking):', saveError);
                      // Don't reset isSaving here - let handleSave handle its own state
                      // The PDF has already been downloaded, so this is just a background save
                    });
                  }}
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

              console.log('✅ PDF generated successfully (direct download)');
              
              // Store blob and URL for manual download
              setGeneratedPdfBlob(blob);
              const url = window.URL.createObjectURL(blob);
              setPdfDownloadUrl(url);
              
              // Use helper function to trigger download
              triggerPdfDownload(blob, fileName, setGeneratedPdfBlob, setPdfDownloadUrl);
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
                <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Save className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-800">Quotation saved successfully! It will appear in the Super User Dashboard.</p>
                  </div>
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
