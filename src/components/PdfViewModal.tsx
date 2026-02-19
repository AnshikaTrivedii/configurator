import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Save } from 'lucide-react';
import { salesAPI } from '../api/sales';
import { clientAPI } from '../api/clients';
import QuotationIdGenerator from '../utils/quotationIdGenerator';
import { products } from '../data/products';
import { calculateCentralizedPricing } from '../utils/centralizedPricing';

const triggerPdfDownload = (blob: Blob, fileName: string, setBlob?: (blob: Blob) => void, setUrl?: (url: string) => void) => {

  if (!blob || blob.size === 0) {

    alert('Failed to generate PDF. The file is empty.');
    return;
  }

  try {
    const url = window.URL.createObjectURL(blob);

    if (setBlob) setBlob(blob);
    if (setUrl) setUrl(url);

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.style.display = 'none';
    link.setAttribute('download', fileName);

    document.body.appendChild(link);

    link.click();

    setTimeout(() => {
      if (link.parentNode) {
        document.body.removeChild(link);
      }

    }, 1000);

  } catch (error: any) {

    alert(`Failed to download PDF: ${error.message || 'Unknown error'}`);
  }
};

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

    const pricingResult = calculateCentralizedPricing(
      product,
      cabinetGrid,
      processor,
      userType,
      config,
      customPricing
    );

    if (!pricingResult.isAvailable) {

      return null;
    }

    const grandTotal = pricingResult.grandTotal;

    return Math.round(grandTotal);

  } catch (error) {

    return 6254;
  }
}

