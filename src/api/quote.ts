export interface QuoteRequest {
  // Root level required fields for backend compatibility
  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  userTypeDisplayName?: string;
  
  // Product details object
  product: {
    // Basic product info
    id: string;
    name: string;
    category: string;
    // Display specifications
    pixelPitch: number;
    resolution: {
      width: number;
      height: number;
    };
    cabinetDimensions: {
      width: number;
      height: number;
    };
    // Module details
    moduleDimensions: {
      width: number;
      height: number;
    };
    moduleResolution: {
      width: number;
      height: number;
    };
    moduleQuantity: number;
    // Technical specifications
    pixelDensity: number;
    brightness: number;
    refreshRate: number;
    environment: string;
    maxPowerConsumption: number;
    avgPowerConsumption: number;
    weightPerCabinet: number;
    // Pricing
    processorPrice?: number;
    // User info
    userType: 'endUser' | 'siChannel' | 'reseller';
  };
  // Display configuration
  cabinetGrid?: {
    columns: number;
    rows: number;
  };
  // Calculated display info
  displaySize?: {
    width: number;
    height: number;
  };
  aspectRatio?: string;
  // Additional options
  processor?: string;
  mode?: string;
  // User type at root level for backward compatibility
  userType?: 'endUser' | 'siChannel' | 'reseller';
  // Total price calculation
  totalPrice?: number;
}

export const submitQuoteRequest = async (quoteData: QuoteRequest): Promise<{ success: boolean; message?: string }> => {
    console.log('Submitting quote request:', quoteData);
  try {
    const response = await fetch('https://cms-backend-9r1u.onrender.com/api/email/quota', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quoteData),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to submit quote request');
    }

    return await response.json();
  } catch (error) {
    console.error('Error submitting quote request:', error);
    throw error;
  }
};
