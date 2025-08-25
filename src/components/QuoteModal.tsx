import React, { useState } from 'react';
import { X, Mail, User, Phone, MessageSquare, Package, Settings, CreditCard } from 'lucide-react';
import { submitQuoteRequest, QuoteRequest } from '../api/quote';

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
  config?: any; 
  cabinetGrid?: CabinetGrid; 
  processor?: string;
  mode?: string;
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

// Processor price mapping by controller and user type
const processorPrices: Record<string, { endUser: number; siChannel: number; reseller: number }> = {
  TB2:      { endUser: 35000, siChannel: 31500, reseller: 29800 },
  TB40:     { endUser: 35000, siChannel: 31500, reseller: 29800 },
  TB60:     { endUser: 65000, siChannel: 58500, reseller: 55300 },
  VX1:      { endUser: 35000, siChannel: 31500, reseller: 29800 },
  VX400:    { endUser: 100000, siChannel: 90000, reseller: 85000 },
  'VX400 Pro': { endUser: 110000, siChannel: 99000, reseller: 93500 },
  VX600:    { endUser: 150000, siChannel: 135000, reseller: 127500 },
  'VX600 Pro': { endUser: 165000, siChannel: 148500, reseller: 140250 },
  VX1000:   { endUser: 200000, siChannel: 180000, reseller: 170000 },
  'VX1000 Pro': { endUser: 220000, siChannel: 198000, reseller: 187000 },
  '4K PRIME': { endUser: 300000, siChannel: 270000, reseller: 255000 },
};

