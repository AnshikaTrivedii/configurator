export interface QuoteRequest {

  productName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  message: string;
  userTypeDisplayName?: string;

  product: {

    id: string;
    name: string;
    category: string;

    pixelPitch: number;
    resolution: {
      width: number;
      height: number;
    };
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

    pixelDensity: number;
    brightness: number;
    refreshRate: number;
    environment: string;
    maxPowerConsumption: number;
    avgPowerConsumption: number;
    weightPerCabinet: number;

    processorPrice?: number;

    userType: 'endUser' | 'siChannel' | 'reseller';
  };

  cabinetGrid?: {
    columns: number;
    rows: number;
  };

  displaySize?: {
    width: number;
    height: number;
  };
  aspectRatio?: string;

  processor?: string;
  mode?: string;

  userType?: 'endUser' | 'siChannel' | 'reseller';

  totalPrice?: number;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export const submitQuoteRequest = async (quoteData: QuoteRequest): Promise<{ success: boolean; message?: string }> => {

  try {
    const response = await fetch(`${API_BASE_URL}/email/quote-request`, {
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

    throw error;
  }
};
