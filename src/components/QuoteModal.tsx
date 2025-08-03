import React, { useState } from 'react';
import { X, Mail } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }
    
    if (!message || message.trim() === '') {
      alert('Please enter a message for your quote request');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const userType = getUserType();
      const userPrice = getPriceForUserType();
      
      const quoteData: QuoteRequest = {
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
          // Pricing
          processorPrice: userPrice,
          // User info
          userType: userType
        },
        cabinetGrid: cabinetGrid,
        message: message,
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
        userType: userType
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Get a Quote</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isSubmitting}
            >
              <X size={24} />
            </button>
          </div>

          {!isSubmitted ? (
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Product Details */}
                {selectedProduct && (
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Product Details</h3>
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Product:</span>
                        <span className="font-medium">{selectedProduct.name}</span>
                      </div>
                      {selectedProduct.pixelPitch && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Pixel Pitch:</span>
                          <span>P{selectedProduct.pixelPitch}mm</span>
                        </div>
                      )}
                      {selectedProduct.resolution && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Resolution:</span>
                          <span>{selectedProduct.resolution.width} × {selectedProduct.resolution.height}</span>
                        </div>
                      )}
                      {selectedProduct.resolution && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Aspect Ratio:</span>
                          <span>{calculateAspectRatio(selectedProduct.resolution.width, selectedProduct.resolution.height)}</span>
                        </div>
                      )}
                      {selectedProduct.cabinetDimensions && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Display Area:</span>
                          <span>{(selectedProduct.cabinetDimensions.width * (cabinetGrid?.columns || 1) / 1000).toFixed(2)} × 
                                {(selectedProduct.cabinetDimensions.height * (cabinetGrid?.rows || 1) / 1000).toFixed(2)} m</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-600">User Type:</span>
                        <span className="font-medium">
                          {getUserTypeDisplayName(getUserType())}
                        </span>
                      </div>
                      {getPriceForUserType() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Product Price:</span>
                          <span className="font-medium">
                            ${getPriceForUserType()?.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {getPriceForUserType() && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Processor Price:</span>
                          <span className="font-medium">
                            ${getPriceForUserType()?.toLocaleString()}
                          </span>
                        </div>
                      )}
                      {cabinetGrid && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cabinet Grid:</span>
                          <span>{cabinetGrid.columns} × {cabinetGrid.rows}</span>
                        </div>
                      )}
                      {/* Processor and Mode */}
                      {processor && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Processor:</span>
                          <span>{processor}</span>
                        </div>
                      )}
                      {mode && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Mode:</span>
                          <span>{mode}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Message */}
                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                    Additional Message (Optional)
                  </label>
                  <textarea
                    id="message"
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Please provide any additional details about your requirements..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center space-x-2 disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      'Sending...'
                    ) : (
                      <>
                        <Mail size={18} />
                        <span>Send Quote Request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mt-3 text-lg font-medium text-gray-900">Request Sent!</h3>
              <p className="mt-2 text-sm text-gray-500">
                Thank you for your interest. Our team will get back to you shortly.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  onClick={onClose}
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
