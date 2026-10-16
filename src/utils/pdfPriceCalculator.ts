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
import { calculateCentralizedPricing, calculatePricingQuantity, getCatalogUnitPrice } from './centralizedPricing';

export interface PricingBreakdown {

  unitPrice: number;
  quantity: number;
  orderQuantity: number;
  unitGrandTotal: number;
  productSubtotal: number;
  productGST: number;
  productTotal: number;

  processorPrice: number;
  processorGST: number;
  processorTotal: number;

  addonsCost: number;
  addonsGST: number;
  addonsTotal: number;
  appliedAddons: { name: string; price: number }[];

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
export function getProductUnitPrice(product: Product, userType: string): number | null {
  return getCatalogUnitPrice(product, userType);
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
  cabinetGrid: { columns: number; rows: number; totalWidth?: number; totalHeight?: number } | null,
  config: { width: number; height: number; unit: string }
): number {
  return calculatePricingQuantity(product, cabinetGrid, config);
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
  cabinetGrid: { columns: number; rows: number; totalWidth?: number; totalHeight?: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string },
  wireType?: 'gold' | 'copper',
  nexaAddons?: string[],
  orderQuantity?: number
): PricingBreakdown {
  try {

    const pricingResult = calculateCentralizedPricing(
      product,
      cabinetGrid,
      processor,
      userType,
      config,
      undefined,
      wireType,
      nexaAddons,
      orderQuantity
    );
    if (!pricingResult.isAvailable) throw new Error('Price is unavailable for this product configuration.');

    const breakdown: PricingBreakdown = {
      unitPrice: pricingResult.unitPrice,
      quantity: pricingResult.quantity,
      orderQuantity: pricingResult.orderQuantity,
      unitGrandTotal: pricingResult.unitGrandTotal,
      productSubtotal: pricingResult.productSubtotal,
      productGST: pricingResult.productGST,
      productTotal: pricingResult.productTotal,
      processorPrice: pricingResult.processorPrice,
      processorGST: pricingResult.processorGST,
      processorTotal: pricingResult.processorTotal,
      addonsCost: pricingResult.addonsCost,
      addonsGST: pricingResult.addonsGST,
      addonsTotal: pricingResult.addonsTotal,
      appliedAddons: pricingResult.appliedAddons,
      grandTotal: pricingResult.grandTotal,
      userType: pricingResult.userType,
      productName: pricingResult.productName,
      processorName: pricingResult.processorName,
      cabinetGrid: pricingResult.cabinetGrid,
      displaySize: pricingResult.displaySize
    };

    return breakdown;
    
  } catch (error) {
    throw error;
  }
}

/**
 * Validate that stored price matches PDF calculation
 * This function ensures consistency between database and PDF
 */
export function validatePriceConsistency(
  storedPrice: number,
  product: Product,
  cabinetGrid: { columns: number; rows: number; totalWidth?: number; totalHeight?: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string },
  wireType?: 'gold' | 'copper',
  nexaAddons?: string[]
): { isValid: boolean; calculatedPrice: number; difference: number; message: string } {
  try {
    const calculatedBreakdown = calculatePricingBreakdown(product, cabinetGrid, processor, userType, config, wireType, nexaAddons);
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
      message: `❌ Price validation failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
