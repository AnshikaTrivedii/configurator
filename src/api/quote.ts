export interface QuoteRequest {
  product: {
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
  };
  cabinetGrid?: {
    columns: number;
    rows: number;
  };
  message: string;
  displaySize?: {
    width: number;
    height: number;
  };
  aspectRatio?: string;
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