// Helper to map UserType to product price key
const userTypeToPriceKey = (type: string) => type === 'endUser' ? 'endCustomer' : type;

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedProduct,
  config,
  cabinetGrid,
  processor,
  mode
}) => {
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  // Get the current user type from localStorage with proper type
  const getUserType = (): 'endUser' | 'siChannel' | 'reseller' => {
    const userType = localStorage.getItem('selectedUserType');
    return (userType === 'siChannel' || userType === 'reseller') ? userType : 'endUser';
  };

  // Get the price based on user type
  const getPriceForUserType = (): number | undefined => {
    const userType = getUserType();
    if (!selectedProduct) return undefined;
    
    if (userType === 'siChannel' && selectedProduct.siChannelPrice) {
      return selectedProduct.siChannelPrice;
    } else if (userType === 'reseller' && selectedProduct.resellerPrice) {
      return selectedProduct.resellerPrice;
    } else if (selectedProduct.prices) {
      // If using the new prices object structure
      const priceKey = userType === 'siChannel' ? 'siChannel' : 
                      userType === 'reseller' ? 'reseller' : 'endCustomer';
      return selectedProduct.prices.cabinet?.[priceKey] || selectedProduct.price;
    }
    return selectedProduct.price;
  };

  // Calculate total price
  const calculateTotalPrice = (): number | undefined => {
    if (!selectedProduct || !cabinetGrid || !config) return undefined;
    
    const userType = getUserType();
    
    // Calculate display area in square feet
    // Convert mm to feet first, then calculate area
    const widthInFeet = (config.width / 1000) * 3.2808399;
    const heightInFeet = (config.height / 1000) * 3.2808399;
    const displayAreaFeet = widthInFeet * heightInFeet;
    
    let pricePerSqFt: number | undefined;
    
    // Handle rental series pricing
    if (selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.rentalOption && selectedProduct.prices) {
      const rentalOptionKey = selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet';
      const priceKey = userTypeToPriceKey(userType) as 'endCustomer' | 'siChannel' | 'reseller';
      pricePerSqFt = selectedProduct.prices[rentalOptionKey as keyof typeof selectedProduct.prices]?.[priceKey];
    } else {
      // Regular pricing
      if (userType === 'siChannel') {
        pricePerSqFt = selectedProduct.siChannelPrice;
      } else if (userType === 'reseller') {
        pricePerSqFt = selectedProduct.resellerPrice;
      } else {
        pricePerSqFt = selectedProduct.price;
      }
    }
    
    if (!pricePerSqFt) return undefined;
    
    const totalPrice = displayAreaFeet * pricePerSqFt;
    
    // Add processor price if available
    let processorPrice = 0;
    if (processor && processorPrices[processor]) {
      if (userType === 'siChannel') processorPrice = processorPrices[processor].siChannel;
      else if (userType === 'reseller') processorPrice = processorPrices[processor].reseller;
      else processorPrice = processorPrices[processor].endUser;
    }
    
    return totalPrice + processorPrice;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      
      try {
        const result = await submitQuoteRequest(quoteData);
        console.log('Quote submission successful:', result);
        
        // Only proceed if the submission was successful
        if (result.success) {
          if (onSubmit) {
            onSubmit(message);
          }
          setIsSubmitted(true);
        } else {
          throw new Error(result.message || 'Failed to submit quote');
        }
      } catch (error) {
        console.error('Error in quote submission:', error);
        alert(`Failed to submit quote: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error; // Re-throw to be caught by the outer catch block
      }
      
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
      <div className={`${isOpen ? 'bg-white w-full h-full overflow-hidden' : 'w-full'}`}>
        {/* Header */}
        <div className="bg-orion-gradient text-white p-8 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-3xl font-bold">Get a Quote</h2>
                <p className="text-orion-100 text-base">Request pricing for your LED display configuration</p>
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

        <div className={`overflow-y-auto ${isOpen ? 'h-full' : ''}`}>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className={`${isOpen ? 'p-8 max-w-7xl mx-auto' : 'p-6'}`}>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                {/* Left Column - Contact Information */}
                <div className="space-y-8">
                  <div>
                    <h3 className="flex items-center text-2xl font-semibold text-gray-900 mb-8">
                      <User className="w-7 h-7 mr-3 text-orion-600" />
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
                            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-orion-500 focus:border-orion-500 text-base transition-all"
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
                            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-orion-500 focus:border-orion-500 text-base transition-all"
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
                            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-orion-500 focus:border-orion-500 text-base transition-all"
                            placeholder="Enter your phone number"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            disabled={isSubmitting}
                            required
                          />
                          <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Message */}
                  <div>
                    <label htmlFor="message" className="flex items-center text-base font-medium text-gray-700 mb-3">
                      <MessageSquare className="w-5 h-5 mr-2 text-orion-600" />
                      Additional Message (Optional)
                    </label>
                    <textarea
                      id="message"
                      rows={5}
                      className="w-full px-4 py-4 border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-orion-500 focus:border-orion-500 text-base transition-all resize-none"
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
                        <Package className="w-7 h-7 mr-3 text-orion-600" />
                        Product Details
                      </h3>
                      <div className="bg-gradient-to-br from-orion-50 to-blue-50 p-6 rounded-xl border border-orion-100">
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
                          
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                            <span className="text-sm font-medium text-gray-600">User Type:</span>
                            <span className="font-semibold text-gray-900 text-sm">{getUserTypeDisplayName(getUserType())}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pricing Section - Commented out for future use */}
                  {/* {getPriceForUserType() && (
                    <div>
                      <h3 className="flex items-center text-2xl font-semibold text-gray-900 mb-8">
                        <CreditCard className="w-7 h-7 mr-3 text-orion-600" />
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
                            <div className="flex items-center justify-between p-4 bg-orion-600 text-white rounded-lg">
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
              <div className="mt-12 flex justify-end">
                                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-12 py-5 rounded-xl font-semibold text-white transition-all text-lg flex items-center space-x-3 shadow-lg ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-orion-600 hover:bg-orion-700 hover:shadow-xl transform hover:-translate-y-0.5'
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
                      <span>Submit Quote Request</span>
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
                className="px-8 py-3 bg-orion-600 text-white rounded-lg hover:bg-orion-700 transition-colors text-base"
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
