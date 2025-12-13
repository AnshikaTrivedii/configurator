import React, { useState, useEffect } from 'react';
import { X, Mail, User, Phone, MessageSquare, Package, ChevronDown } from 'lucide-react';
import { submitQuoteRequest, QuoteRequest } from '../api/quote';
import { salesAPI } from '../api/sales';
import { SalesUser } from '../api/sales';
import QuotationIdGenerator from '../utils/quotationIdGenerator';
import { calculateUserSpecificPrice } from '../utils/pricingCalculator';
import { getProcessorPrice } from '../utils/processorPrices';
import { calculateCentralizedPricing } from '../utils/centralizedPricing';

// Import Product type for proper typing
interface ProductWithPricing extends Product {
  prices?: {
    cabinet: { endCustomer: number; siChannel: number; reseller: number };
    curveLock?: { endCustomer: number; siChannel: number; reseller: number };
  };
}

// Check if product is a Jumbo Series product (prices include controllers)
function isJumboSeriesProduct(product: ProductWithPricing): boolean {
  return product.category?.toLowerCase().includes('jumbo') || 
         product.id?.toLowerCase().startsWith('jumbo-') ||
         product.name?.toLowerCase().includes('jumbo series');
}

// CRITICAL: This is the authoritative price calculation function
// This function calculates prices using the EXACT same logic as PDF generation
// The price calculated here is:
// 1. Saved to the database as totalPrice
// 2. Displayed in the generated PDF
// 3. Displayed in the Super User dashboard
// DO NOT modify this function without updating the PDF generation logic
function calculateCorrectTotalPrice(
  product: ProductWithPricing,
  cabinetGrid: { columns: number; rows: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string },
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }
): number {
  const METERS_TO_FEET = 3.2808399;
  
  // Convert userType to match PDF logic
  let pdfUserType: 'End User' | 'Reseller' | 'Channel' = 'End User';
  if (userType === 'reseller') {
    pdfUserType = 'Reseller';
  } else if (userType === 'siChannel') {
    pdfUserType = 'Channel';
  }
  
  // Get unit price (same logic as PDF)
  let unitPrice = 0;
  
  // Handle rental products
  if (product.category?.toLowerCase().includes('rental') && product.prices) {
    if (pdfUserType === 'Reseller') {
      unitPrice = product.prices.cabinet.reseller;
    } else if (pdfUserType === 'Channel') {
      unitPrice = product.prices.cabinet.siChannel;
    } else {
      unitPrice = product.prices.cabinet.endCustomer;
    }
  } else {
    // Handle regular products
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
  
  // Calculate quantity based on product type - EXACT SAME LOGIC AS PDF
  let quantity = 0;
  
  if (product.category?.toLowerCase().includes('rental')) {
    // For rental series, calculate quantity as number of cabinets
    quantity = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
  } else if (isJumboSeriesProduct(product)) {
    // For Jumbo Series, use fixed area-based pricing
    const pixelPitch = product.pixelPitch;
    
    if (pixelPitch === 4 || pixelPitch === 2.5) {
      // P4 and P2.5: Fixed area = 7.34ft × 4.72ft = 34.64 sqft
      const widthInFeet = 7.34;
      const heightInFeet = 4.72;
      const fixedQuantity = widthInFeet * heightInFeet;
      
      console.log('🎯 QuoteModal Jumbo Series P4/P2.5 Fixed Pricing:', {
        product: product.name,
        pixelPitch,
        fixedArea: `${widthInFeet}ft × ${heightInFeet}ft`,
        quantity: fixedQuantity.toFixed(2) + ' sqft'
      });
      
      quantity = Math.round(fixedQuantity * 100) / 100; // 34.64 sqft
    } else if (pixelPitch === 3 || pixelPitch === 6) {
      // P3 and P6: Fixed area = 6.92ft × 5.04ft = 34.88 sqft
      const widthInFeet = 6.92;
      const heightInFeet = 5.04;
      const fixedQuantity = widthInFeet * heightInFeet;
      
      console.log('🎯 QuoteModal Jumbo Series P3/P6 Fixed Pricing:', {
        product: product.name,
        pixelPitch,
        fixedArea: `${widthInFeet}ft × ${heightInFeet}ft`,
        quantity: fixedQuantity.toFixed(2) + ' sqft'
      });
      
      quantity = Math.round(fixedQuantity * 100) / 100; // 34.88 sqft
    } else {
      quantity = 1; // Fallback
    }
  } else {
    // For other products, calculate quantity in square feet - MATCH PDF EXACTLY
    // CRITICAL: Use config dimensions directly (same as PDF) to avoid rounding differences
    const widthInMeters = config.width / 1000;
    const heightInMeters = config.height / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    const rawQuantity = widthInFeet * heightInFeet;
    
    // Round to 2 decimal places for consistency with display
    quantity = Math.round(rawQuantity * 100) / 100;
    
    // Ensure quantity is reasonable (same as PDF)
    quantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  }
  
  // Calculate subtotal (product price before GST)
  const subtotal = unitPrice * quantity;
  
  // Add processor price if available (before GST)
  // Note: Skip processor price for Jumbo Series products as their prices already include controllers
  let processorPrice = 0;
  if (processor && !isJumboSeriesProduct(product)) {
    // Use centralized processor pricing
    processorPrice = getProcessorPrice(processor, pdfUserType);
    console.log('🔧 Processor Price Calculation:', {
      processor,
      pdfUserType,
      calculatedPrice: processorPrice,
      note: 'Using centralized processor pricing'
    });
  } else if (processor && isJumboSeriesProduct(product)) {
    console.log('🚫 Skipping processor price for Jumbo Series product:', product.name);
  }
  
  // Calculate totals with GST (18%) - SAME LOGIC AS PDF
  // Product total (A)
  const gstProduct = subtotal * 0.18;
  const totalProduct = subtotal + gstProduct;
  
  // Processor/Controller total (B)
  const gstProcessor = processorPrice * 0.18;
  const totalProcessor = processorPrice + gstProcessor;
  
  // Calculate screen area in square feet for Structure and Installation pricing
  // This should always be based on actual display dimensions
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;
  
  // Structure and Installation pricing - use custom if enabled, otherwise use default calculation
  // IMPORTANT: Structure and Installation are kept SEPARATE - never combined
  let structureBasePrice: number;
  let installationBasePrice: number;
  
  if (customPricing?.enabled && customPricing.structurePrice !== null && customPricing.installationPrice !== null) {
    // Use custom pricing (base prices without GST)
    structureBasePrice = customPricing.structurePrice;
    installationBasePrice = customPricing.installationPrice;
  } else {
    // Default calculation: Structure Price: ₹2500 per square foot, Installation Price: ₹500 per square foot
    structureBasePrice = screenAreaSqFt * 2500;
    installationBasePrice = screenAreaSqFt * 500;
  }
  
  // Calculate GST on structure and installation separately (always 18%)
  const structureGST = structureBasePrice * 0.18;
  const totalStructure = structureBasePrice + structureGST;
  
  const installationGST = installationBasePrice * 0.18;
  const totalInstallation = installationBasePrice + installationGST;
  
  // GRAND TOTAL (A + B + Structure + Installation) - This matches the PDF exactly
  // Structure and Installation are added separately - never combined
  const grandTotal = totalProduct + totalProcessor + totalStructure + totalInstallation;
  
  console.log('💰 Price Calculation (WITH GST - matches PDF exactly):', {
    product: product.name,
    userType: pdfUserType,
    unitPrice,
    quantity,
    cabinetGrid,
    cabinetDimensions: product.cabinetDimensions,
    subtotal,
    gstProduct,
    totalProduct,
    processorPrice,
    gstProcessor,
    totalProcessor,
    grandTotal: Math.round(grandTotal),
      breakdown: {
        'Unit Price (per sq.ft)': unitPrice,
        'Quantity (sq.ft)': quantity,
        'Product Subtotal': subtotal,
        'Product GST (18%)': gstProduct,
        'Product Total (A)': totalProduct,
        'Processor Price': processorPrice,
        'Processor GST (18%)': gstProcessor,
        'Processor Total (B)': totalProcessor,
        'Structure Cost (Base)': structureBasePrice,
        'Structure GST (18%)': structureGST,
        'Structure Total': totalStructure,
        'Installation Cost (Base)': installationBasePrice,
        'Installation GST (18%)': installationGST,
        'Installation Total': totalInstallation,
        'GRAND TOTAL (A+B+C+D) with GST': Math.round(grandTotal)
      },
    calculation: {
      'Config Dimensions': `${config.width}×${config.height}mm`,
      'Config in Meters': `${(config.width / 1000).toFixed(2)}×${(config.height / 1000).toFixed(2)}m`,
      'Config in Feet': `${(config.width / 1000 * METERS_TO_FEET).toFixed(2)}×${(config.height / 1000 * METERS_TO_FEET).toFixed(2)}ft`,
      'Cabinet Grid': `${cabinetGrid?.columns || 0}×${cabinetGrid?.rows || 0}`,
      'Cabinet Size': `${product.cabinetDimensions?.width || 0}×${product.cabinetDimensions?.height || 0}mm`,
      'Calculated Total': `${((product.cabinetDimensions?.width || 0) * (cabinetGrid?.columns || 1))}×${((product.cabinetDimensions?.height || 0) * (cabinetGrid?.rows || 1))}mm`
    }
  });
  
  // Return grand total rounded to nearest rupee (INCLUDES 18% GST)
  return Math.round(grandTotal);
}

interface Product {
  id: string;
  name: string;
  category: string;
  image: string;
  resolution: {
    width: number;
    height: number;
  };
  price?: number;
  siChannelPrice?: number;
  resellerPrice?: number;
  cabinetDimensions: {
    width: number;
    height: number;
  };
  moduleDimensions: {
    width: number;
    height: number;
  };
  moduleResolution: {
    width: number;
    height: number;
  };
  moduleQuantity: number;
  pixelPitch: number;
  pixelDensity: number;
  brightness: number;
  refreshRate: number;
  environment: string;
  maxPowerConsumption: number;
  avgPowerConsumption: number;
  weightPerCabinet: number;
  pdf?: string;
  prices?: {
    cabinet: { endCustomer: number; siChannel: number; reseller: number };
    curveLock: { endCustomer: number; siChannel: number; reseller: number };
  };
  rentalOption?: string;
  // Add other product properties as needed
}

interface CabinetGrid {
  columns: number;
  rows: number;
}

type QuoteModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => void;
  selectedProduct?: Product;
  config?: {
    width: number;
    height: number;
    unit: string;
  }; 
  cabinetGrid?: CabinetGrid; 
  processor?: string;
  mode?: string;
  userInfo?: {
    fullName: string;
    email: string;
    phoneNumber: string;
    projectTitle?: string;
    address?: string;
    userType: 'End User' | 'Reseller';
  };
  title?: string;
  submitButtonText?: string;
  salesUser?: SalesUser | null;
  userRole?: 'normal' | 'sales' | 'super' | 'super_admin';
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
};

