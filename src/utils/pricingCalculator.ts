// User-specific pricing calculator
// Different user types get different pricing based on their account level

export interface PricingTier {
  name: string;
  multiplier: number;
  description: string;
}

export interface ProductPricing {
  basePrice: number;
  pixelPitchMultiplier: number;
  sizeMultiplier: number;
  environmentMultiplier: number;
}

// Pricing tiers based on customer type
export const PRICING_TIERS: Record<string, PricingTier> = {
  'endUser': {
    name: 'End User',
    multiplier: 1.0, // Full retail price
    description: 'Standard retail pricing'
  },
  'reseller': {
    name: 'Reseller',
    multiplier: 0.75, // 25% discount
    description: 'Reseller pricing with 25% discount'
  },
  'siChannel': {
    name: 'SI Channel',
    multiplier: 0.65, // 35% discount
    description: 'System Integrator pricing with 35% discount'
  }
};

// Base pricing structure for different products
export const PRODUCT_PRICING: Record<string, ProductPricing> = {
  'rigel-p3-outdoor': {
    basePrice: 50000, // Base price per square meter
    pixelPitchMultiplier: 1.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.2 // Outdoor premium
  },
  'rigel-p2.5-outdoor': {
    basePrice: 75000,
    pixelPitchMultiplier: 1.5,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.2
  },
  'rigel-p1.8-outdoor': {
    basePrice: 100000,
    pixelPitchMultiplier: 2.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.2
  },
  'rigel-p1.5-outdoor': {
    basePrice: 125000,
    pixelPitchMultiplier: 2.5,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.2
  },
  'rigel-p1.25-outdoor': {
    basePrice: 150000,
    pixelPitchMultiplier: 3.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.2
  },
  'rigel-p0.9-outdoor': {
    basePrice: 200000,
    pixelPitchMultiplier: 4.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.2
  },
  // Indoor variants (lower base price, no outdoor premium)
  'rigel-p3-indoor': {
    basePrice: 40000,
    pixelPitchMultiplier: 1.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.0
  },
  'rigel-p2.5-indoor': {
    basePrice: 60000,
    pixelPitchMultiplier: 1.5,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.0
  },
  'rigel-p1.8-indoor': {
    basePrice: 80000,
    pixelPitchMultiplier: 2.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.0
  },
  'rigel-p1.5-indoor': {
    basePrice: 100000,
    pixelPitchMultiplier: 2.5,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.0
  },
  'rigel-p1.25-indoor': {
    basePrice: 120000,
    pixelPitchMultiplier: 3.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.0
  },
  'rigel-p0.9-indoor': {
    basePrice: 160000,
    pixelPitchMultiplier: 4.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.0
  },
  'orion-p3.9': {
    basePrice: 60000,
    pixelPitchMultiplier: 1.3,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.0
  },
  'orion-p3-outdoor-rigel': {
    basePrice: 80000,
    pixelPitchMultiplier: 1.0,
    sizeMultiplier: 1.0,
    environmentMultiplier: 1.2
  }
};

/**
 * Calculate user-specific pricing for a product
 */
export function calculateUserSpecificPrice(
  productDetails: any,
  userType: string
): {
  basePrice: number;
  userPrice: number;
  discount: number;
  pricingTier: PricingTier;
  breakdown: {
    productBase: number;
    sizeAdjustment: number;
    environmentAdjustment: number;
    userDiscount: number;
  };
} {
  // Get pricing tier based on the quotation's user type
  const pricingTier = PRICING_TIERS[userType] || PRICING_TIERS['endUser'];
  
  // Get product pricing info
  const productId = productDetails?.productId || '';
  const productPricing = PRODUCT_PRICING[productId] || PRODUCT_PRICING['rigel-p3-outdoor'];
  
  // Calculate display size in square meters
  const displaySize = productDetails?.displaySize;
  const sizeInSqm = displaySize ? 
    (displaySize.width * displaySize.height) : 
    (productDetails?.cabinetGrid ? 
      (productDetails.cabinetGrid.columns * productDetails.cabinetGrid.rows * 0.5) : // Default cabinet size
      1
    );
  
  // Calculate base price
  const productBase = productPricing.basePrice * sizeInSqm;
  const sizeAdjustment = productBase * (productPricing.sizeMultiplier - 1);
  const environmentAdjustment = productBase * (productPricing.environmentMultiplier - 1);
  
  const basePrice = productBase + sizeAdjustment + environmentAdjustment;
  
  // Apply user-specific discount
  const userDiscount = basePrice * (1 - pricingTier.multiplier);
  const userPrice = basePrice * pricingTier.multiplier;
  
  return {
    basePrice: Math.round(basePrice),
    userPrice: Math.round(userPrice),
    discount: Math.round(userDiscount),
    pricingTier,
    breakdown: {
      productBase: Math.round(productBase),
      sizeAdjustment: Math.round(sizeAdjustment),
      environmentAdjustment: Math.round(environmentAdjustment),
      userDiscount: Math.round(userDiscount)
    }
  };
}

/**
 * Get pricing information for display
 */
export function getPricingDisplayInfo(
  productDetails: any,
  userType: string
): {
  price: number;
  originalPrice?: number;
  discount?: number;
  pricingTier: string;
  description: string;
} {
  const pricing = calculateUserSpecificPrice(productDetails, userType);
  
  return {
    price: pricing.userPrice,
    originalPrice: pricing.pricingTier.multiplier < 1 ? pricing.basePrice : undefined,
    discount: pricing.pricingTier.multiplier < 1 ? pricing.discount : undefined,
    pricingTier: pricing.pricingTier.name,
    description: pricing.pricingTier.description
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `₹${price.toLocaleString()}`;
}

/**
 * Get user type from quotation data
 */
export function getUserTypeFromQuotation(quotation: any): string {
  // First check the userType field
  if (quotation.userType) {
    return quotation.userType;
  }
  
  // If userType is not available, check userTypeDisplayName
  if (quotation.userTypeDisplayName) {
    const displayName = quotation.userTypeDisplayName.toLowerCase();
    if (displayName.includes('reseller')) {
      return 'reseller';
    } else if (displayName.includes('channel') || displayName.includes('si')) {
      return 'siChannel';
    } else if (displayName.includes('end')) {
      return 'endUser';
    }
  }
  
  // Default fallback
  return 'endUser';
}
