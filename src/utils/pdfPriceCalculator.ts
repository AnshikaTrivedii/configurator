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
import { getProcessorPrice } from './processorPrices';
import { calculateCentralizedPricing } from './centralizedPricing';

export interface PricingBreakdown {

  unitPrice: number;
  quantity: number;
  productSubtotal: number;
  productGST: number;
  productTotal: number;

  processorPrice: number;
  processorGST: number;
  processorTotal: number;

  grandTotal: number;

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

    if (product.category?.toLowerCase().includes('rental') && product.prices) {
      if (userType === 'Reseller') {
        return product.prices.cabinet.reseller;
      } else if (userType === 'Channel') {
        return product.prices.cabinet.siChannel;
      } else {
        return product.prices.cabinet.endCustomer;
      }
    }

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

    return 5300;
    
  } catch (error) {

    return 5300;
  }
}

/**
 * Check if product is a Jumbo Series product (prices include controllers)
 */
function isJumboSeriesProduct(product: Product): boolean {
  return product.category?.toLowerCase().includes('jumbo') || 
         product.id?.toLowerCase().startsWith('jumbo-') ||
         product.name?.toLowerCase().includes('jumbo series');
}

/**
 * Get processor price based on user type (matches PDF logic exactly)
 * Returns 0 for Jumbo Series products as their prices already include controllers
 */
export function getProcessorPriceForProduct(processorName: string, userType: string, product?: Product): number {
  try {

    if (product && isJumboSeriesProduct(product)) {

      return 0;
    }

    return getProcessorPrice(processorName, userType);
    
  } catch (error) {

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

      return cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
    } else if (isJumboSeriesProduct(product)) {

      const pixelPitch = product.pixelPitch;
      
      if (pixelPitch === 4 || pixelPitch === 2.5) {

        const widthInFeet = 7.34;
        const heightInFeet = 4.72;
        const fixedQuantity = widthInFeet * heightInFeet;

        return Math.round(fixedQuantity * 100) / 100; // 34.64 sqft
      } else if (pixelPitch === 3 || pixelPitch === 6) {

        const widthInFeet = 6.92;
        const heightInFeet = 5.04;
        const fixedQuantity = widthInFeet * heightInFeet;

        return Math.round(fixedQuantity * 100) / 100; // 34.88 sqft
      }
    } else {

      const widthInMeters = config.width / 1000;
      const heightInMeters = config.height / 1000;
      const widthInFeet = widthInMeters * METERS_TO_FEET;
      const heightInFeet = heightInMeters * METERS_TO_FEET;
      const quantity = widthInFeet * heightInFeet;

      const roundedQuantity = Math.round(quantity * 100) / 100;

      return isNaN(roundedQuantity) || roundedQuantity <= 0 ? 1 : Math.max(0.01, Math.min(roundedQuantity, 10000));
    }

    return 1;
  } catch (error) {

    return 1;
  }
}

/**
 * Calculate complete pricing breakdown (matches PDF Grand Total exactly)
 * This is the AUTHORITATIVE pricing calculation used by:
 * 1. PDF generation
 * 2. Database storage
 * 3. Super Admin Dashboard
 * 
 * CRITICAL: Now uses centralized pricing function for 100% consistency
 */
export function calculatePricingBreakdown(
  product: Product,
  cabinetGrid: { columns: number; rows: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string }
): PricingBreakdown {
  try {

    const pricingResult = calculateCentralizedPricing(
      product,
      cabinetGrid,
      processor,
      userType,
      config
    );

    const breakdown: PricingBreakdown = {
      unitPrice: pricingResult.unitPrice,
      quantity: pricingResult.quantity,
      productSubtotal: pricingResult.productSubtotal,
      productGST: pricingResult.productGST,
      productTotal: pricingResult.productTotal,
      processorPrice: pricingResult.processorPrice,
      processorGST: pricingResult.processorGST,
      processorTotal: pricingResult.processorTotal,
      grandTotal: pricingResult.grandTotal,
      userType: pricingResult.userType,
      productName: pricingResult.productName,
      processorName: pricingResult.processorName,
      cabinetGrid: pricingResult.cabinetGrid,
      displaySize: pricingResult.displaySize
    };

    return breakdown;
    
  } catch (error) {

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

    return {
      isValid,
      calculatedPrice,
      difference,
      message
    };
    
  } catch (error) {

    return {
      isValid: false,
      calculatedPrice: 0,
      difference: storedPrice,
      message: `❌ Price validation failed: ${error.message}`
    };
  }
}