// Function to calculate greatest common divisor
const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

// Function to calculate aspect ratio
const calculateAspectRatio = (width: number, height: number): string => {
  const divisor = gcd(width, height);
  return `${width / divisor}:${height / divisor}`;
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





export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedProduct,
  cabinetGrid,
  processor,
  mode,
  userInfo,
  title = 'Get a Quote',
  submitButtonText = 'Submit Quote Request',
  salesUser,
  userRole,
  quotationId,
  customPricing: externalCustomPricing,
  onCustomPricingChange
}) => {
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState(userInfo?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(userInfo?.email || '');
  const [customerPhone, setCustomerPhone] = useState(userInfo?.phoneNumber || '');
  const [salesPersons, setSalesPersons] = useState<any[]>([]);
  const [selectedSalesPersonId, setSelectedSalesPersonId] = useState<string | null>(null);
  const [loadingSalesPersons, setLoadingSalesPersons] = useState(false);
  const [selectedUserType, setSelectedUserType] = useState<'End User' | 'Reseller'>(userInfo?.userType || 'End User');
  
  // Discount state (only for superadmin)
  const [discountType, setDiscountType] = useState<'led' | 'controller' | 'total' | null>(null);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  
  // Custom pricing state - use external if provided, otherwise use internal state
  const [internalCustomPricingEnabled, setInternalCustomPricingEnabled] = useState(externalCustomPricing?.enabled || false);
  const [internalCustomStructurePrice, setInternalCustomStructurePrice] = useState<number | null>(externalCustomPricing?.structurePrice || null);
  const [internalCustomInstallationPrice, setInternalCustomInstallationPrice] = useState<number | null>(externalCustomPricing?.installationPrice || null);
  
  // Use external pricing if provided, otherwise use internal state
  const customPricingEnabled = externalCustomPricing?.enabled ?? internalCustomPricingEnabled;
  const customStructurePrice = externalCustomPricing?.structurePrice ?? internalCustomStructurePrice;
  const customInstallationPrice = externalCustomPricing?.installationPrice ?? internalCustomInstallationPrice;
  
  // Update external state when internal state changes
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

  // Update form fields when userInfo changes
  React.useEffect(() => {
    if (userInfo) {
      setCustomerName(userInfo.fullName);
      setCustomerEmail(userInfo.email);
      setCustomerPhone(userInfo.phoneNumber);
      setSelectedUserType(userInfo.userType);
    }
  }, [userInfo]);
  
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  // Get the current user type from local state with proper mapping
  const getUserType = (): 'endUser' | 'reseller' => {
    switch (selectedUserType) {
      case 'Reseller':
        return 'reseller';
      case 'End User':
      default:
        return 'endUser';
    }
  };

  // Get the user type display name for email
  const getUserTypeDisplayName = (): string => {
    return selectedUserType;
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🚀 QuoteModal handleSubmit called');
    console.log('📋 Sales User:', salesUser);
    console.log('🆔 Quotation ID:', quotationId);
    console.log('📦 Selected Product:', selectedProduct?.name);
    
    // Validate required fields
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
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      alert('Please enter a valid email address');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const userType = getUserType();
      // const userPrice = getPriceForUserType(); // Commented out for future use
      // const totalPrice = calculateTotalPrice(); // Commented out for future use
      
      const quoteData: QuoteRequest = {
        // Root level required fields for backend compatibility
        productName: selectedProduct.name,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        customerPhone: customerPhone.trim(),
        message: message.trim() || 'No additional message provided',
        userTypeDisplayName: getUserTypeDisplayName(),
        
        // Product details object
        product: {
          // Basic product info
          id: selectedProduct.id,
          name: selectedProduct.name,
          category: selectedProduct.category,
          // Display specifications
          pixelPitch: selectedProduct.pixelPitch,
          resolution: selectedProduct.resolution,
          cabinetDimensions: selectedProduct.cabinetDimensions,
          // Module details
          moduleDimensions: selectedProduct.moduleDimensions,
          moduleResolution: selectedProduct.moduleResolution,
          moduleQuantity: selectedProduct.moduleQuantity,
          // Technical specifications
          pixelDensity: selectedProduct.pixelDensity,
          brightness: selectedProduct.brightness,
          refreshRate: selectedProduct.refreshRate,
          environment: selectedProduct.environment,
          maxPowerConsumption: selectedProduct.maxPowerConsumption,
          avgPowerConsumption: selectedProduct.avgPowerConsumption,
          weightPerCabinet: selectedProduct.weightPerCabinet,
                  // Pricing - Commented out for future use
        // processorPrice: userPrice,
          // User info
          userType: userType
        },
        cabinetGrid: cabinetGrid,
        displaySize: selectedProduct.cabinetDimensions && cabinetGrid ? {
          width: Number((selectedProduct.cabinetDimensions.width * (cabinetGrid?.columns || 1) / 1000).toFixed(2)),
          height: Number((selectedProduct.cabinetDimensions.height * (cabinetGrid?.rows || 1) / 1000).toFixed(2))
        } : undefined,
        aspectRatio: selectedProduct.resolution ? 
          calculateAspectRatio(selectedProduct.resolution.width, selectedProduct.resolution.height) : undefined,
        // Include processor and mode if available
        processor: processor,
        mode: mode,
        // Include user type at the root level as well for backward compatibility
        userType: userType,
        // Include total price - Commented out for future use
        // totalPrice: totalPrice
      };
      
      console.log('Submitting quote data:', quoteData);
      
      // First, save quotation to local database if this is a sales user
      console.log('🔍 Checking conditions for database save:');
      console.log('  - salesUser present:', !!salesUser);
      console.log('  - quotationId present:', !!quotationId);
      console.log('  - salesUser details:', salesUser ? { name: salesUser.name, email: salesUser.email } : 'null');
      console.log('  - quotationId value:', quotationId);
      
      // Generate quotationId if missing but salesUser is present
      let finalQuotationId = quotationId;
      const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';
      
      // For superadmin, require salesUser or selectedSalesPersonId
      if (isSuperAdmin && !salesUser && !selectedSalesPersonId) {
        alert('Please select a sales person to assign this quotation to');
        setIsSubmitting(false);
        return;
      }
      
      if ((salesUser || isSuperAdmin) && !quotationId) {
        console.log('⚠️ QuotationId missing, generating new one...');
        // For superadmin, use selected sales person name or current user name
        const nameForId = isSuperAdmin && selectedSalesPersonId 
          ? salesPersons.find(p => p._id === selectedSalesPersonId)?.name || salesUser?.name
          : salesUser?.name;
        if (nameForId) {
          finalQuotationId = await QuotationIdGenerator.generateQuotationId(nameForId);
          console.log('🆔 Generated new quotationId:', finalQuotationId);
        } else {
          alert('Unable to generate quotation ID - missing sales person name');
          setIsSubmitting(false);
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
        // Regular sales user - always uses their own ID
        finalSalesUserId = salesUser?._id?.toString();
        finalSalesUserName = salesUser?.name;
        console.log('📊 Sales user creating quotation:', {
          salesUserId: finalSalesUserId,
          salesUserName: finalSalesUserName
        });
      }
      
      if ((salesUser || isSuperAdmin) && finalQuotationId && finalSalesUserId && finalSalesUserName) {
        console.log('✅ Conditions met - attempting to save quotation to database...');
        console.log('📋 Sales User:', salesUser.name, salesUser.email);
        console.log('🆔 Quotation ID:', finalQuotationId);
        
        try {
          // PRODUCTION DEBUG: Log the exact payload being sent
          console.log('🚀 QUOTATION SAVE - Payload being sent:', {
            environment: import.meta.env.MODE,
            apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
            quotationId: finalQuotationId,
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
            category: selectedProduct.category,
            
            // Pricing information (CRITICAL for backend pricing calculation)
            price: selectedProduct.price,
            resellerPrice: selectedProduct.resellerPrice,
            siChannelPrice: selectedProduct.siChannelPrice,
            prices: selectedProduct.prices,
            
            // Display specifications
            pixelPitch: selectedProduct.pixelPitch,
            resolution: selectedProduct.resolution,
            cabinetDimensions: selectedProduct.cabinetDimensions,
            moduleDimensions: selectedProduct.moduleDimensions,
            moduleResolution: selectedProduct.moduleResolution,
            moduleQuantity: selectedProduct.moduleQuantity,
            
            // Technical specifications
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
            
            // User type and pricing context
            userType: userType,
            userTypeDisplayName: getUserTypeDisplayName(userType),
            
            // Timestamp
            generatedAt: new Date().toISOString()
          };

          // CRITICAL: Calculate total price using calculateCorrectTotalPrice with custom pricing support
          // This ensures 100% consistency between database storage and PDF generation
          const configForCalc = config || { width: 2400, height: 1010, unit: 'mm' };
          
          // Prepare custom pricing object if enabled
          const customPricingObj = customPricingEnabled && customStructurePrice !== null && customInstallationPrice !== null
            ? {
                enabled: true,
                structurePrice: customStructurePrice,
                installationPrice: customInstallationPrice
              }
            : undefined;
          
          // Calculate total price with custom pricing support
          const correctTotalPrice = calculateCorrectTotalPrice(
            selectedProduct,
            cabinetGrid,
            processor,
            userType,
            configForCalc,
            customPricingObj
          );
          
          // Also get centralized pricing for breakdown (with custom pricing support)
          const pricingResult = calculateCentralizedPricing(
            selectedProduct,
            cabinetGrid,
            processor,
            userType,
            configForCalc,
            customPricingObj
          );
          
          // Check if price is available
          if (!pricingResult.isAvailable) {
            alert('❌ Price is not available for this product configuration. Please contact sales for pricing information.');
            return;
          }

          // Apply discount if superadmin has set one
          let finalPricingResult = pricingResult;
          let finalTotalPrice = correctTotalPrice;
          let discountInfo: DiscountInfo | null = null;
          
          const isSuperAdmin = userRole === 'super' || userRole === 'super_admin';
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
            userType: getUserTypeDisplayName(userType),
            product: selectedProduct.name,
            hasDiscount: !!discountInfo,
            note: discountInfo ? 'Price includes discount (not shown in PDF)' : 'This price includes 18% GST and matches PDF Grand Total'
          });

          // Capture exact quotation data as shown on the page
          const exactQuotationData = {
            // Basic quotation info
            quotationId: finalQuotationId,
            customerName: customerName.trim(),
            customerEmail: customerEmail.trim(),
            customerPhone: customerPhone.trim(),
            productName: selectedProduct.name,
            message: message.trim() || 'No additional message provided',
            userType: userType,
            userTypeDisplayName: getUserTypeDisplayName(userType),
            totalPrice: finalTotalPrice,  // CRITICAL: Grand Total with GST (and discount if applied) - matches PDF exactly
            
            // CRITICAL: Include salesUserId and salesUserName for quotation attribution
            // This determines which user the quotation is counted under in the dashboard
            // For superadmin: can be assigned user or themselves
            // For sales users: always their own ID
            salesUserId: finalSalesUserId,
            salesUserName: finalSalesUserName,
            
            // Store exact pricing breakdown using centralized calculation + custom pricing + discount
            exactPricingBreakdown: {
              unitPrice: finalPricingResult.unitPrice,
              quantity: finalPricingResult.quantity,
              subtotal: finalPricingResult.productSubtotal,
              gstRate: 18,
              gstAmount: finalPricingResult.productGST,
              processorPrice: finalPricingResult.processorPrice,
              processorGst: finalPricingResult.processorGST,
              grandTotal: finalTotalPrice, // Use finalTotalPrice which includes discount if applied
              // Custom pricing information
              customPricing: customPricingObj ? {
                enabled: true,
                structurePrice: customStructurePrice,
                installationPrice: customInstallationPrice
              } : undefined,
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
            
            // Store discount information in quotationData
            discountType: discountInfo?.discountType || null,
            discountPercent: discountInfo?.discountPercent || 0,
            
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
            
            // Custom pricing fields
            customPricing: customPricingObj ? {
              enabled: true,
              structurePrice: customStructurePrice,
              installationPrice: customInstallationPrice
            } : undefined,
            
            // Timestamp when quotation was created
            createdAt: new Date().toISOString()
          };

          console.log('📤 Sending exact quotation data to API:', {
            ...exactQuotationData,
            salesUserId: exactQuotationData.salesUserId,
            salesUserIdType: typeof exactQuotationData.salesUserId,
            salesUserIdString: exactQuotationData.salesUserId?.toString(),
            salesUserName: exactQuotationData.salesUserName
          });
          
          const saveResult = await salesAPI.saveQuotation(exactQuotationData);
          console.log('✅ Quotation saved to database successfully:', saveResult);
          
          // Show success message to user
          alert('Quotation saved successfully to database!');
          
        } catch (dbError: any) {
          console.error('❌ Error saving quotation to database:', dbError);
          console.error('❌ Error details:', {
            message: dbError.message,
            stack: dbError.stack,
            quotationId,
            salesUser: salesUser?.name
          });
          
          // If it's a duplicate ID error, try with a fallback ID
          if (dbError.message && dbError.message.includes('already exists')) {
            console.log('🔄 Duplicate ID detected in QuoteModal, trying with fallback ID...');
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
              
              // Show success message to user
              alert('Quotation saved successfully to database with fallback ID!');
              
            } catch (fallbackError: any) {
              console.error('❌ Fallback save also failed:', fallbackError);
              alert(`Failed to save quotation to database: ${fallbackError.message}`);
            }
          } else {
            // Show error message to user
            alert(`Failed to save quotation to database: ${dbError.message}`);
          }
          
          // Don't fail the entire process if database save fails
        }
      } else {
        console.log('❌ Quotation not saved to database - missing salesUser or quotationId');
        console.log('📋 Sales User present:', !!salesUser);
        console.log('📋 Is Super Admin:', isSuperAdmin);
        console.log('📋 Selected Sales Person ID:', selectedSalesPersonId);
        console.log('🆔 Quotation ID present:', !!finalQuotationId);
        console.log('🔍 Debug info:');
        console.log('  - salesUser:', salesUser);
        console.log('  - original quotationId:', quotationId);
        console.log('  - final quotationId:', finalQuotationId);
        console.log('  - typeof salesUser:', typeof salesUser);
        console.log('  - typeof quotationId:', typeof quotationId);
      }

      // Then, try to submit to external API (for email notifications)
      try {
        const result = await submitQuoteRequest(quoteData);
        console.log('External quote submission successful:', result);
      } catch (externalError) {
        console.error('External quote submission failed:', externalError);
        // Don't fail the entire process if external API fails
        console.log('⚠️ External quote submission failed, but local save succeeded');
      }

      if (onSubmit) {
        onSubmit(message);
      }
      setIsSubmitted(true);
      
      // Reset form after 10 seconds
      setTimeout(() => {
        setMessage('');
        setCustomerName('');
        setCustomerEmail('');
        setCustomerPhone('');
        setIsSubmitted(false);
        onClose();
      }, 10000);
    } catch (error) {
      console.error('Error submitting quote:', error);
      // You might want to show an error message to the user here
      alert('Failed to submit quote request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total price for display - Commented out for future use
  // const totalPrice = calculateTotalPrice();

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
                <h2 className="text-3xl font-bold">{title}</h2>
                <p className="text-gray-200 text-base">Request pricing for your LED display configuration</p>
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
                              const newUserType = e.target.value as 'End User' | 'Reseller';
                              setSelectedUserType(newUserType);
                            }}
                            disabled={isSubmitting}
                            required
                          >
                            <option value="End User">End User</option>
                            <option value="Reseller">Reseller</option>
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
                                  disabled={isSubmitting || loadingSalesPersons}
                                  required
                                >
                                  {salesPersons.length === 0 ? (
                                    <option value="">No sales persons available</option>
                                  ) : (
                                    salesPersons.map((person) => {
                                      // CRITICAL: Convert _id to string for option value
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
                                  className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all ${
                                    customPricingEnabled ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-300'
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
                                  className={`w-full px-4 py-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all ${
                                    customPricingEnabled ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-300'
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
                  className={`px-16 py-6 rounded-2xl font-bold text-white transition-all text-xl flex items-center space-x-4 shadow-2xl border-2 border-gray-800 ${
                    isSubmitting
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
                      <span>{submitButtonText}</span>
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
