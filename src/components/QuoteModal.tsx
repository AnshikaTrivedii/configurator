import React, { useState } from 'react';
import { X, Mail, User, Phone, MessageSquare, Package, ChevronDown } from 'lucide-react';
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
    userType: 'End User' | 'Reseller' | 'Channel';
  };
  title?: string;
  submitButtonText?: string;
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
  submitButtonText = 'Submit Quote Request'
}) => {
  const [message, setMessage] = useState('');
  const [customerName, setCustomerName] = useState(userInfo?.fullName || '');
  const [customerEmail, setCustomerEmail] = useState(userInfo?.email || '');
  const [customerPhone, setCustomerPhone] = useState(userInfo?.phoneNumber || '');
  const [selectedUserType, setSelectedUserType] = useState<'End User' | 'Reseller' | 'Channel'>(userInfo?.userType || 'End User');

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
  const getUserType = (): 'endUser' | 'siChannel' | 'reseller' => {
    switch (selectedUserType) {
      case 'Reseller':
        return 'reseller';
      case 'Channel':
        return 'siChannel';
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
                              const newUserType = e.target.value as 'End User' | 'Reseller' | 'Channel';
                              setSelectedUserType(newUserType);
                            }}
                            disabled={isSubmitting}
                            required
                          >
                            <option value="End User">End User</option>
                            <option value="Reseller">Reseller</option>
                            <option value="Channel">Channel</option>
                          </select>
                          <User className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
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
