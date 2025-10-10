/**
 * PDF PRICE CALCULATOR - AUTHORITATIVE PRICING LOGIC
 * 
 * This module contains the EXACT same pricing calculation logic used in PDF generation.
 * This ensures 100% consistency between:
 * 1. PDF Grand Total calculation
 * 2. Database storage
 * 3. Super Admin Dashboard display
 * 
 * CRITICAL: Any changes to PDF pricing logic MUST be updated here as well.
 */

import { Product } from '../types';

// Processor pricing mapping (matches PDF exactly)
const PROCESSOR_PRICES: Record<string, { endUser: number; reseller: number; channel: number }> = {
  'TB2': { endUser: 15000, reseller: 12000, channel: 10000 },
  'TB40': { endUser: 25000, reseller: 20000, channel: 17000 },
  'TB60': { endUser: 35000, reseller: 28000, channel: 24000 },
  'VX1': { endUser: 20000, reseller: 16000, channel: 14000 },
  'VX400': { endUser: 30000, reseller: 24000, channel: 21000 },
  'VX400 Pro': { endUser: 35000, reseller: 28000, channel: 24000 },
  'VX600': { endUser: 45000, reseller: 36000, channel: 31000 },
  'VX600 Pro': { endUser: 50000, reseller: 40000, channel: 34000 },
  'VX1000': { endUser: 65000, reseller: 52000, channel: 44000 },
  'VX1000 Pro': { endUser: 70000, reseller: 56000, channel: 48000 },
  '4K PRIME': { endUser: 100000, reseller: 80000, channel: 68000 }
};

export interface PricingBreakdown {
  // Product pricing
  unitPrice: number;
  quantity: number;
  productSubtotal: number;
  productGST: number;
  productTotal: number;
  
  // Processor pricing
  processorPrice: number;
  processorGST: number;
  processorTotal: number;
  
  // Grand total
  grandTotal: number;
  
  // Metadata
  userType: string;
  productName: string;
  processorName?: string;
  cabinetGrid?: { columns: number; rows: number };
  displaySize?: { width: number; height: number };
}

/**
 * Get product unit price based on user type (matches PDF logic exactly)
 */
export function getProductUnitPrice(product: Product, userType: string): number {
  try {
    // Handle rental products
    if (product.category?.toLowerCase().includes('rental') && product.prices) {
      if (userType === 'Reseller') {
        return product.prices.cabinet.reseller;
      } else if (userType === 'Channel') {
        return product.prices.cabinet.siChannel;
      } else {
        return product.prices.cabinet.endCustomer;
      }
    }
    
    // For regular products, use the appropriate price field based on user type
    if (userType === 'Reseller' && typeof product.resellerPrice === 'number') {
      return product.resellerPrice;
    } else if (userType === 'Channel' && typeof product.siChannelPrice === 'number') {
      return product.siChannelPrice;
    } else if (typeof product.price === 'number') {
      return product.price;
    } else if (typeof product.price === 'string') {
      const parsedPrice = parseFloat(product.price);
      return isNaN(parsedPrice) ? 5300 : parsedPrice;
    }
    
    // Fallback to default pricing
    return 5300;
    
  } catch (error) {
    console.error('Error getting product unit price:', error);
    return 5300;
  }
}

/**
 * Get processor price based on user type (matches PDF logic exactly)
 */
export function getProcessorPrice(processorName: string, userType: string): number {
  try {
    const processor = PROCESSOR_PRICES[processorName];
    if (!processor) {
      return 0; // No processor price
    }

    if (userType === 'Reseller') {
      return processor.reseller;
    } else if (userType === 'Channel') {
      return processor.channel;
    } else {
      return processor.endUser;
    }
    
  } catch (error) {
    console.error('Error getting processor price:', error);
    return 0;
  }
}

/**
 * Calculate quantity based on product type and configuration (matches PDF logic exactly)
 */
export function calculateQuantity(
  product: Product,
  cabinetGrid: { columns: number; rows: number } | null,
  config: { width: number; height: number; unit: string }
): number {
  try {
    const METERS_TO_FEET = 3.2808399;
    
    if (product.category?.toLowerCase().includes('rental')) {
      // For rental series, calculate quantity as number of cabinets
      return cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
    } else {
      // For other products, calculate quantity in square feet - MATCH PDF EXACTLY
      const widthInMeters = config.width / 1000;
      const heightInMeters = config.height / 1000;
      const widthInFeet = widthInMeters * METERS_TO_FEET;
      const heightInFeet = heightInMeters * METERS_TO_FEET;
      const quantity = widthInFeet * heightInFeet;
      
      // Ensure quantity is reasonable (same as PDF)
      return isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
    }
  } catch (error) {
    console.error('Error calculating quantity:', error);
    return 1;
  }
}

