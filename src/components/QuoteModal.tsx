import React, { useState } from 'react';
import { X, Mail, User, Phone, MessageSquare, Package, ChevronDown } from 'lucide-react';
import { submitQuoteRequest, QuoteRequest } from '../api/quote';
import { salesAPI } from '../api/sales';
import { SalesUser } from '../api/sales';
import QuotationIdGenerator from '../utils/quotationIdGenerator';
import { calculateUserSpecificPrice } from '../utils/pricingCalculator';

// Import Product type for proper typing
interface ProductWithPricing extends Product {
  prices?: {
    cabinet: { endCustomer: number; siChannel: number; reseller: number };
    curveLock?: { endCustomer: number; siChannel: number; reseller: number };
  };
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
  config: { width: number; height: number; unit: string }
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
  } else {
    // For other products, calculate quantity in square feet - MATCH PDF EXACTLY
    // CRITICAL: Use config dimensions directly (same as PDF) to avoid rounding differences
    const widthInMeters = config.width / 1000;
    const heightInMeters = config.height / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    quantity = widthInFeet * heightInFeet;
    
    // Ensure quantity is reasonable (same as PDF)
    quantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  }
  
  // Calculate subtotal (product price before GST)
  const subtotal = unitPrice * quantity;
  
  // Add processor price if available (before GST)
  let processorPrice = 0;
  if (processor) {
    const processorPrices: Record<string, { endUser: number; reseller: number; channel: number }> = {
      'TB2': { endUser: 35000, reseller: 29800, channel: 31500 },
      'TB40': { endUser: 35000, reseller: 29800, channel: 31500 },
      'TB60': { endUser: 65000, reseller: 55300, channel: 58500 },
      'VX1': { endUser: 35000, reseller: 29800, channel: 31500 },
      'VX400': { endUser: 100000, reseller: 85000, channel: 90000 },
      'VX400 Pro': { endUser: 110000, reseller: 93500, channel: 99000 },
      'VX600': { endUser: 120000, reseller: 102000, channel: 108000 },
      'VX600 Pro': { endUser: 130000, reseller: 110500, channel: 117000 },
      'VX1000': { endUser: 150000, reseller: 127500, channel: 135000 },
      'VX1000 Pro': { endUser: 160000, reseller: 136000, channel: 144000 },
      '4K PRIME': { endUser: 290000, reseller: 246500, channel: 261000 }
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
  // Product total (A)
  const gstProduct = subtotal * 0.18;
  const totalProduct = subtotal + gstProduct;
  
  // Processor/Controller total (B)
  const gstProcessor = processorPrice * 0.18;
  const totalProcessor = processorPrice + gstProcessor;
  
  // GRAND TOTAL (A + B) - This matches the PDF exactly
  const grandTotal = totalProduct + totalProcessor;
  
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
      'GRAND TOTAL (A+B) with GST': Math.round(grandTotal)
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
    userType: 'End User' | 'Reseller';
  };
  title?: string;
  submitButtonText?: string;
  salesUser?: SalesUser | null;
  quotationId?: string;
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

// Get processor price based on user type
const getProcessorPrice = (processor: string, userType: string): number => {
  const processorPrices: Record<string, { endUser: number; reseller: number; channel: number }> = {
    'TB2': { endUser: 35000, reseller: 29800, channel: 31500 },
    'TB40': { endUser: 35000, reseller: 29800, channel: 31500 },
    'TB60': { endUser: 65000, reseller: 55300, channel: 58500 },
    'VX1': { endUser: 35000, reseller: 29800, channel: 31500 },
    'VX400': { endUser: 100000, reseller: 85000, channel: 90000 },
    'VX400 Pro': { endUser: 110000, reseller: 93500, channel: 99000 },
    'VX600': { endUser: 120000, reseller: 102000, channel: 108000 },
    'VX600 Pro': { endUser: 130000, reseller: 110500, channel: 117000 },
    'VX1000': { endUser: 150000, reseller: 127500, channel: 135000 },
    'VX1000 Pro': { endUser: 160000, reseller: 136000, channel: 144000 },
    '4K PRIME': { endUser: 290000, reseller: 246500, channel: 261000 }
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
  quotationId
}) => {
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState(userInfo?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(userInfo?.email || '');
  const [customerPhone, setCustomerPhone] = useState(userInfo?.phoneNumber || '');
  const [selectedUserType, setSelectedUserType] = useState<'End User' | 'Reseller'>(userInfo?.userType || 'End User');
  const [quotationStatus, setQuotationStatus] = useState<'New' | 'In Progress' | 'Rejected' | 'Hold' | 'Converted'>('New');

  // Update form fields when userInfo changes
  React.useEffect(() => {
    if (userInfo) {
      setCustomerName(userInfo.fullName);
      setCustomerEmail(userInfo.email);
      setCustomerPhone(userInfo.phoneNumber);
      setSelectedUserType(userInfo.userType);
    }
  }, [userInfo]);
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
      if (salesUser && !quotationId) {
        console.log('⚠️ QuotationId missing, generating new one...');
        finalQuotationId = await QuotationIdGenerator.generateQuotationId(salesUser.name);
        console.log('🆔 Generated new quotationId:', finalQuotationId);
      }
      
      if (salesUser && finalQuotationId) {
        console.log('✅ Conditions met - attempting to save quotation to database...');
        console.log('📋 Sales User:', salesUser.name, salesUser.email);
        console.log('🆔 Quotation ID:', finalQuotationId);
        
        try {
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

          // CRITICAL: Calculate total price using the same logic as PDF generation
          // This price INCLUDES 18% GST and matches the PDF Grand Total exactly
          // This stored price (with GST) will be displayed in the Super User dashboard
          const correctTotalPrice = calculateCorrectTotalPrice(
            selectedProduct as ProductWithPricing,
            cabinetGrid,
            processor,
            userType,
            config || { width: 2400, height: 1010, unit: 'mm' } // Fallback config if not provided
          );

          console.log('💰 Calculated price for quotation (WITH GST - matches PDF):', {
            quotationId: finalQuotationId,
            totalPrice: correctTotalPrice,
            formatted: `₹${correctTotalPrice.toLocaleString('en-IN')}`,
            includesGST: true,
            gstRate: '18%',
            userType: getUserTypeDisplayName(userType),
            product: selectedProduct.name,
            note: 'This price includes 18% GST and matches PDF Grand Total'
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
            status: quotationStatus,
            totalPrice: correctTotalPrice,  // CRITICAL: Grand Total with GST - matches PDF exactly
            
            // Store exact pricing breakdown as shown on the page
            exactPricingBreakdown: {
              unitPrice: selectedProduct.price || selectedProduct.resellerPrice || selectedProduct.siChannelPrice || 0,
              quantity: cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1,
              subtotal: (selectedProduct.price || selectedProduct.resellerPrice || selectedProduct.siChannelPrice || 0) * (cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1),
              gstRate: 18,
              gstAmount: ((selectedProduct.price || selectedProduct.resellerPrice || selectedProduct.siChannelPrice || 0) * (cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1)) * 0.18,
              processorPrice: processor ? getProcessorPrice(processor, userType) : 0,
              processorGst: processor ? (getProcessorPrice(processor, userType) * 0.18) : 0,
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

          console.log('📤 Sending exact quotation data to API:', exactQuotationData);
          
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
              const fallbackQuotationId = QuotationIdGenerator.generateFallbackQuotationId(salesUser.name);
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

                      {/* Quotation Status Field */}
                      <div>
                        <label htmlFor="quotationStatus" className="block text-base font-medium text-gray-700 mb-3">
                          Quotation Status <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <select
                            id="quotationStatus"
                            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-gray-500 focus:border-gray-500 text-base transition-all appearance-none bg-white"
                            value={quotationStatus}
                            onChange={(e) => {
                              const newStatus = e.target.value as 'New' | 'In Progress' | 'Rejected' | 'Hold' | 'Converted';
                              setQuotationStatus(newStatus);
                            }}
                            disabled={isSubmitting}
                            required
                          >
                            <option value="New">New</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Hold">Hold</option>
                            <option value="Converted">Converted</option>
                          </select>
                          <Package className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                        </div>
                      </div>
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
