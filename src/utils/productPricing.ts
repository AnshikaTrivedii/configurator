// Product-specific pricing utility
// This replaces the generic pricing calculator with actual product prices

import { Product } from '../types';

export interface ProductPricingResult {
  basePrice: number;
  userPrice: number;
  discount: number;
  pricingTier: string;
  breakdown: {
    productBase: number;
    userDiscount: number;
  };
}

/**
 * Get the correct price for a product based on user type
 * Uses the actual product prices defined in products.ts
 */
export function getProductPrice(
  product: Product, 
  userType: 'endUser' | 'reseller' | 'siChannel'
): ProductPricingResult {
  let basePrice: number;
  let userPrice: number;
  let pricingTier: string;
  
  // Handle different product types
  if (product.category?.toLowerCase().includes('rental') && product.prices) {
    // For rental products, use cabinet pricing based on user type
    basePrice = product.prices.cabinet.endCustomer;
    
    if (userType === 'reseller') {
      userPrice = product.prices.cabinet.reseller;
      pricingTier = 'Reseller';
    } else if (userType === 'siChannel') {
      userPrice = product.prices.cabinet.siChannel;
      pricingTier = 'SI Channel';
    } else {
      userPrice = product.prices.cabinet.endCustomer;
      pricingTier = 'End User';
    }
  } else {
    // For regular products, use the appropriate price field based on user type
    if (userType === 'reseller' && typeof product.resellerPrice === 'number') {
      basePrice = product.price || 0;
      userPrice = product.resellerPrice;
      pricingTier = 'Reseller';
    } else if (userType === 'siChannel' && typeof product.siChannelPrice === 'number') {
      basePrice = product.price || 0;
      userPrice = product.siChannelPrice;
      pricingTier = 'SI Channel';
    } else if (typeof product.price === 'number') {
      basePrice = product.price;
      userPrice = product.price;
      pricingTier = 'End User';
    } else {
      // Fallback to default pricing if no price available
      basePrice = 5300;
      userPrice = 5300;
      pricingTier = 'End User';
    }
  }
  
  const discount = Math.max(0, basePrice - userPrice);
  
  return {
    basePrice: Math.round(basePrice),
    userPrice: Math.round(userPrice),
    discount: Math.round(discount),
    pricingTier,
    breakdown: {
      productBase: Math.round(basePrice),
      userDiscount: Math.round(discount)
    }
  };
}

/**
 * Calculate total price for a product configuration
 * Takes into account the number of cabinets/modules
 */
export function calculateTotalProductPrice(
  product: Product,
  cabinetGrid: { columns: number; rows: number },
  userType: 'endUser' | 'reseller' | 'siChannel'
): ProductPricingResult {
  const pricing = getProductPrice(product, userType);
  const totalCabinets = cabinetGrid.columns * cabinetGrid.rows;
  
  return {
    basePrice: Math.round(pricing.basePrice * totalCabinets),
    userPrice: Math.round(pricing.userPrice * totalCabinets),
    discount: Math.round(pricing.discount * totalCabinets),
    pricingTier: pricing.pricingTier,
    breakdown: {
      productBase: Math.round(pricing.breakdown.productBase * totalCabinets),
      userDiscount: Math.round(pricing.breakdown.userDiscount * totalCabinets)
    }
  };
}

/**
 * Get pricing information for display
 */
export function getPricingDisplayInfo(
  product: Product,
  cabinetGrid: { columns: number; rows: number },
  userType: 'endUser' | 'reseller' | 'siChannel'
): {
  price: number;
  originalPrice?: number;
  discount?: number;
  pricingTier: string;
  description: string;
} {
  const pricing = calculateTotalProductPrice(product, cabinetGrid, userType);
  
  return {
    price: pricing.userPrice,
    originalPrice: pricing.pricingTier !== 'End User' ? pricing.basePrice : undefined,
    discount: pricing.pricingTier !== 'End User' ? pricing.discount : undefined,
    pricingTier: pricing.pricingTier,
    description: `${pricing.pricingTier} pricing`
  };
}

/**
 * Format price for display
 */
export function formatPrice(price: number): string {
  return `₹${price.toLocaleString('en-IN')}`;
}

/**
 * Get user type from quotation data
 */
export function getUserTypeFromQuotation(quotation: any): 'endUser' | 'reseller' | 'siChannel' {
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