/**
 * Calculate complete pricing breakdown (matches PDF Grand Total exactly)
 * This is the AUTHORITATIVE pricing calculation used by:
 * 1. PDF generation
 * 2. Database storage
 * 3. Super Admin Dashboard
 */
export function calculatePricingBreakdown(
  product: Product,
  cabinetGrid: { columns: number; rows: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string }
): PricingBreakdown {
  try {
    // Convert userType to match PDF logic
    let pdfUserType: 'End User' | 'Reseller' | 'Channel' = 'End User';
    if (userType === 'reseller') {
      pdfUserType = 'Reseller';
    } else if (userType === 'siChannel') {
      pdfUserType = 'Channel';
    }
    
    // Get unit price (same logic as PDF)
    const unitPrice = getProductUnitPrice(product, pdfUserType);
    
    // Calculate quantity (same logic as PDF)
    const quantity = calculateQuantity(product, cabinetGrid, config);
    
    // Calculate product pricing (before GST)
    const productSubtotal = unitPrice * quantity;
    const productGST = productSubtotal * 0.18;
    const productTotal = productSubtotal + productGST;
    
    // Calculate processor pricing (before GST)
    const processorPrice = processor ? getProcessorPrice(processor, pdfUserType) : 0;
    const processorGST = processorPrice * 0.18;
    const processorTotal = processorPrice + processorGST;
    
    // Calculate Grand Total (A + B) - matches PDF exactly
    const grandTotal = productTotal + processorTotal;
    
    const breakdown: PricingBreakdown = {
      unitPrice,
      quantity,
      productSubtotal,
      productGST,
      productTotal,
      processorPrice,
      processorGST,
      processorTotal,
      grandTotal: Math.round(grandTotal), // Round to nearest rupee
      userType: pdfUserType,
      productName: product.name,
      processorName: processor || undefined,
      cabinetGrid: cabinetGrid || undefined,
      displaySize: {
        width: Number((config.width / 1000).toFixed(2)),
        height: Number((config.height / 1000).toFixed(2))
      }
    };
    
    console.log('💰 PDF Price Calculator - Complete Breakdown:', {
      product: product.name,
      userType: pdfUserType,
      unitPrice,
      quantity,
      productSubtotal,
      productGST,
      productTotal,
      processorPrice,
      processorGST,
      processorTotal,
      grandTotal: breakdown.grandTotal,
      breakdown: {
        'Unit Price (per sq.ft)': unitPrice,
        'Quantity (sq.ft)': quantity,
        'Product Subtotal': productSubtotal,
        'Product GST (18%)': productGST,
        'Product Total (A)': productTotal,
        'Processor Price': processorPrice,
        'Processor GST (18%)': processorGST,
        'Processor Total (B)': processorTotal,
        'GRAND TOTAL (A+B) with GST': breakdown.grandTotal
      }
    });
    
    return breakdown;
    
  } catch (error) {
    console.error('Error calculating pricing breakdown:', error);
    // Return fallback pricing
    return {
      unitPrice: 5300,
      quantity: 1,
      productSubtotal: 5300,
      productGST: 954,
      productTotal: 6254,
      processorPrice: 0,
      processorGST: 0,
      processorTotal: 0,
      grandTotal: 6254,
      userType: 'End User',
      productName: product.name
    };
  }
}

/**
 * Validate that stored price matches PDF calculation
 * This function ensures consistency between database and PDF
 */
export function validatePriceConsistency(
  storedPrice: number,
  product: Product,
  cabinetGrid: { columns: number; rows: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string }
): { isValid: boolean; calculatedPrice: number; difference: number; message: string } {
  try {
    const calculatedBreakdown = calculatePricingBreakdown(product, cabinetGrid, processor, userType, config);
    const calculatedPrice = calculatedBreakdown.grandTotal;
    const difference = Math.abs(storedPrice - calculatedPrice);
    const tolerance = 1; // Allow 1 rupee difference for rounding
    
    const isValid = difference <= tolerance;
    
    const message = isValid 
      ? `✅ Price consistency verified: Stored (₹${storedPrice.toLocaleString('en-IN')}) matches PDF (₹${calculatedPrice.toLocaleString('en-IN')})`
      : `❌ Price mismatch detected: Stored (₹${storedPrice.toLocaleString('en-IN')}) vs PDF (₹${calculatedPrice.toLocaleString('en-IN')}) - Difference: ₹${difference.toLocaleString('en-IN')}`;
    
    console.log('🔍 Price Consistency Check:', {
      storedPrice,
      calculatedPrice,
      difference,
      isValid,
      message
    });
    
    return {
      isValid,
      calculatedPrice,
      difference,
      message
    };
    
  } catch (error) {
    console.error('Error validating price consistency:', error);
    return {
      isValid: false,
      calculatedPrice: 0,
      difference: storedPrice,
      message: `❌ Price validation failed: ${error.message}`
    };
  }
}
