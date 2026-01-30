/**
 * CENTRALIZED PRICING CALCULATION
 * 
 * This is the SINGLE SOURCE OF TRUTH for all pricing calculations.
 * All systems (database storage, PDF generation, dashboard display) MUST use this function
 * to ensure 100% price consistency.
 * 
 * CRITICAL: Any changes to pricing logic MUST be made here only.
 */

import { Product } from '../types';
import { getProcessorPrice } from './processorPrices';

export interface PricingCalculationResult {

  unitPrice: number;
  quantity: number;
  productSubtotal: number;
  productGST: number;
  productTotal: number;

  processorPrice: number;
  processorGST: number;
  processorTotal: number;

  structureCost: number;
  structureGST: number;
  structureTotal: number;
  installationCost: number;
  installationGST: number;
  installationTotal: number;

  grandTotal: number;

  userType: string;
  productName: string;
  processorName?: string;
  cabinetGrid?: { columns: number; rows: number };
  displaySize?: { width: number; height: number };

  isAvailable: boolean; // false if price is NA
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
 * Get product unit price based on user type
 * Returns null if price is NA (Not Available)
 */
function getProductUnitPrice(product: Product, userType: string): number | null {
  try {

    if (product.category?.toLowerCase().includes('rental') && product.prices) {
      if (userType === 'Reseller') {
        const price = product.prices.cabinet.reseller;
        return ((price as any) === 'NA' || (price as any) === 'N/A') ? null : price;
      } else if (userType === 'Channel') {
        const price = product.prices.cabinet.siChannel;
        return ((price as any) === 'NA' || (price as any) === 'N/A') ? null : price;
      } else {
        const price = product.prices.cabinet.endCustomer;
        return ((price as any) === 'NA' || (price as any) === 'N/A') ? null : price;
      }
    }

    let selectedPrice: any;

    if (userType === 'Reseller') {
      selectedPrice = product.resellerPrice;
    } else if (userType === 'Channel') {
      selectedPrice = product.siChannelPrice;
    } else {
      selectedPrice = product.price;
    }

    if (selectedPrice === 'NA' || selectedPrice === 'N/A' || selectedPrice === null || selectedPrice === undefined) {
      return null;
    }

    if (typeof selectedPrice === 'number') {
      return selectedPrice;
    }

    if (typeof selectedPrice === 'string') {
      const parsedPrice = parseFloat(selectedPrice);
      return isNaN(parsedPrice) ? 5300 : parsedPrice;
    }

    return 5300;

  } catch (error) {

    return 5300;
  }
}

/**
 * Calculate quantity based on product type and configuration
 */
function calculateQuantity(
  product: Product,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
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
 * Calculate Structure Cost based on product environment
 * @param environment - Product environment ('Indoor' or 'Outdoor')
 * @param cabinetGrid - Cabinet grid with columns and rows
 * @param area - Screen area in square feet (for outdoor products)
 * @returns Base structure cost (before GST)
 */
export function calculateStructureCost(
  environment: string | null | undefined,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  area: number
): number {
  const normalizedEnv = environment?.toLowerCase().trim();

  if (normalizedEnv === 'indoor') {

    const numberOfCabinets = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
    return Math.round((numberOfCabinets * 4000) * 100) / 100;
  } else {

    return Math.round((area * 2500) * 100) / 100;
  }
}

/**
 * Calculate Installation Cost
 * @param area - Screen area in square feet (used if type is 'per_sqft')
 * @param type - 'fixed' for flat amount or 'per_sqft' for per square foot
 * @param value - Fixed amount or rate per square foot (default: ₹500/sqft)
 * @returns Base installation cost (before GST)
 */
export function calculateInstallationCost(
  area: number,
  type: 'fixed' | 'per_sqft' = 'per_sqft',
  value: number = 500
): number {
  if (type === 'fixed') {
    return Math.round(value * 100) / 100;
  } else {
    return Math.round((area * value) * 100) / 100;
  }
}

/**
 * CENTRALIZED PRICING CALCULATION FUNCTION
 * 
 * This function calculates prices with consistent rounding and is used by:
 * 1. Database storage (QuoteModal)
 * 2. PDF generation (pdfPriceCalculator)
 * 3. Dashboard display
 * 
 * CRITICAL: All pricing calculations MUST use this function
 */
export function calculateCentralizedPricing(
  product: Product,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  processor: string | null | undefined,
  userType: string,
  config: { width: number; height: number; unit: string },
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
    installationType?: 'fixed' | 'per_sqft';
  }
): PricingCalculationResult {
  try {

    let pdfUserType: 'End User' | 'Reseller' | 'Channel' = 'End User';
    if (userType === 'reseller') {
      pdfUserType = 'Reseller';
    } else if (userType === 'siChannel') {
      pdfUserType = 'Channel';
    }

    const unitPrice = getProductUnitPrice(product, pdfUserType);

    if (unitPrice === null) {

      return {
        unitPrice: 0,
        quantity: 0,
        productSubtotal: 0,
        productGST: 0,
        productTotal: 0,
        processorPrice: 0,
        processorGST: 0,
        processorTotal: 0,
        structureCost: 0,
        structureGST: 0,
        structureTotal: 0,
        installationCost: 0,
        installationGST: 0,
        installationTotal: 0,
        grandTotal: 0,
        userType: pdfUserType,
        productName: product.name,
        processorName: processor || undefined,
        cabinetGrid: cabinetGrid || undefined,
        displaySize: {
          width: Number((config.width / 1000).toFixed(2)),
          height: Number((config.height / 1000).toFixed(2))
        },
        isAvailable: false
      };
    }

    const quantity = calculateQuantity(product, cabinetGrid, config);

    const roundedQuantity = Math.round(quantity * 100) / 100;
    const productSubtotal = Math.round((unitPrice * roundedQuantity) * 100) / 100;
    const productGST = Math.round((productSubtotal * 0.18) * 100) / 100;
    const productTotal = Math.round((productSubtotal + productGST) * 100) / 100;

    let processorPrice = 0;
    if (processor && !isJumboSeriesProduct(product)) {
      processorPrice = getProcessorPrice(processor, pdfUserType);
    }

    const processorGST = Math.round((processorPrice * 0.18) * 100) / 100;
    const processorTotal = Math.round((processorPrice + processorGST) * 100) / 100;

    const METERS_TO_FEET = 3.2808399;
    const widthInMeters = config.width / 1000;
    const heightInMeters = config.height / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;

    let structureBasePrice: number;
    let installationBasePrice: number;

    if (customPricing?.enabled && customPricing.structurePrice !== null && customPricing.installationPrice !== null) {

      structureBasePrice = customPricing.structurePrice;

      if (customPricing.installationType === 'fixed') {
        installationBasePrice = customPricing.installationPrice;
      } else {
        installationBasePrice = calculateInstallationCost(screenAreaSqFt, 'per_sqft', customPricing.installationPrice);
      }
    } else {

      structureBasePrice = calculateStructureCost(product.environment, cabinetGrid, screenAreaSqFt);
      installationBasePrice = calculateInstallationCost(screenAreaSqFt, 'per_sqft', 500);
    }

    const structureGST = Math.round((structureBasePrice * 0.18) * 100) / 100;
    const structureTotal = Math.round((structureBasePrice + structureGST) * 100) / 100;

    const installationGST = Math.round((installationBasePrice * 0.18) * 100) / 100;
    const installationTotal = Math.round((installationBasePrice + installationGST) * 100) / 100;

    const grandTotal = Math.round(productTotal + processorTotal + structureTotal + installationTotal);

    const result: PricingCalculationResult = {
      unitPrice,
      quantity: roundedQuantity, // Use rounded quantity for consistency
      productSubtotal,
      productGST,
      productTotal,
      processorPrice,
      processorGST,
      processorTotal,
      structureCost: structureBasePrice,
      structureGST,
      structureTotal,
      installationCost: installationBasePrice,
      installationGST,
      installationTotal,
      grandTotal,
      userType: pdfUserType,
      productName: product.name,
      processorName: processor || undefined,
      cabinetGrid: cabinetGrid || undefined,
      displaySize: {
        width: Number((config.width / 1000).toFixed(2)),
        height: Number((config.height / 1000).toFixed(2))
      },
      isAvailable: true
    };

    return result;

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
      structureCost: 0,
      structureGST: 0,
      structureTotal: 0,
      installationCost: 0,
      installationGST: 0,
      installationTotal: 0,
      grandTotal: 6254,
      userType: 'End User',
      productName: product.name,
      isAvailable: true
    };
  }
}

/**
 * Validate that stored price matches centralized calculation
 */
export function validatePriceConsistency(
  storedPrice: number,
  product: Product,
  cabinetGrid: { columns: number; rows: number } | null | undefined,
  processor: string | null | undefined,
  userType: string,
  config: { width: number; height: number; unit: string }
): { isValid: boolean; calculatedPrice: number; difference: number; message: string } {
  try {
    const calculatedResult = calculateCentralizedPricing(product, cabinetGrid, processor, userType, config);
    const calculatedPrice = calculatedResult.grandTotal;
    const difference = Math.abs(storedPrice - calculatedPrice);
    const tolerance = 1; // Allow 1 rupee difference for rounding

    const isValid = difference <= tolerance;

    const message = isValid
      ? `✅ Price consistency verified: Stored (₹${storedPrice.toLocaleString('en-IN')}) matches calculation (₹${calculatedPrice.toLocaleString('en-IN')})`
      : `❌ Price mismatch detected: Stored (₹${storedPrice.toLocaleString('en-IN')}) vs Calculation (₹${calculatedPrice.toLocaleString('en-IN')}) - Difference: ₹${difference.toLocaleString('en-IN')}`;

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
      message: `❌ Price validation failed: ${(error as any).message}`
    };
  }
}
