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
 * Check if product is Digital Standee (controller should be excluded)
 */
function isDigitalStandeeProduct(product: Product): boolean {
  return product.category?.toLowerCase().includes('digital standee') ?? false;
}

/**
 * Check if product is Modular Series (wire type affects pricing)
 */
function isModularSeriesProduct(product: Product): boolean {
  return product.category?.toLowerCase().includes('modular') ?? false;
}

/**
 * Check if product is fixed (Nexa Series)
 */
function isFixedProduct(product: Product): boolean {
  return product.isFixed === true || product.category?.toLowerCase().includes('nexa') || false;
}

function isNexaSeriesProduct(product: Product): boolean {
  return product.category?.toLowerCase().includes('nexa') ||
    product.name?.toLowerCase().includes('nexa series') ||
    product.id?.toLowerCase().startsWith('nexa-') ||
    false;
}

const NEXA_ADDON_PRICES: Record<string, number> = {
  'IR Touch': 75000,
  'Floor Mount Stand': 85000
};

/** Modular Series pricing by pixel pitch (mm) -> wire type -> End User, SI Channel, Reseller */
const MODULAR_PRICING: Record<number, { gold: [number, number, number]; copper: [number, number, number] }> = {
  3.91: { gold: [19800, 17900, 16800], copper: [9900, 9000, 8400] },
  4.81: { gold: [15100, 13700, 12800], copper: [8400, 7700, 7200] },
  6.25: { gold: [12200, 11100, 10400], copper: [8300, 7500, 7000] },
  7.81: { gold: [9900, 9000, 8400], copper: [7400, 6700, 6300] },
  10.41: { gold: [8000, 7300, 6800], copper: [6600, 6000, 5600] }
};

function getModularUnitPrice(pixelPitch: number, wireType: 'gold' | 'copper', userType: 'End User' | 'Reseller' | 'Channel'): number | null {
  const pitchKey = Object.keys(MODULAR_PRICING).map(Number).find(p => Math.abs(p - pixelPitch) < 0.02);
  if (pitchKey == null) return null;
  const row = MODULAR_PRICING[pitchKey];
  const wire = wireType === 'gold' ? row.gold : row.copper;
  if (userType === 'Reseller') return wire[2];
  if (userType === 'Channel') return wire[1];
  return wire[0];
}

/**
 * Get product unit price based on user type
 * Returns null if price is NA (Not Available)
 * For Modular Series, wireType is used to select gold/copper pricing.
 */