const getUserTypeDisplayName = (type: string): string => {
  switch (type) {
    case 'siChannel':
      return 'SI/Channel Partner';
    case 'reseller':
      return 'Reseller';
    default:
      return 'End Customer';
  }
};

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

  selectedProduct?: any;
  config?: any;
  cabinetGrid?: any;
  processor?: string;
  mode?: string;
  userInfo?: any;
  salesUser?: any;
  userRole?: 'normal' | 'sales' | 'super' | 'super_admin' | 'partner';
  quotationId?: string;
  isEditing?: boolean;
  clientId?: string | { $oid: string } | { _id: string } | Record<string, any>;
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  };

  exactPricingBreakdown?: any;

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
  userRole,
  quotationId,
  isEditing: isEditingProp,
  clientId: propClientId,
  customPricing,
  exactPricingBreakdown,

}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);
  const [loadingSalesPersons, setLoadingSalesPersons] = useState(false);
  const [generatedPdfBlob, setGeneratedPdfBlob] = useState<Blob | null>(null);
  const [pdfDownloadUrl, setPdfDownloadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {

      if ((userRole === 'sales' || userRole === 'partner') && !salesUser) {

        setSaveError('Sales user information is missing. Please log out and log in again.');
      } else if ((userRole === 'sales' || userRole === 'partner') && salesUser && !salesUser._id) {

        localStorage.removeItem('salesToken');
        localStorage.removeItem('salesUser');
        setSaveError('User ID is missing. Session cleared. Please refresh the page and log in again.');

      } else {
        setSaveError(null); // Clear error if salesUser is available with _id
      }
    }
  }, [isOpen, salesUser, userRole, userInfo, quotationId]);

  useEffect(() => {
    return () => {
      if (pdfDownloadUrl) {
        window.URL.revokeObjectURL(pdfDownloadUrl);

      }
    };
  }, [pdfDownloadUrl]);

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

  const htmlContentWithDiscount = useMemo(() => {
    return htmlContent;
  }, [htmlContent]);

  useEffect(() => {
    if ((userRole === 'super' || userRole === 'super_admin') && isOpen) {
      const loadSalesPersons = async () => {
        try {
          setLoadingSalesPersons(true);
          const response = await salesAPI.getSalesPersons();
          const persons = response.salesPersons || [];
          setSalesPersons(persons);

          if (salesUser?._id) {
            const currentUserId = salesUser._id.toString();
            setSelectedSalesPersonId(currentUserId);

          } else if (persons.length > 0) {
            const firstPersonId = persons[0]._id?.toString();
            setSelectedSalesPersonId(firstPersonId);

          }
        } catch (error) {

        } finally {
          setLoadingSalesPersons(false);
        }
      };
      loadSalesPersons();
    }
  }, [userRole, isOpen, salesUser]);

  useEffect(() => {

    return () => {

      if (!isOpen && pdfDownloadUrl) {

        window.URL.revokeObjectURL(pdfDownloadUrl);
      }
    };
  }, [isOpen, pdfDownloadUrl]);

  const handleSave = async (e?: React.MouseEvent<HTMLButtonElement>) => {

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }

    if (isSaving) {

      return;
    }

    const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';
    const isPartner = userRole === 'partner';
    const isSalesUser = userRole === 'sales';

    if (isSuperAdmin && !salesUser && !selectedSalesPersonId) {
      setSaveError('Please select a sales person to assign this quotation to');
      return;
    }

    if ((isSalesUser || isPartner) && !salesUser) {

      setSaveError('Sales user information is missing. Please log out and log in again.');
      setIsSaving(false);
      return;
    }

    if ((isSalesUser || isPartner) && salesUser && !salesUser._id) {

      setSaveError('User ID is missing. Please log out and log in again to refresh your session.');
      setIsSaving(false);
      return;
    }

    if ((!isSuperAdmin && !salesUser) || !selectedProduct || !userInfo) {

      setSaveError('Missing required data for saving quotation');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    // Get full product with prices from products.ts if needed
    // Check both 'id' and 'productId' fields
    const productId = selectedProduct?.id || selectedProduct?.productId;
    let fullProduct = selectedProduct;

    if (productId) {
      const productFromList = products.find(p => p.id === productId);
      if (productFromList) {
        // Merge: Start with productFromList (has prices), then add any additional fields from selectedProduct
        // But preserve price fields from productFromList to ensure they're not overwritten
        fullProduct = {
          ...productFromList,
          ...selectedProduct,
          // Ensure price fields from products.ts are preserved (not overwritten by selectedProduct)
          price: productFromList.price ?? selectedProduct.price,
          resellerPrice: productFromList.resellerPrice ?? selectedProduct.resellerPrice,
          siChannelPrice: productFromList.siChannelPrice ?? selectedProduct.siChannelPrice,
          prices: productFromList.prices ?? selectedProduct.prices,
          // Ensure id is set (use productFromList.id which is the canonical id)
          id: productFromList.id
        };
        console.log('✅ Found full product from products.ts:', productId, 'Has prices:', {
          price: fullProduct.price,
          resellerPrice: fullProduct.resellerPrice,
          siChannelPrice: fullProduct.siChannelPrice,
          prices: fullProduct.prices
        });
      } else {
        console.warn('⚠️ Product not found in products.ts:', productId, 'Using selectedProduct as-is');
        console.warn('SelectedProduct prices:', {
          price: selectedProduct?.price,
          resellerPrice: selectedProduct?.resellerPrice,
          siChannelPrice: selectedProduct?.siChannelPrice
        });
        // Ensure id is set even if product not found
        if (!fullProduct.id && fullProduct.productId) {
          fullProduct = { ...fullProduct, id: fullProduct.productId };
        }
      }
    } else {
      console.warn('⚠️ No productId found in selectedProduct. Product:', selectedProduct);
      // Try to extract productId from nested structure
      if (selectedProduct && typeof selectedProduct === 'object') {
        const extractedId = (selectedProduct as any).product?.id || (selectedProduct as any).product?.productId;
        if (extractedId) {
          console.log('⚠️ Found productId in nested structure, trying lookup:', extractedId);
          const productFromList = products.find(p => p.id === extractedId);
          if (productFromList) {
            fullProduct = {
              ...productFromList,
              ...selectedProduct,
              price: productFromList.price ?? (selectedProduct as any).price,
              resellerPrice: productFromList.resellerPrice ?? (selectedProduct as any).resellerPrice,
              siChannelPrice: productFromList.siChannelPrice ?? (selectedProduct as any).siChannelPrice,
              prices: productFromList.prices ?? (selectedProduct as any).prices,
              id: productFromList.id
            };
            console.log('✅ Found product using nested productId');
          }
        }
      }
    }

    let pdfBlob: Blob | null = generatedPdfBlob || null;
    let pdfUrl: string | null = pdfDownloadUrl || null;

    if (!pdfBlob || !pdfUrl) {
      try {

        const { generateConfigurationPdf } = await import('../utils/docxGenerator');

        const userTypeForCalc = getUserType();
        console.log('PDF Generation - quotationId:', quotationId, 'exactPricingBreakdown exists:', !!exactPricingBreakdown);

        // Use exactPricingBreakdown if available (when editing), otherwise calculate
        let exactPricingBreakdownForPdf: any;

        // Always use exactPricingBreakdown if available (when editing/viewing existing quotation)
        if (exactPricingBreakdown) {
          // Use existing pricing breakdown when editing
          console.log('✅ Using existing exactPricingBreakdown for PDF generation');
          exactPricingBreakdownForPdf = {
            unitPrice: exactPricingBreakdown.unitPrice,
            quantity: exactPricingBreakdown.quantity,
            subtotal: exactPricingBreakdown.subtotal || exactPricingBreakdown.productSubtotal,
            gstAmount: exactPricingBreakdown.gstAmount || exactPricingBreakdown.productGST,
            processorPrice: exactPricingBreakdown.processorPrice,
            processorGst: exactPricingBreakdown.processorGst || exactPricingBreakdown.processorGST,
            grandTotal: exactPricingBreakdown.grandTotal
          };
        } else {
          // Calculate new pricing using full product with prices
          console.log('⚠️ Calculating new pricing. Product:', {
            id: fullProduct?.id,
            name: fullProduct?.name,
            price: fullProduct?.price,
            resellerPrice: fullProduct?.resellerPrice,
            siChannelPrice: fullProduct?.siChannelPrice,
            prices: fullProduct?.prices,
            userType: userTypeForCalc
          });

          const pricingResult = calculateCentralizedPricing(
            fullProduct,
            cabinetGrid,
            processor || null,
            userTypeForCalc,
            config || { width: 2400, height: 1010, unit: 'mm' },
            customPricing
          );

          console.log('Pricing result:', {
            isAvailable: pricingResult.isAvailable,
            unitPrice: pricingResult.unitPrice,
            grandTotal: pricingResult.grandTotal
          });

          if (!pricingResult.isAvailable) {
            alert('❌ Price is not available for this product configuration. Please contact sales for pricing information.');
            setIsSaving(false);
            return;
          }

          exactPricingBreakdownForPdf = {
            unitPrice: pricingResult.unitPrice,
            quantity: pricingResult.quantity,
            subtotal: pricingResult.productSubtotal,
            gstAmount: pricingResult.productGST,
            processorPrice: pricingResult.processorPrice,
            processorGst: pricingResult.processorGST,
            grandTotal: pricingResult.grandTotal
          };
        }

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

      } catch (pdfGenError: any) {

      }
    } else {

    }

    // IMPORTANT: Preserve the original quotationId prop if it exists (for editing)
    // Only generate a new ID if we're creating a new quotation (quotationId prop is undefined/empty)
    let finalQuotationId = quotationId && quotationId.trim() !== '' ? quotationId : undefined;

    if (!finalQuotationId) {
      // Only generate new ID if we're creating (quotationId prop was not provided)
      console.log('📝 Creating new quotation - generating quotation ID');
      const nameForId = isSuperAdmin && selectedSalesPersonId
        ? salesPersons.find(p => p._id === selectedSalesPersonId)?.name || salesUser?.name
        : salesUser?.name;
      if (nameForId) {
        try {
          finalQuotationId = await QuotationIdGenerator.generateQuotationId(nameForId);

        } catch (idError: any) {

          const now = new Date();
          const timestamp = now.getTime().toString().slice(-6); // Last 6 digits of timestamp
          const firstName = nameForId.trim().split(' ')[0].toUpperCase();
          finalQuotationId = `ORION/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${firstName}/${timestamp}`;

        }
      } else {
        setSaveError('Unable to generate quotation ID - missing sales person name');
        setIsSaving(false);
        return;
      }
    } else {
      console.log('🔄 Editing existing quotation - using quotationId:', finalQuotationId);
    }

    let finalSalesUserId: string | undefined;
    let finalSalesUserName: string | undefined;

    if (isSuperAdmin) {

      if (selectedSalesPersonId) {

        const selectedPerson = salesPersons.find(p => {

          const personId = p._id?.toString();
          const selectedId = selectedSalesPersonId?.toString();
          return personId === selectedId;
        });

        if (selectedPerson) {

          finalSalesUserId = selectedPerson._id?.toString();
          finalSalesUserName = selectedPerson.name;

        } else {

          finalSalesUserId = salesUser?._id;
          finalSalesUserName = salesUser?.name;

        }
      } else {

        finalSalesUserId = salesUser?._id?.toString();
        finalSalesUserName = salesUser?.name;

      }
    } else {

      finalSalesUserId = salesUser?._id?.toString();
      finalSalesUserName = salesUser?.name;

    }

    if (!finalSalesUserId || !finalSalesUserName) {

      setSaveError('Missing sales user information. Please ensure you are logged in as a sales user or partner.');
      setIsSaving(false);
      return;
    }

    let saveSuccessful = false;

    const comprehensiveProductDetails = {
      productId: fullProduct.id,
      productName: fullProduct.name,
      price: fullProduct.price,
      resellerPrice: fullProduct.resellerPrice,
      siChannelPrice: fullProduct.siChannelPrice,
      prices: fullProduct.prices,
      config: config || { width: 2400, height: 1010, unit: 'mm' },
      category: fullProduct.category,

      pixelPitch: fullProduct.pixelPitch,
      resolution: fullProduct.resolution,
      cabinetDimensions: fullProduct.cabinetDimensions,
      moduleDimensions: fullProduct.moduleDimensions,
      moduleResolution: fullProduct.moduleResolution,
      moduleQuantity: fullProduct.moduleQuantity,
      pixelDensity: fullProduct.pixelDensity,
      brightness: fullProduct.brightness,
      refreshRate: fullProduct.refreshRate,
      environment: fullProduct.environment,
      maxPowerConsumption: fullProduct.maxPowerConsumption,
      avgPowerConsumption: fullProduct.avgPowerConsumption,
      weightPerCabinet: fullProduct.weightPerCabinet,

      cabinetGrid: cabinetGrid,
      displaySize: fullProduct.cabinetDimensions && cabinetGrid ? {
        width: Number((fullProduct.cabinetDimensions.width * (cabinetGrid?.columns || 1) / 1000).toFixed(2)),
        height: Number((fullProduct.cabinetDimensions.height * (cabinetGrid?.rows || 1) / 1000).toFixed(2))
      } : undefined,
      aspectRatio: fullProduct.resolution ?
        calculateAspectRatio(fullProduct.resolution.width, fullProduct.resolution.height) : undefined,
      processor: processor,
      mode: mode,

      userType: getUserType(),
      userTypeDisplayName: getUserTypeDisplayName(getUserType()),
      generatedAt: new Date().toISOString()
    };

    const userTypeForCalc = getUserType();

    let finalPricingResult: any;
    let finalTotalPrice: number;

    // Always use exactPricingBreakdown if available (when editing/viewing existing quotation)
    if (exactPricingBreakdown) {
      console.log('✅ Using existing exactPricingBreakdown for save');
      finalPricingResult = exactPricingBreakdown;
      finalTotalPrice = exactPricingBreakdown.grandTotal;
    } else {
      console.log('⚠️ No exactPricingBreakdown, calculating new pricing for save');
      const correctTotalPrice = calculateCorrectTotalPrice(
        fullProduct,
        cabinetGrid,
        processor || null,
        userTypeForCalc,
        config || { width: 2400, height: 1010, unit: 'mm' },
        customPricing
      );

      if (correctTotalPrice === null) {
        console.error('❌ calculateCorrectTotalPrice returned null. Product:', {
          id: fullProduct?.id,
          name: fullProduct?.name,
          price: fullProduct?.price,
          resellerPrice: fullProduct?.resellerPrice,
          siChannelPrice: fullProduct?.siChannelPrice,
          prices: fullProduct?.prices,
          userType: userTypeForCalc
        });
        alert('❌ Price is not available for this product configuration. Please contact sales for pricing information.');
        setIsSaving(false);
        return;
      }

      const pricingResult = calculateCentralizedPricing(
        fullProduct,
        cabinetGrid,
        processor || null,
        userTypeForCalc,
        config || { width: 2400, height: 1010, unit: 'mm' },
        customPricing
      );

      if (!pricingResult.isAvailable) {
        alert('❌ Price is not available for this product configuration. Please contact sales for pricing information.');
        setIsSaving(false);
        return;
      }

      finalPricingResult = pricingResult;
      finalTotalPrice = correctTotalPrice;
    }

    const finalHtmlContent = htmlContent;

    // Extract customer info from userInfo (handles both formats)
    const customerName = userInfo?.fullName?.trim() || userInfo?.customerName?.trim() || '';
    const customerEmail = userInfo?.email?.trim() || userInfo?.customerEmail?.trim() || '';
    const customerPhone = userInfo?.phoneNumber?.trim() || userInfo?.customerPhone?.trim() || '';
    const productName = selectedProduct?.name || selectedProduct?.productName || 'Unknown Product';

    // Validate required fields
    if (!finalQuotationId) {
      setSaveError('Missing quotation ID. Please try again.');
      setIsSaving(false);
      return;
    }
    if (!customerName) {
      setSaveError('Missing customer name. Please ensure customer information is provided.');
      setIsSaving(false);
      return;
    }
    if (!customerEmail) {
      setSaveError('Missing customer email. Please ensure customer information is provided.');
      setIsSaving(false);
      return;
    }
    if (!productName || productName === 'Unknown Product') {
      setSaveError('Missing product name. Please ensure product information is available.');
      setIsSaving(false);
      return;
    }

    const exactQuotationData = {
      // When editing, use the original quotationId prop; when creating, use the generated finalQuotationId
      quotationId: (quotationId && quotationId.trim() !== '') ? quotationId : finalQuotationId,
      customerName: customerName,
      customerEmail: customerEmail,
      customerPhone: customerPhone,
      productName: productName,
      message: 'Quotation saved from PDF view',
      userType: userTypeForCalc,
      userTypeDisplayName: getUserTypeDisplayName(userTypeForCalc),
      totalPrice: finalTotalPrice,  // CRITICAL: Grand Total with GST (and discount if applied) - matches PDF exactly

      pdfBase64: undefined as string | undefined,

      pdfPage6HTML: finalHtmlContent,

      salesUserId: finalSalesUserId,
      salesUserName: finalSalesUserName,

      discountType: null,
      discountPercent: 0,

      exactPricingBreakdown: {
        unitPrice: finalPricingResult.unitPrice,
        quantity: finalPricingResult.quantity,
        subtotal: finalPricingResult.productSubtotal,
        gstRate: 18,
        gstAmount: finalPricingResult.productGST,
        processorPrice: finalPricingResult.processorPrice,
        processorGst: finalPricingResult.processorGST,
        grandTotal: finalTotalPrice
      },

      exactProductSpecs: {
        productName: productName,
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

      productDetails: comprehensiveProductDetails,

      config: config || { width: 2400, height: 1010, unit: 'mm' },

      createdAt: new Date().toISOString()
    };

    try {


      // Ensure pdfBlob is clean for generation
      // pdfBlob = null; 

      try {
        const { generateConfigurationPdf } = await import('../utils/docxGenerator');

        const exactPricingBreakdownForPdf = {
          unitPrice: finalPricingResult.unitPrice,
          quantity: finalPricingResult.quantity,
          subtotal: finalPricingResult.productSubtotal,
          gstAmount: finalPricingResult.productGST,
          processorPrice: finalPricingResult.processorPrice,
          processorGst: finalPricingResult.processorGST,
          grandTotal: finalTotalPrice
        };

        const uiUserType: string | undefined = userInfo?.userType;
        const legacyUserTypeForPricing: 'End User' | 'Reseller' | 'Channel' =
          uiUserType === 'SI/Channel Partner'
            ? 'Channel'
            : (uiUserType === 'Reseller' ? 'Reseller' : 'End User');

        // Assign to OUTER pdfBlob
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

      } catch (pdfError: any) {

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

        onDownload();
        return;
      }

      if (!pdfBlob) {
        throw new Error('PDF Blob generation failed unexpectedly.');
      }

      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(pdfBlob!); // pdfBlob is guaranteed not null here due to check above
      });

      exactQuotationData.pdfBase64 = pdfBase64;

      // ✅ Create or find/update client before saving quotation
      let clientId: string | undefined;
      try {
        const clientData = {
          name: customerName.trim(),
          email: customerEmail.trim(),
          phone: customerPhone.trim(),
          projectTitle: userInfo?.projectTitle?.trim() || '',
          location: userInfo?.address?.trim() || '',
          company: '',
          notes: ''
        };

        // If updating an existing quotation and it has a clientId, update the client
        if (finalQuotationId && quotationId && propClientId) {
          // Update existing client
          try {
            // Convert clientId to string if needed
            let clientIdString: string;
            if (typeof propClientId === 'string') {
              clientIdString = propClientId;
            } else if ('$oid' in propClientId && propClientId.$oid) {
              clientIdString = propClientId.$oid;
            } else if ('_id' in propClientId && propClientId._id) {
              clientIdString = String(propClientId._id);
            } else if (typeof propClientId.toString === 'function') {
              clientIdString = propClientId.toString();
            } else {
              clientIdString = String(propClientId);
            }

            const updateResponse = await clientAPI.updateClient(clientIdString, clientData);
            if (updateResponse.success && updateResponse.client) {
              clientId = updateResponse.client._id;
              console.log('✅ Client updated from PDF save:', clientId);
            }
          } catch (updateError: any) {
            console.error('⚠️ Failed to update client from PDF save:', updateError);
            // Fallback to findOrCreate
            const clientResponse = await clientAPI.findOrCreateClient(clientData);
            if (clientResponse.success && clientResponse.client) {
              clientId = clientResponse.client._id;
              console.log('✅ Client found/created (fallback) from PDF save:', clientId);
            }
          }
        } else {
          // Creating new quotation or no clientId, find or create client
          const clientResponse = await clientAPI.findOrCreateClient(clientData);
          if (clientResponse.success && clientResponse.client) {
            clientId = clientResponse.client._id;
            console.log('✅ Client created/found from PDF save:', clientId);
          }
        }
      } catch (clientError: any) {
        console.error('⚠️ Failed to create/find client from PDF save:', clientError);
        // Continue with quotation save even if client creation fails
      }

      // Add clientId to quotation data if available
      if (clientId) {
        (exactQuotationData as any).clientId = clientId;
      }

      // If quotationId prop exists (passed from parent), update the existing quotation; otherwise create a new one
      // The quotationId prop indicates we're editing an existing quotation
      // IMPORTANT: Use the original quotationId prop (not finalQuotationId) to determine if we're editing
      let saveResult;
      const isEditing = isEditingProp === true;

      if (isEditing) {
        // Update existing quotation (quotationId prop was passed, meaning we're editing)
        console.log('🔄 Updating existing quotation. quotationId prop:', quotationId, 'finalQuotationId:', finalQuotationId);
        // Use the original quotationId prop for the update, not finalQuotationId
        saveResult = await salesAPI.updateQuotation(quotationId ?? finalQuotationId!, exactQuotationData);
      } else {
        // Create new quotation (no quotationId prop or empty string, meaning we're creating)
        console.log('➕ Creating new quotation. finalQuotationId:', finalQuotationId);
        saveResult = await salesAPI.saveQuotation(exactQuotationData);
      }

      setSaveSuccess(true);
      saveSuccessful = true;

      setGeneratedPdfBlob(pdfBlob);
      const url = window.URL.createObjectURL(pdfBlob);
      setPdfDownloadUrl(url);

      if (saveSuccessful) {

        triggerPdfDownload(pdfBlob, fileName, setGeneratedPdfBlob, setPdfDownloadUrl);
      }

      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);

    } catch (error: any) {

      if (error.message && error.message.includes('already exists')) {
        try {
          console.log('⚠️ Quotation already exists, attempting update instead...', finalQuotationId);
          // Use the finalQuotationId (which is what we tried to save) for the update
          await salesAPI.updateQuotation(finalQuotationId!, exactQuotationData);

          setSaveSuccess(true);
          saveSuccessful = true;

          if (pdfBlob) {
            setGeneratedPdfBlob(pdfBlob);
            const url = window.URL.createObjectURL(pdfBlob);
            setPdfDownloadUrl(url);

            // If save/update was successful, trigger the download with the CURRENT blob (no need to regenerate)
            if (saveSuccessful) {
              triggerPdfDownload(pdfBlob, fileName, setGeneratedPdfBlob, setPdfDownloadUrl);
            }
          }

          setTimeout(() => {
            setSaveSuccess(false);
          }, 3000);

        } catch (updateError: any) {
          console.error('Update after save failed:', updateError);
          alert(`Failed to update existing quotation: ${updateError.message}`);
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

              {/* Discount Section removed as it's now inline in SalesPersonDetailsModal */}

              {/* Combined Save & Download button for sales users and superadmin */}
              {((salesUser || (userRole === 'super' || userRole === 'super_admin')) && userInfo) ? (
                <button
                  type="button"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    if (isSaving) {

                      return;
                    }

                    setIsSaving(true);

                    try {

                      if (!selectedProduct) {
                        throw new Error('Missing selectedProduct');
                      }
                      if (!config) {
                        throw new Error('Missing config');
                      }
                      if (!userInfo) {
                        throw new Error('Missing userInfo');
                      }

                      const { generateConfigurationPdf } = await import('../utils/docxGenerator');

                      const userTypeForCalc = getUserType();
                      const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';

                      const pricingResult = calculateCentralizedPricing(
                        selectedProduct,
                        cabinetGrid,
                        processor || null,
                        userTypeForCalc,
                        config || { width: 2400, height: 1010, unit: 'mm' },
                        customPricing
                      );

                      let finalPricingResult = pricingResult as any;

                      const exactPricingBreakdownForPdf = {
                        unitPrice: finalPricingResult.unitPrice,
                        quantity: finalPricingResult.quantity,
                        subtotal: finalPricingResult.productSubtotal,
                        gstAmount: finalPricingResult.productGST,
                        processorPrice: finalPricingResult.processorPrice,
                        processorGst: finalPricingResult.processorGST,
                        grandTotal: finalPricingResult.grandTotal
                      };

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

                      const pdfUrl = window.URL.createObjectURL(pdfBlob);

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

                      void link.offsetWidth;

                      link.click();

                      setTimeout(() => {
                        if (link.parentNode) {
                          document.body.removeChild(link);
                        }

                      }, 1000);

                      setGeneratedPdfBlob(pdfBlob);
                      setPdfDownloadUrl(pdfUrl);

                    } catch (pdfError: any) {

                      alert(`Error generating PDF: ${pdfError.message}. Please check the console for details.`);
                      setIsSaving(false);
                      return;
                    }

                    handleSave(e).catch((saveError: any) => {

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
                  onClick={() => onDownload()}
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
    </div >
  );
};
