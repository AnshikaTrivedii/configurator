import React, { useState } from 'react';
import { X, Mail } from 'lucide-react';

interface Product {
  name: string;
  pixelPitch?: number;
  resolution?: {
    width: number;
    height: number;
  };
  cabinetDimensions?: {
    width: number;
    height: number;
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

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedProduct,
  cabinetGrid
}) => {
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      onSubmit(message);
      setIsSubmitting(false);
      setIsSubmitted(true);
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setMessage('');
        setIsSubmitted(false);
        onClose();
      }, 2000);
    }, 1000);
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
                      {cabinetGrid && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Cabinet Grid:</span>
                          <span>{cabinetGrid.columns} × {cabinetGrid.rows}</span>
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