function getProductUnitPrice(
  product: Product,
  userType: string,
  wireType?: 'gold' | 'copper'
): number | null {
  try {

    if (isModularSeriesProduct(product)) {
      const pdfUserType: 'End User' | 'Reseller' | 'Channel' = userType === 'Reseller' ? 'Reseller' : userType === 'Channel' ? 'Channel' : 'End User';
      const wt = wireType ?? 'gold';
      const price = getModularUnitPrice(product.pixelPitch, wt, pdfUserType);
      return price ?? null;
    }

    if (product.category?.toLowerCase().includes('rental') && product.prices) {
      const isCurveLock = product.rentalOption === 'curve lock' || product.rentalOption === 'curveLock';
      let cabinetPrice: number;
      let curveLockAddOn = 0;
      if (userType === 'Reseller') {
        cabinetPrice = product.prices.cabinet.reseller as number;
        if (isCurveLock && product.prices.curveLock) curveLockAddOn = product.prices.curveLock.reseller as number;
      } else if (userType === 'Channel') {
        cabinetPrice = product.prices.cabinet.siChannel as number;
        if (isCurveLock && product.prices.curveLock) curveLockAddOn = product.prices.curveLock.siChannel as number;
      } else {
        cabinetPrice = product.prices.cabinet.endCustomer as number;
        if (isCurveLock && product.prices.curveLock) curveLockAddOn = product.prices.curveLock.endCustomer as number;
      }
      const price = cabinetPrice + curveLockAddOn;
      return ((cabinetPrice as any) === 'NA' || (cabinetPrice as any) === 'N/A') ? null : price;
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
    } else if (product.category?.toLowerCase().includes('digital standee') || isFixedProduct(product)) {
      return 1;
    } else if (isJumboSeriesProduct(product)) {
      // Jumbo: prices are per ft² (controller included). Quantity = display area in sq ft.
      const effectiveWidth = cabinetGrid?.totalWidth ?? config.width;
      const effectiveHeight = cabinetGrid?.totalHeight ?? config.height;
      const widthInMeters = effectiveWidth / 1000;
      const heightInMeters = effectiveHeight / 1000;
      const widthInFeet = widthInMeters * METERS_TO_FEET;
      const heightInFeet = heightInMeters * METERS_TO_FEET;
      const quantity = widthInFeet * heightInFeet;
      const roundedQuantity = Math.round(quantity * 100) / 100;
      return isNaN(roundedQuantity) || roundedQuantity <= 0 ? 1 : Math.max(0.01, Math.min(roundedQuantity, 10000));
    } else {

      const effectiveWidth = cabinetGrid?.totalWidth ?? config.width;
      const effectiveHeight = cabinetGrid?.totalHeight ?? config.height;
      const widthInMeters = effectiveWidth / 1000;
      const heightInMeters = effectiveHeight / 1000;
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
  },
  wireType?: 'gold' | 'copper',
  nexaAddons?: string[]
): PricingCalculationResult {
  try {

    let pdfUserType: 'End User' | 'Reseller' | 'Channel' = 'End User';
    if (userType === 'reseller') {
      pdfUserType = 'Reseller';
    } else if (userType === 'siChannel') {
      pdfUserType = 'Channel';
    }

    const unitPrice = getProductUnitPrice(product, pdfUserType, wireType);

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
        addonsCost: 0,
        addonsGST: 0,
        addonsTotal: 0,
        appliedAddons: [],
        grandTotal: 0,
        userType: pdfUserType,
        productName: product.name,
        processorName: processor || undefined,
        cabinetGrid: cabinetGrid || undefined,
        displaySize: {
          width: Number(((cabinetGrid?.totalWidth ?? config.width) / 1000).toFixed(2)),
          height: Number(((cabinetGrid?.totalHeight ?? config.height) / 1000).toFixed(2))
        },
        isAvailable: false
      };
    }

    const quantity = calculateQuantity(product, cabinetGrid, config);

    const roundedQuantity = Math.round(quantity * 100) / 100;
    const productSubtotal = Math.round((unitPrice * roundedQuantity) * 100) / 100;
    const productGST = 0;
    const productTotal = productSubtotal;

    let processorPrice = 0;
    // Nexa / fixed products: quotations are product + Nexa add-ons only (controller not billed), same as UI.
    if (processor && !isJumboSeriesProduct(product) && !isDigitalStandeeProduct(product) && !isFixedProduct(product)) {
      processorPrice = getProcessorPrice(processor, pdfUserType);
    }

    const processorGST = 0;
    const processorTotal = processorPrice;

    const METERS_TO_FEET = 3.2808399;
    const effectiveWidth = cabinetGrid?.totalWidth ?? config.width;
    const effectiveHeight = cabinetGrid?.totalHeight ?? config.height;
    const widthInMeters = effectiveWidth / 1000;
    const heightInMeters = effectiveHeight / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;

    let structureBasePrice: number;
    let installationBasePrice: number;

    if (customPricing?.enabled && customPricing.structurePrice !== null) {
      structureBasePrice = customPricing.structurePrice;
    } else if (product.category === 'Module/ Grid Series' || product.category?.toLowerCase().includes('flexible')) {
      // Module/Grid & Flexible Series: structure per ft² — End User & Channel ₹700, Reseller ₹600
      const structurePerSqFt = pdfUserType === 'Reseller' ? 600 : 700;
      structureBasePrice = Math.round((screenAreaSqFt * structurePerSqFt) * 100) / 100;
    } else {
      structureBasePrice = calculateStructureCost(product.environment, cabinetGrid, screenAreaSqFt);
    }

    if (customPricing?.enabled && customPricing.installationPrice !== null) {
      installationBasePrice = customPricing.installationPrice;
    } else {
      // Installation: ₹500 per ft² for all user types (End User, SI/Channel, Reseller)
      installationBasePrice = calculateInstallationCost(screenAreaSqFt, 'per_sqft', 500);
    }

    // Digital Standee & Fixed Products: quotations are product-only (no structure / installation add-ons).
    if (isDigitalStandeeProduct(product) || isFixedProduct(product)) {
      structureBasePrice = 0;
      installationBasePrice = 0;
    }

    const structureGST = 0;
    const structureTotal = structureBasePrice;

    const installationGST = 0;
    const installationTotal = installationBasePrice;

    let addonsCost = 0;
    const appliedAddons: { name: string; price: number }[] = [];
    if (nexaAddons && nexaAddons.length > 0 && isNexaSeriesProduct(product)) {
      Object.entries(NEXA_ADDON_PRICES).forEach(([name, price]) => {
        if (nexaAddons.includes(name)) {
          addonsCost += price;
          appliedAddons.push({ name, price });
        }
      });
    }
    const addonsGST = 0;
    const addonsTotal = addonsCost;

    const grandTotal = Math.round(productTotal + processorTotal + structureTotal + installationTotal + addonsTotal);

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
      addonsCost,
      addonsGST,
      addonsTotal,
      appliedAddons,
      grandTotal,
      userType: pdfUserType,
      productName: product.name,
      processorName: processor || undefined,
      cabinetGrid: cabinetGrid || undefined,
      displaySize: {
        width: Number(((cabinetGrid?.totalWidth ?? config.width) / 1000).toFixed(2)),
        height: Number(((cabinetGrid?.totalHeight ?? config.height) / 1000).toFixed(2))
      },
      isAvailable: true
    };

    return result;

  } catch (error) {

    return {
      unitPrice: 5300,
      quantity: 1,
      productSubtotal: 5300,
      productGST: 0,
      productTotal: 5300,
      processorPrice: 0,
      processorGST: 0,
      processorTotal: 0,
      structureCost: 0,
      structureGST: 0,
      structureTotal: 0,
      installationCost: 0,
      installationGST: 0,
      installationTotal: 0,
      addonsCost: 0,
      addonsGST: 0,
      addonsTotal: 0,
      appliedAddons: [],
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
  config: { width: number; height: number; unit: string },
  wireType?: 'gold' | 'copper',
  nexaAddons?: string[]
): { isValid: boolean; calculatedPrice: number; difference: number; message: string } {
  try {
    const calculatedResult = calculateCentralizedPricing(product, cabinetGrid, processor, userType, config, undefined, wireType, nexaAddons);
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
