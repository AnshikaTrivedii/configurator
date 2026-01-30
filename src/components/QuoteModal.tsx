import React, { useState, useEffect } from 'react';
import { X, Mail, User, Phone, MessageSquare, Package, ChevronDown } from 'lucide-react';
import { submitQuoteRequest, QuoteRequest } from '../api/quote';
import { salesAPI } from '../api/sales';
import { clientAPI } from '../api/clients';
import { Product, SalesUser } from '../types';
import QuotationIdGenerator from '../utils/quotationIdGenerator';
import { calculateUserSpecificPrice } from '../utils/pricingCalculator';
import { getProcessorPrice } from '../utils/processorPrices';
import { calculateCentralizedPricing } from '../utils/centralizedPricing';
import { applyDiscount, DiscountInfo } from '../utils/discountCalculator';

interface ProductWithPricing extends Product {
  prices?: {
    cabinet: { endCustomer: number; siChannel: number; reseller: number };
    curveLock?: { endCustomer: number; siChannel: number; reseller: number };
  };
}

function isJumboSeriesProduct(product: ProductWithPricing): boolean {
  return product.category?.toLowerCase().includes('jumbo') ||
    product.id?.toLowerCase().startsWith('jumbo-') ||
    product.name?.toLowerCase().includes('jumbo series');
}

function calculateCorrectTotalPrice(
  product: ProductWithPricing,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  processor: string | null | undefined,
  userType: string,
  config: { width: number; height: number; unit: string },
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }
): number {
  const METERS_TO_FEET = 3.2808399;

  let pdfUserType: 'End User' | 'Reseller' | 'Channel' = 'End User';
  if (userType === 'reseller') {
    pdfUserType = 'Reseller';
  } else if (userType === 'siChannel') {
    pdfUserType = 'Channel';
  }

  let unitPrice = 0;

  if (product.category?.toLowerCase().includes('rental') && product.prices) {
    if (pdfUserType === 'Reseller') {
      unitPrice = product.prices.cabinet.reseller;
    } else if (pdfUserType === 'Channel') {
      unitPrice = product.prices.cabinet.siChannel;
    } else {
      unitPrice = product.prices.cabinet.endCustomer;
    }
  } else {

    if (pdfUserType === 'Reseller' && typeof product.resellerPrice === 'number') {
      unitPrice = product.resellerPrice;
    } else if (pdfUserType === 'Channel' && typeof product.siChannelPrice === 'number') {
      unitPrice = product.siChannelPrice;
    } else if (typeof product.price === 'number') {
      unitPrice = product.price;
    } else if (typeof product.price === 'string') {
      const parsedPrice = parseFloat(product.price);
      unitPrice = isNaN(parsedPrice) ? 5300 : parsedPrice;
    } else {
      unitPrice = 5300; // Default fallback
    }
  }

  let quantity = 0;

  if (product.category?.toLowerCase().includes('rental')) {

    quantity = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
  } else if (isJumboSeriesProduct(product)) {

    const pixelPitch = product.pixelPitch;

    if (pixelPitch === 4 || pixelPitch === 2.5) {

      const widthInFeet = 7.34;
      const heightInFeet = 4.72;
      const fixedQuantity = widthInFeet * heightInFeet;

      quantity = Math.round(fixedQuantity * 100) / 100; // 34.64 sqft
    } else if (pixelPitch === 3 || pixelPitch === 6) {

      const widthInFeet = 6.92;
      const heightInFeet = 5.04;
      const fixedQuantity = widthInFeet * heightInFeet;

      quantity = Math.round(fixedQuantity * 100) / 100; // 34.88 sqft
    } else {
      quantity = 1; // Fallback
    }
  } else {

    const widthInMeters = config.width / 1000;
    const heightInMeters = config.height / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    const rawQuantity = widthInFeet * heightInFeet;

    quantity = Math.round(rawQuantity * 100) / 100;

    quantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  }

  const subtotal = unitPrice * quantity;

  let processorPrice = 0;
  if (processor && !isJumboSeriesProduct(product)) {

    processorPrice = getProcessorPrice(processor, pdfUserType);

  } else if (processor && isJumboSeriesProduct(product)) {

  }

  const gstProduct = subtotal * 0.18;
  const totalProduct = subtotal + gstProduct;

  const gstProcessor = processorPrice * 0.18;
  const totalProcessor = processorPrice + gstProcessor;

  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;

  let structureBasePrice: number;
  let installationBasePrice: number;

  if (customPricing?.enabled && customPricing.structurePrice !== null && customPricing.installationPrice !== null) {

    structureBasePrice = customPricing.structurePrice;
    installationBasePrice = customPricing.installationPrice;
  } else {

    const normalizedEnv = product.environment?.toLowerCase().trim();
    if (normalizedEnv === 'indoor') {

      const numberOfCabinets = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
      structureBasePrice = numberOfCabinets * 4000;
    } else {

      structureBasePrice = screenAreaSqFt * 2500;
    }
    installationBasePrice = screenAreaSqFt * 500;
  }

  const structureGST = structureBasePrice * 0.18;
  const totalStructure = structureBasePrice + structureGST;

  const installationGST = installationBasePrice * 0.18;
  const totalInstallation = installationBasePrice + installationGST;

  const grandTotal = totalProduct + totalProcessor + totalStructure + totalInstallation;

  return Math.round(grandTotal);
}

type QuoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  existingQuotation?: {
    quotationId: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    message: string;
    userType: 'End User' | 'SI/Channel Partner' | 'Reseller';
  };
  selectedProduct?: Product;
  config?: {
    width: number;
    height: number;
    unit: string;
  };
  cabinetGrid?: { columns: number; rows: number };
  processor?: string;
  mode?: string;
  userInfo?: {
    fullName: string;
    email: string;
    phoneNumber: string;
    projectTitle?: string;
    address?: string;
    validity?: string;
    paymentTerms?: string;
    warranty?: string;
    userType: 'End User' | 'SI/Channel Partner' | 'Reseller';
  };
  title?: string;
  submitButtonText?: string;
  salesUser?: SalesUser | null;
  userRole?: 'normal' | 'sales' | 'super' | 'super_admin' | 'partner';
  quotationId?: string;
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  };
  onCustomPricingChange?: (pricing: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }) => void;
  clientId?: string; // Client ID for updating existing client
};

const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

const calculateAspectRatio = (width: number, height: number): string => {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
};

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

const getProcessorPriceLocal = (processor: string, userType: string): number => {

  let pdfUserType: 'End User' | 'Reseller' | 'Channel' = 'End User';
  if (userType === 'reseller') {
    pdfUserType = 'Reseller';
  } else if (userType === 'siChannel') {
    pdfUserType = 'Channel';
  }

  return getProcessorPrice(processor, pdfUserType);
};

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedProduct,
  cabinetGrid,
  processor,
  mode,
  userInfo,
  title,
  submitButtonText,
  existingQuotation,
  salesUser,
  userRole,
  quotationId,
  customPricing: externalCustomPricing,
  onCustomPricingChange,
  config,
  clientId
}) => {
  const effectiveTitle = title || (existingQuotation ? 'Edit Quote' : 'Get a Quote');
  const effectiveSubmitButtonText = submitButtonText || (existingQuotation ? 'Update Quote' : 'Submit Quote Request');

  const [message, setMessage] = useState(userInfo?.fullName ? '' : (existingQuotation?.message || ''));
  const [customerName, setCustomerName] = useState(userInfo?.fullName || existingQuotation?.customerName || '');
  const [customerEmail, setCustomerEmail] = useState(userInfo?.email || existingQuotation?.customerEmail || '');
  const [customerPhone, setCustomerPhone] = useState(userInfo?.phoneNumber || existingQuotation?.customerPhone || '');
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);
  const [loadingSalesPersons, setLoadingSalesPersons] = useState(false);

  type UserTypeDisplay = 'End User' | 'SI/Channel Partner' | 'Reseller';
  const [selectedUserType, setSelectedUserType] = useState<UserTypeDisplay>(
    userInfo?.userType === 'Reseller' ? 'Reseller' :
      userInfo?.userType === 'SI/Channel Partner' ? 'SI/Channel Partner' :
        existingQuotation?.userType ? existingQuotation.userType :
          'End User'
  );

  const allowedCustomerTypes = salesUser?.allowedCustomerTypes || [];
  const isPartner = userRole === 'partner';

  const availableUserTypes: UserTypeDisplay[] = React.useMemo(() => {
    if (isPartner && allowedCustomerTypes.length > 0) {

      const types: UserTypeDisplay[] = [];
      if (allowedCustomerTypes.includes('endUser')) types.push('End User');
      if (allowedCustomerTypes.includes('siChannel')) types.push('SI/Channel Partner');
      if (allowedCustomerTypes.includes('reseller')) types.push('Reseller');
      return types.length > 0 ? types : ['End User']; // Fallback to End User if empty
    }

    return ['End User', 'SI/Channel Partner', 'Reseller'];
  }, [isPartner, allowedCustomerTypes]);

  React.useEffect(() => {
    if (isPartner && allowedCustomerTypes.length > 0) {
      if (!availableUserTypes.includes(selectedUserType)) {

        setSelectedUserType(availableUserTypes[0]);
      }
    }
  }, [isPartner, allowedCustomerTypes, availableUserTypes, selectedUserType]);

  const [discountType, setDiscountType] = useState<'led' | 'controller' | 'total' | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  const [internalCustomPricingEnabled, setInternalCustomPricingEnabled] = useState(externalCustomPricing?.enabled || false);
  const [internalCustomStructurePrice, setInternalCustomStructurePrice] = useState<number | null>(externalCustomPricing?.structurePrice || null);
  const [internalCustomInstallationPrice, setInternalCustomInstallationPrice] = useState<number | null>(externalCustomPricing?.installationPrice || null);

  const customPricingEnabled = externalCustomPricing?.enabled ?? internalCustomPricingEnabled;
  const customStructurePrice = externalCustomPricing?.structurePrice ?? internalCustomStructurePrice;
  const customInstallationPrice = externalCustomPricing?.installationPrice ?? internalCustomInstallationPrice;

  const updateCustomPricing = (enabled: boolean, structurePrice: number | null, installationPrice: number | null) => {
    if (onCustomPricingChange) {
      onCustomPricingChange({
        enabled,
        structurePrice,
        installationPrice
      });
    } else {
      setInternalCustomPricingEnabled(enabled);
      setInternalCustomStructurePrice(structurePrice);
      setInternalCustomInstallationPrice(installationPrice);
    }
  };

  React.useEffect(() => {
    if (userInfo) {
      setCustomerName(userInfo.fullName);
      setCustomerEmail(userInfo.email);
      setCustomerPhone(userInfo.phoneNumber);
      setSelectedUserType(userInfo.userType);
    }
  }, [userInfo]);

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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const getUserType = (): 'endUser' | 'reseller' | 'siChannel' => {
    switch (selectedUserType) {
      case 'Reseller':
        return 'reseller';
      case 'SI/Channel Partner':
        return 'siChannel';
      case 'End User':
      default:
        return 'endUser';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }

    if (!customerName || customerName.trim() === '') {
      alert('Please enter your name');
      return;
    }

    if (!customerEmail || customerEmail.trim() === '') {
      alert('Please enter your email address');
      return;
    }

    if (!customerPhone || customerPhone.trim() === '') {
      alert('Please enter your phone number');
      return;
    }

    if (!selectedUserType) {
      alert('Please select a user type');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      alert('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const userType = getUserType();

      const quoteData: QuoteRequest = {

        productName: selectedProduct.name,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        message: message.trim() || 'No additional message provided',
        userTypeDisplayName: getUserTypeDisplayName(getUserType()),

        product: {

          id: selectedProduct.id,
          name: selectedProduct.name,
          category: selectedProduct.category,

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

          userType: userType
        },
        cabinetGrid: cabinetGrid,
        displaySize: selectedProduct.cabinetDimensions && cabinetGrid ? {
          width: Number((selectedProduct.cabinetDimensions.width * (cabinetGrid?.columns || 1) / 1000).toFixed(2)),
          height: Number((selectedProduct.cabinetDimensions.height * (cabinetGrid?.rows || 1) / 1000).toFixed(2))
        } : undefined,
        aspectRatio: selectedProduct.resolution ?
          calculateAspectRatio(selectedProduct.resolution.width, selectedProduct.resolution.height) : undefined,

        processor: processor,
        mode: mode,

        userType: userType,

      };

      if (existingQuotation) {

        const configForCalc = config || { width: 2400, height: 1010, unit: 'mm' };

        const customPricingObj = customPricingEnabled && customStructurePrice !== null && customInstallationPrice !== null
          ? {
            enabled: true,
            structurePrice: customStructurePrice,
            installationPrice: customInstallationPrice
          }
          : undefined;

        const newTotalPrice = calculateCorrectTotalPrice(
          selectedProduct as any,
          cabinetGrid,
          processor,
          userType,
          configForCalc,
          customPricingObj
        );

        const pdfUserType = selectedUserType === 'Reseller' ? 'Reseller' : (selectedUserType === 'SI/Channel Partner' ? 'Channel' : 'End User');

        let unitPrice = 0;
        if (selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.prices) {
          if (pdfUserType === 'Reseller') unitPrice = selectedProduct.prices.cabinet.reseller;
          else if (pdfUserType === 'Channel') unitPrice = selectedProduct.prices.cabinet.siChannel;
          else unitPrice = selectedProduct.prices.cabinet.endCustomer;
        } else {
          if (pdfUserType === 'Reseller') unitPrice = Number(selectedProduct.resellerPrice) || 0;
          else if (pdfUserType === 'Channel') unitPrice = Number(selectedProduct.siChannelPrice) || 0;
          else unitPrice = Number(selectedProduct.price) || 0;
        }

        let quantity = 0;
        if (selectedProduct.category?.toLowerCase().includes('rental')) {
          quantity = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
        } else if (isJumboSeriesProduct(selectedProduct as any)) {

          const pixelPitch = selectedProduct.pixelPitch;
          if (pixelPitch === 4 || pixelPitch === 2.5) {
            quantity = 34.64;
          } else if (pixelPitch === 3 || pixelPitch === 6) {
            quantity = 34.88;
          } else {
            quantity = 1;
          }
        } else {

          const METERS_TO_FEET = 3.2808399;
          const widthInMeters = configForCalc.width / 1000;
          const heightInMeters = configForCalc.height / 1000;
          const widthInFeet = widthInMeters * METERS_TO_FEET;
          const heightInFeet = heightInMeters * METERS_TO_FEET;
          quantity = Math.round((widthInFeet * heightInFeet) * 100) / 100;
          quantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
        }

        const subtotal = unitPrice * quantity;
        const gstProduct = subtotal * 0.18;

        let processorPrice = 0;
        if (processor && !isJumboSeriesProduct(selectedProduct as any)) {
          processorPrice = getProcessorPrice(processor, pdfUserType);
        }
        const gstProcessor = processorPrice * 0.18;

        let structureBasePrice = 0;
        let installationBasePrice = 0;

        if (customPricingObj?.enabled) {
          structureBasePrice = customPricingObj.structurePrice || 0;
          installationBasePrice = customPricingObj.installationPrice || 0;
        } else {
          const METERS_TO_FEET = 3.2808399;
          const widthInMeters = configForCalc.width / 1000;
          const heightInMeters = configForCalc.height / 1000;
          const screenAreaSqFt = Math.round((widthInMeters * METERS_TO_FEET * heightInMeters * METERS_TO_FEET) * 100) / 100;

          if (selectedProduct.environment?.toLowerCase().trim() === 'indoor') {
            const numberOfCabinets = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
            structureBasePrice = numberOfCabinets * 4000;
          } else {
            structureBasePrice = screenAreaSqFt * 2500;
          }
          installationBasePrice = screenAreaSqFt * 500;
        }

        const structureGST = structureBasePrice * 0.18;
        const totalStructure = structureBasePrice + structureGST;
        const installationGST = installationBasePrice * 0.18;
        const totalInstallation = installationBasePrice + installationGST;

        const breakdown = {
          unitPrice,
          quantity,
          subtotal: subtotal,
          gstRate: 18,
          gstAmount: gstProduct, // legacy field
          productSubtotal: subtotal,
          productGST: gstProduct,
          productTotal: subtotal + gstProduct,

          processorPrice,
          processorGst: gstProcessor, // legacy field
          processorGST: gstProcessor,
          processorTotal: processorPrice + gstProcessor,

          structureCost: structureBasePrice,
          structureGST: structureGST,
          structureTotal: totalStructure,

          installationCost: installationBasePrice,
          installationGST: installationGST,
          installationTotal: totalInstallation,

          grandTotal: Math.round(newTotalPrice)
        };

        const updateData = {
          customerName: customerName.trim(),
          customerEmail: customerEmail.trim(),
          customerPhone: customerPhone.trim(),
          message: message.trim(),
          userType: userType,
          userTypeDisplayName: getUserTypeDisplayName(getUserType()),
          totalPrice: breakdown.grandTotal,
          originalTotalPrice: breakdown.grandTotal, // Updating resets any discounts

          exactPricingBreakdown: breakdown,

          originalPricingBreakdown: breakdown,

          exactProductSpecs: {
            productName: selectedProduct.name,
            category: selectedProduct.category,
            pixelPitch: selectedProduct.pixelPitch,
            resolution: selectedProduct.resolution,
            cabinetDimensions: selectedProduct.cabinetDimensions,
            displaySize: {
              width: configForCalc.width / 1000,
              height: configForCalc.height / 1000
            },
            aspectRatio: calculateAspectRatio(selectedProduct.resolution.width, selectedProduct.resolution.height),
            processor: processor,
            mode: mode,
            cabinetGrid: cabinetGrid
          },

          quotationData: {

            config: configForCalc,
            customPricing: customPricingObj,
            updatedAt: new Date().toISOString(),

            discountApplied: false,
            discountInfo: null
          }
        };

        // Update existing client or create/find new client when updating quotation
        let finalClientId: string | undefined = clientId; // Use existing clientId if provided
        try {
          const clientData = {
            name: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim(),
            projectTitle: userInfo?.projectTitle || '',
            location: userInfo?.address || '',
            company: '',
            notes: message.trim() || ''
          };

          if (clientId) {
            // Update existing client
            const updateResponse = await clientAPI.updateClient(clientId, clientData);
            if (updateResponse.success && updateResponse.client) {
              finalClientId = updateResponse.client._id;
              console.log('✅ Client updated:', updateResponse.client._id);
            }
          } else {
            // Create or find new client
            const clientResponse = await clientAPI.findOrCreateClient(clientData);
            if (clientResponse.success && clientResponse.client) {
              finalClientId = clientResponse.client._id;
              console.log('✅ Client created/found for update:', clientResponse.client._id);
            }
          }
        } catch (clientError: any) {
          console.error('⚠️ Failed to update/create client during update:', clientError);
          // Continue with quotation update even if client update fails
        }

        // Generate PDF for update
        try {
          // Dynamic import to avoid loading heavy libraries initially
          const { generateConfigurationPdf } = await import('../utils/docxGenerator');

          // Prepare data for PDF generation
          // We need to construct the full objects expected by the generator
          const currentType = getUserType();
          const pdfUserType = currentType === 'siChannel' ? 'Channel' :
            (currentType === 'reseller' ? 'Reseller' : 'End User');

          // Calculate aspect ratio for PDF if not present in config
          const aspectRatio = calculateAspectRatio(selectedProduct.resolution.width, selectedProduct.resolution.height);

          const configForPdf = {
            ...configForCalc,
            aspectRatio: aspectRatio,
            unit: configForCalc.unit as "mm" | "m" | "ft"
          };

          // Use the breakdown we already calculated
          const exactPricingBreakdownForPdf = {
            unitPrice: breakdown.unitPrice,
            quantity: breakdown.quantity,
            subtotal: breakdown.productSubtotal,
            gstAmount: breakdown.productGST,
            processorPrice: breakdown.processorPrice,
            processorGst: breakdown.processorGST,
            grandTotal: breakdown.grandTotal,
            discount: (breakdown as any).discount
          };

          const pdfBlob = await generateConfigurationPdf(
            configForPdf,
            selectedProduct,
            (cabinetGrid || { columns: 1, rows: 1 }) as any,
            processor,
            mode,
            {
              fullName: customerName.trim(),
              email: customerEmail.trim(),
              phoneNumber: customerPhone.trim(),
              projectTitle: userInfo?.projectTitle || '',
              address: userInfo?.address || '',
              userType: pdfUserType,
              validity: userInfo?.validity,
              paymentTerms: userInfo?.paymentTerms,
              warranty: userInfo?.warranty
            },
            salesUser,
            existingQuotation.quotationId,
            customPricingObj,
            exactPricingBreakdownForPdf
          );

          // Convert blob to base64
          const pdfBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const base64String = (reader.result as string).split(',')[1];
              resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(pdfBlob);
          });

          // Add pdfBase64 to updateData
          (updateData as any).pdfBase64 = pdfBase64;
          console.log('✅ Generated PDF for update, size:', pdfBase64.length);

        } catch (pdfError) {
          console.error('⚠️ Failed to generate PDF during update:', pdfError);
          // Continue with update even if PDF generation fails, but log it
          alert('Warning: Failed to regenerate PDF. The quotation data will be updated but the PDF file might remain unchanged.');
        }

        // Add clientId to update data if available

        if (finalClientId) {
          (updateData as any).clientId = finalClientId;
        }

        await salesAPI.updateQuotation(existingQuotation.quotationId, updateData);

        onSubmit(message.trim());

        setTimeout(() => {
          setIsSubmitting(false);
          setIsSubmitted(true);
          onClose();
        }, 1500);

        return;
      }

      let finalQuotationId = quotationId;
      const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';

      if (isSuperAdmin && !salesUser && !selectedSalesPersonId) {
        alert('Please select a sales person to assign this quotation to');
        setIsSubmitting(false);
        return;
      }

      if ((salesUser || isSuperAdmin) && !quotationId) {

        const nameForId = isSuperAdmin && selectedSalesPersonId
          ? salesPersons.find(p => p._id === selectedSalesPersonId)?.name || salesUser?.name
          : salesUser?.name;
        if (nameForId) {
          finalQuotationId = await QuotationIdGenerator.generateQuotationId(nameForId);

        } else {
          alert('Unable to generate quotation ID - missing sales person name');
          setIsSubmitting(false);
          return;
        }
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

      if ((salesUser || isSuperAdmin) && finalQuotationId && finalSalesUserId && finalSalesUserName) {
        let exactQuotationData: any = null;

        try {

          const comprehensiveProductDetails = {

            productId: selectedProduct.id,
            productName: selectedProduct.name,
            category: selectedProduct.category,

            price: selectedProduct.price,
            resellerPrice: selectedProduct.resellerPrice,
            siChannelPrice: selectedProduct.siChannelPrice,
            prices: selectedProduct.prices,

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

            cabinetGrid: cabinetGrid,
            displaySize: selectedProduct.cabinetDimensions && cabinetGrid ? {
              width: Number((selectedProduct.cabinetDimensions.width * (cabinetGrid?.columns || 1) / 1000).toFixed(2)),
              height: Number((selectedProduct.cabinetDimensions.height * (cabinetGrid?.rows || 1) / 1000).toFixed(2))
            } : undefined,
            aspectRatio: selectedProduct.resolution ?
              calculateAspectRatio(selectedProduct.resolution.width, selectedProduct.resolution.height) : undefined,
            processor: processor,
            mode: mode,

            userType: userType,
            userTypeDisplayName: getUserTypeDisplayName(userType),

            generatedAt: new Date().toISOString()
          };

          const configForCalc = config || { width: 2400, height: 1010, unit: 'mm' };

          const customPricingObj = customPricingEnabled && customStructurePrice !== null && customInstallationPrice !== null
            ? {
              enabled: true,
              structurePrice: customStructurePrice,
              installationPrice: customInstallationPrice
            }
            : undefined;

          const correctTotalPrice = calculateCorrectTotalPrice(
            selectedProduct,
            cabinetGrid,
            processor,
            userType,
            configForCalc,
            customPricingObj
          );

          const pricingResult = calculateCentralizedPricing(
            selectedProduct,
            cabinetGrid,
            processor,
            userType,
            configForCalc,
            customPricingObj
          );

          if (!pricingResult.isAvailable) {
            alert('❌ Price is not available for this product configuration. Please contact sales for pricing information.');
            return;
          }

          let finalPricingResult = pricingResult;
          let finalTotalPrice = correctTotalPrice;
          let discountInfo: DiscountInfo | null = null;

          if (isSuperAdmin && discountType && discountPercent > 0) {
            discountInfo = {
              discountType,
              discountPercent
            };

            const discountedResult = applyDiscount(pricingResult, discountInfo);
            finalPricingResult = discountedResult;
            finalTotalPrice = discountedResult.grandTotal;

          }

          exactQuotationData = {

            quotationId: finalQuotationId,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: customerPhone.trim(),
            productName: selectedProduct.name,
            message: message.trim() || 'No additional message provided',
            userType: userType,
            userTypeDisplayName: getUserTypeDisplayName(userType),
            totalPrice: finalTotalPrice,  // CRITICAL: Grand Total with GST (and discount if applied) - matches PDF exactly
            originalTotalPrice: correctTotalPrice, // Store original total price before discount

            salesUserId: finalSalesUserId,
            salesUserName: finalSalesUserName,

            exactPricingBreakdown: {
              unitPrice: finalPricingResult.unitPrice,
              quantity: finalPricingResult.quantity,
              subtotal: finalPricingResult.productSubtotal,
              gstRate: 18,
              gstAmount: finalPricingResult.productGST,
              processorPrice: finalPricingResult.processorPrice,
              processorGst: finalPricingResult.processorGST,
              grandTotal: finalTotalPrice, // Use finalTotalPrice which includes discount if applied

              customPricing: customPricingObj ? {
                enabled: true,
                structurePrice: customStructurePrice,
                installationPrice: customInstallationPrice
              } : undefined,

              discount: discountInfo ? {
                discountType: discountInfo.discountType,
                discountPercent: discountInfo.discountPercent,

                originalProductTotal: 'originalProductTotal' in finalPricingResult ? finalPricingResult.originalProductTotal : finalPricingResult.productTotal,
                originalProcessorTotal: 'originalProcessorTotal' in finalPricingResult ? finalPricingResult.originalProcessorTotal : finalPricingResult.processorTotal,
                originalGrandTotal: 'originalGrandTotal' in finalPricingResult ? finalPricingResult.originalGrandTotal : correctTotalPrice,

                discountedProductTotal: 'discountedProductTotal' in finalPricingResult ? finalPricingResult.discountedProductTotal : finalPricingResult.productTotal,
                discountedProcessorTotal: 'discountedProcessorTotal' in finalPricingResult ? finalPricingResult.discountedProcessorTotal : finalPricingResult.processorTotal,
                discountedGrandTotal: finalTotalPrice,
                discountAmount: 'discountAmount' in finalPricingResult ? finalPricingResult.discountAmount : 0
              } : undefined
            },

            originalPricingBreakdown: {
              unitPrice: pricingResult.unitPrice,
              quantity: pricingResult.quantity,
              subtotal: pricingResult.productSubtotal,
              gstRate: 18,
              gstAmount: pricingResult.productGST,
              processorPrice: pricingResult.processorPrice,
              processorGst: pricingResult.processorGST,
              structureCost: pricingResult.structureCost,
              structureGST: pricingResult.structureGST,
              structureTotal: pricingResult.structureTotal,
              installationCost: pricingResult.installationCost,
              installationGST: pricingResult.installationGST,
              installationTotal: pricingResult.installationTotal,
              grandTotal: pricingResult.grandTotal // Always clean total
            },

            discountType: discountInfo?.discountType || null,
            discountPercent: discountInfo?.discountPercent || 0,

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

            productDetails: comprehensiveProductDetails,

            customPricing: customPricingObj ? {
              enabled: true,
              structurePrice: customStructurePrice,
              installationPrice: customInstallationPrice
            } : undefined,

            quotationData: {
              userInfo: {
                fullName: customerName,
                email: customerEmail,
                phoneNumber: customerPhone,
                userType: userType,

                projectTitle: userInfo?.projectTitle || '',
                address: userInfo?.address || '',
                validity: userInfo?.validity || undefined,
                paymentTerms: userInfo?.paymentTerms || undefined,
                warranty: userInfo?.warranty || undefined
              },
              config: configForCalc, // Also save config for reference
              cabinetGrid: cabinetGrid,
              processor: processor,
              mode: mode,
              customPricing: customPricingObj ? {
                enabled: true,
                structurePrice: customStructurePrice,
                installationPrice: customInstallationPrice
              } : undefined
            },

            createdAt: new Date().toISOString()
          };

          // Create or find client before saving quotation
          let clientId: string | undefined;
          try {
            const clientData = {
              name: customerName.trim(),
              email: customerEmail.trim(),
              phone: customerPhone.trim(),
              projectTitle: userInfo?.projectTitle || '',
              location: userInfo?.address || '',
              company: '', // Can be added to userInfo form later if needed
              notes: message.trim() || ''
            };

            const clientResponse = await clientAPI.findOrCreateClient(clientData);
            if (clientResponse.success && clientResponse.client) {
              clientId = clientResponse.client._id;
              console.log('✅ Client created/found:', clientResponse.client._id);
            }
          } catch (clientError: any) {
            console.error('⚠️ Failed to create/find client:', clientError);
            // Continue with quotation save even if client creation fails
          }

          // Add clientId to quotation data if available
          if (clientId) {
            exactQuotationData.clientId = clientId;
          }

          const saveResult = await salesAPI.saveQuotation(exactQuotationData);

          alert('Quotation saved successfully to database!');

        } catch (dbError: any) {

          if (dbError.message && dbError.message.includes('already exists')) {

            try {
              const fallbackQuotationId = QuotationIdGenerator.generateFallbackQuotationId(
                isSuperAdmin && selectedSalesPersonId
                  ? salesPersons.find(p => p._id === selectedSalesPersonId)?.name || salesUser?.name || 'Admin'
                  : salesUser?.name || 'Admin'
              );

              const fallbackQuotationData = {
                ...exactQuotationData,
                quotationId: fallbackQuotationId
              };

              const fallbackResult = await salesAPI.saveQuotation(fallbackQuotationData);

              alert('Quotation saved successfully to database with fallback ID!');

            } catch (fallbackError: any) {

              alert(`Failed to save quotation to database: ${fallbackError.message}`);
            }
          } else {

            alert(`Failed to save quotation to database: ${dbError.message}`);
          }

        }
      } else {

      }

      try {
        const result = await submitQuoteRequest(quoteData);

      } catch (externalError) {

      }

      if (onSubmit) {
        onSubmit(message);
      }
      setIsSubmitted(true);

      setTimeout(() => {
        setMessage('');
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setIsSubmitted(false);
        onClose();
      }, 10000);
    } catch (error) {

      alert('Failed to submit quote request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${isOpen ? 'fixed inset-0 bg-black/60 backdrop-blur-sm z-50' : ''}`}>
      <div className={`${isOpen ? 'bg-white w-full h-full flex flex-col' : 'w-full'}`}>
        {/* Header */}
        <div className="bg-black text-white p-8 border-b border-white/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">{effectiveTitle}</h2>
                <p className="text-gray-200 text-base">{existingQuotation ? 'Update your quotation details' : 'Request pricing for your LED display configuration'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className={`${isOpen ? 'p-8 max-w-7xl mx-auto pb-20' : 'p-6'}`}>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                {/* Left Column - Contact Information */}
                <div className="space-y-8">
                  <div>
                    <h3 className="flex items-center text-2xl font-semibold text-gray-900 mb-8">
                      <User className="w-7 h-7 mr-3 text-black" />
                      Contact Information
                    </h3>
                    <div className="space-y-6">
                      <div>
                        <label htmlFor="customerName" className="block text-base font-medium text-gray-700 mb-3">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            id="customerName"
                            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all"
                            placeholder="Enter your full name"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            disabled={isSubmitting}
                            required
                          />
                          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="customerEmail" className="block text-base font-medium text-gray-700 mb-3">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            id="customerEmail"
                            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all"
                            placeholder="Enter your email address"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            disabled={isSubmitting}
                            required
                          />
                          <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="customerPhone" className="block text-base font-medium text-gray-700 mb-3">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="tel"
                            id="customerPhone"
                            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all"
                            placeholder="Enter your phone number"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            disabled={isSubmitting}
                            required
                          />
                          <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      {/* User Type Field */}
                      <div>
                        <label htmlFor="userType" className="block text-base font-medium text-gray-700 mb-3">
                          User Type <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="userType"
                            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all appearance-none bg-white"
                            value={selectedUserType}
                            onChange={(e) => {
                              const newUserType = e.target.value as UserTypeDisplay;
                              setSelectedUserType(newUserType);
                            }}
                            disabled={isSubmitting}
                            required
                          >
                            {availableUserTypes.map(type => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>

                      {/* Sales Person Dropdown for Super Admin */}
                      {(userRole === 'super' || userRole === 'super_admin') && (
                        <div>
                          <label htmlFor="salesPerson" className="block text-base font-medium text-gray-700 mb-3">
                            Assign to Sales Person <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            {loadingSalesPersons ? (
                              <div className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm text-base bg-gray-50">
                                Loading sales persons...
                              </div>
                            ) : (
                              <>
                                <select
                                  id="salesPerson"
                                  className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all appearance-none bg-white"
                                  value={selectedSalesPersonId || ''}
                                  onChange={(e) => {
                                    const newId = e.target.value;
                                    setSelectedSalesPersonId(newId);
                                  }}
                                  disabled={isSubmitting || loadingSalesPersons}
                                  required
                                >
                                  {salesPersons.length === 0 ? (
                                    <option value="">No sales persons available</option>
                                  ) : (
                                    salesPersons.map((person) => {

                                      const personId = person._id?.toString() || person._id;
                                      return (
                                        <option key={personId} value={personId}>
                                          {person.name} ({person.email})
                                        </option>
                                      );
                                    })
                                  )}
                                </select>
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Discount Section for Super Admin */}
                      {(userRole === 'super' || userRole === 'super_admin') && (
                        <div className="pt-4 border-t border-gray-200">
                          <h3 className="text-base font-semibold text-gray-700 mb-3">Discount (Super User Only)</h3>

                          {/* Discount Type Radio Buttons */}
                          <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Apply Discount To:
                            </label>
                            <div className="space-y-2">
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="discountType"
                                  value="led"
                                  checked={discountType === 'led'}
                                  onChange={(e) => setDiscountType(e.target.value as 'led')}
                                  disabled={isSubmitting}
                                  className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500 mr-2"
                                />
                                <span className="text-sm text-gray-700">Discount on LED Screen Price</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="discountType"
                                  value="controller"
                                  checked={discountType === 'controller'}
                                  onChange={(e) => setDiscountType(e.target.value as 'controller')}
                                  disabled={isSubmitting}
                                  className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500 mr-2"
                                />
                                <span className="text-sm text-gray-700">Discount on Controller Price</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="discountType"
                                  value="total"
                                  checked={discountType === 'total'}
                                  onChange={(e) => setDiscountType(e.target.value as 'total')}
                                  disabled={isSubmitting}
                                  className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500 mr-2"
                                />
                                <span className="text-sm text-gray-700">Discount on Total Amount</span>
                              </label>
                              <label className="flex items-center">
                                <input
                                  type="radio"
                                  name="discountType"
                                  value=""
                                  checked={discountType === null}
                                  onChange={(e) => setDiscountType(null)}
                                  disabled={isSubmitting}
                                  className="w-4 h-4 text-gray-600 border-gray-300 focus:ring-gray-500 mr-2"
                                />
                                <span className="text-sm text-gray-700">No Discount</span>
                              </label>
                            </div>
                          </div>

                          {/* Discount Percentage Input */}
                          {discountType && (
                            <div>
                              <label htmlFor="discountPercent" className="block text-sm font-medium text-gray-700 mb-2">
                                Discount Percentage (%)
                              </label>
                              <input
                                type="number"
                                id="discountPercent"
                                min="0"
                                max="100"
                                step="0.01"
                                value={discountPercent}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value) || 0;
                                  setDiscountPercent(Math.max(0, Math.min(100, value)));
                                }}
                                disabled={isSubmitting}
                                placeholder="Enter discount %"
                                className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Enter a value between 0 and 100
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Custom Pricing Toggle */}
                      {(salesUser || userRole === 'super' || userRole === 'super_admin') && (
                        <div className="pt-4 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-4">
                            <label htmlFor="customPricing" className="flex items-center text-base font-medium text-gray-700 cursor-pointer">
                              <input
                                type="checkbox"
                                id="customPricing"
                                checked={customPricingEnabled}
                                onChange={(e) => {
                                  const enabled = e.target.checked;
                                  updateCustomPricing(
                                    enabled,
                                    enabled ? customStructurePrice : null,
                                    enabled ? customInstallationPrice : null
                                  );
                                }}
                                disabled={isSubmitting}
                                className="w-5 h-5 text-gray-600 border-gray-300 rounded focus:ring-gray-500 mr-3"
                              />
                              <span>Do you want to enter custom structure & installation pricing?</span>
                            </label>
                          </div>

                          {customPricingEnabled && (
                            <div className="space-y-4 pl-8">
                              <div>
                                <label htmlFor="customStructurePrice" className="block text-sm font-medium text-gray-700 mb-2">
                                  Custom Structure Price (₹)
                                </label>
                                <input
                                  type="number"
                                  id="customStructurePrice"
                                  min="0"
                                  step="0.01"
                                  className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all ${customPricingEnabled ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-300'
                                    }`}
                                  placeholder="Enter custom structure price"
                                  value={customStructurePrice ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                    const newValue = value && !isNaN(value) ? value : null;
                                    updateCustomPricing(customPricingEnabled, newValue, customInstallationPrice);
                                  }}
                                  disabled={isSubmitting}
                                />
                              </div>

                              <div>
                                <label htmlFor="customInstallationPrice" className="block text-sm font-medium text-gray-700 mb-2">
                                  Custom Installation Price (₹)
                                </label>
                                <input
                                  type="number"
                                  id="customInstallationPrice"
                                  min="0"
                                  step="0.01"
                                  className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all ${customPricingEnabled ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-300'
                                    }`}
                                  placeholder="Enter custom installation price"
                                  value={customInstallationPrice ?? ''}
                                  onChange={(e) => {
                                    const value = e.target.value === '' ? null : parseFloat(e.target.value);
                                    const newValue = value && !isNaN(value) ? value : null;
                                    updateCustomPricing(customPricingEnabled, customStructurePrice, newValue);
                                  }}
                                  disabled={isSubmitting}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Message */}
                  <div>
                    <label htmlFor="message" className="flex items-center text-base font-medium text-gray-700 mb-3">
                      <MessageSquare className="w-5 h-5 mr-2 text-black" />
                      Additional Message (Optional)
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      className="w-full px-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all resize-none"
                      placeholder="Please provide any additional details about your requirements..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Right Column - Product Details */}
                <div className="space-y-8">
                  {selectedProduct && (
                    <div>
                      <h3 className="flex items-center text-2xl font-semibold text-gray-900 mb-8">
                        <Package className="w-7 h-7 mr-3 text-black" />
                        Product Details
                      </h3>
                      <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-100">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                            <span className="text-sm font-medium text-gray-600">Product:</span>
                            <span className="font-semibold text-gray-900 text-sm">{selectedProduct.name}</span>
                          </div>

                          {selectedProduct.pixelPitch && (
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                              <span className="text-sm font-medium text-gray-600">Pixel Pitch:</span>
                              <span className="font-semibold text-gray-900 text-sm">{selectedProduct.pixelPitch} mm</span>
                            </div>
                          )}

                          {selectedProduct.resolution && (
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                              <span className="text-sm font-medium text-gray-600">Resolution:</span>
                              <span className="font-semibold text-gray-900 text-sm">{selectedProduct.resolution.width} × {selectedProduct.resolution.height} px</span>
                            </div>
                          )}

                          {cabinetGrid && (
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                              <span className="text-sm font-medium text-gray-600">Cabinet Grid:</span>
                              <span className="font-semibold text-gray-900 text-sm">{cabinetGrid.columns} × {cabinetGrid.rows}</span>
                            </div>
                          )}

                          {processor && (
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                              <span className="text-sm font-medium text-gray-600">Processor:</span>
                              <span className="font-semibold text-gray-900 text-sm">{processor}</span>
                            </div>
                          )}

                          {mode && (
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                              <span className="text-sm font-medium text-gray-600">Mode:</span>
                              <span className="font-semibold text-gray-900 text-sm">{mode}</span>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pricing Section - Commented out for future use */}
                  {/* {getPriceForUserType() && (
                    <div>
                      <h3 className="flex items-center text-2xl font-semibold text-gray-900 mb-8">
                        <CreditCard className="w-7 h-7 mr-3 text-black" />
                        Pricing Estimate
                      </h3>
                      <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                            <span className="text-sm font-medium text-gray-600">Product Price:</span>
                            <span className="font-semibold text-gray-900 text-sm">₹{getPriceForUserType()?.toLocaleString('en-IN')}</span>
                          </div>
                          {processor && processorPrices[processor] && (
                            <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                              <span className="text-sm font-medium text-gray-600">Processor Price:</span>
                              <span className="font-semibold text-gray-900 text-sm">₹{(() => {
                                const userType = getUserType();
                                if (userType === 'siChannel') return processorPrices[processor].siChannel;
                                if (userType === 'reseller') return processorPrices[processor].reseller;
                                return processorPrices[processor].endUser;
                              })().toLocaleString('en-IN')}</span>
                            </div>
                          )}
                          {totalPrice && (
                            <div className="flex items-center justify-between p-4 bg-black text-white rounded-lg">
                              <span className="font-semibold text-base">Total Estimate:</span>
                              <span className="font-bold text-xl">₹{totalPrice.toLocaleString('en-IN')}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )} */}
                </div>
              </div>

              {/* Submit Button */}
              <div className="mt-12 flex justify-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`px-16 py-6 rounded-2xl font-bold text-white transition-all text-xl flex items-center space-x-4 shadow-2xl border-2 border-gray-800 ${isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-gray-900 to-black hover:from-black hover:to-gray-900 hover:shadow-2xl transform hover:-translate-y-1 hover:scale-105'
                    }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      <span>{effectiveSubmitButtonText}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-12 text-center max-w-4xl mx-auto">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-3">Quote Request Submitted!</h3>
              <p className="text-gray-600 mb-8 text-lg">Thank you for your interest. Our team will contact you shortly with a detailed quote.</p>
              <button
                onClick={onClose}
                className="px-8 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-base"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
