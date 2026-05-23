/**
 * CENTRALIZED PROCESSOR PRICING CONFIGURATION
 * 
 * This is the SINGLE SOURCE OF TRUTH for all processor prices.
 * All files MUST import from this configuration to ensure price consistency
 * between PDF generation, database storage, and dashboard display.
 * 
 * Prices are based on the official pricing spreadsheet (Feb 2026).
 * 
 * User type mapping:
 *   "End User"           → endUser
 *   "SI/Channel Partner"  → si
 *   "Reseller"           → reseller
 * 
 * DO NOT modify processor prices anywhere else in the codebase.
 * All changes must be made here only.
 */

export interface ProcessorPrice {
  pixelCapacity: string;
  endUser: number;
  si: number;
  reseller: number;
}

export const PROCESSOR_PRICES: Record<string, ProcessorPrice> = {
  'VX1': {
    pixelCapacity: '1.3M',
    endUser: 35000,
    si: 33200,
    reseller: 31600,
  },
  'TB40': {
    pixelCapacity: '1.3M',
    endUser: 35000,
    si: 33200,
    reseller: 31600,
  },
  'TB60': {
    pixelCapacity: '2.3M',
    endUser: 51000,
    si: 48400,
    reseller: 46000,
  },
  'VX400': {
    pixelCapacity: '2.6M',
    endUser: 90000,
    si: 85500,
    reseller: 81200,
  },
  'VX400 Pro': {
    pixelCapacity: '2.6M',
    endUser: 98000,
    si: 93100,
    reseller: 88400,
  },
  'VX600': {
    pixelCapacity: '3.9M',
    endUser: 105000,
    si: 99700,
    reseller: 94800,
  },
  'VX600 Pro': {
    pixelCapacity: '3.9M',
    endUser: 115000,
    si: 109200,
    reseller: 103800,
  },
  'VX1000': {
    pixelCapacity: '6.5M',
    endUser: 157500,
    si: 149600,
    reseller: 142100,
  },
  'VX1000 Pro': {
    pixelCapacity: '6.5M',
    endUser: 168000,
    si: 159600,
    reseller: 151600,
  },
  'VX16S': {
    pixelCapacity: '10M',
    endUser: 315000,
    si: 299200,
    reseller: 284300,
  },
  'VX2000 Pro': {
    pixelCapacity: '13M',
    endUser: 337500,
    si: 320600,
    reseller: 304600,
  },
  'TU15 Pro': {
    pixelCapacity: '2.6M',
    endUser: 51000,
    si: 48400,
    reseller: 46000,
  },
  'TU20 Pro': {
    pixelCapacity: '3.9M',
    endUser: 72000,
    si: 68400,
    reseller: 65000,
  },
  'TU4K Pro': {
    pixelCapacity: '13M',
    endUser: 290500,
    si: 276000,
    reseller: 262200,
  },
};

const normalize = (name: string): string => name.toLowerCase().replace(/\s+/g, '');

const normalizedPriceMap: Record<string, ProcessorPrice> = Object.fromEntries(
  Object.entries(PROCESSOR_PRICES).map(([key, value]) => [normalize(key), value])
);

/**
 * Get processor price based on user type.
 * Uses case-insensitive, space-agnostic lookup.
 * 
 * @param processorName - The processor model name
 * @param userType - 'End User', 'Reseller', 'Channel', 'SI', or 'SI/Channel Partner'
 * @returns The processor price for the given user type, or 0 if not found
 */
export function getProcessorPrice(processorName: string, userType: string): number {
  const processor = normalizedPriceMap[normalize(processorName)];
  if (!processor) {
    console.warn(`Processor price not found for: "${processorName}"`);
    return 0;
  }

  const normalizedType = userType.toLowerCase().trim();

  if (normalizedType === 'reseller') {
    return processor.reseller;
  } else if (
    normalizedType === 'channel' ||
    normalizedType === 'si' ||
    normalizedType === 'si/channel partner' ||
    normalizedType === 'si/channel'
  ) {
    return processor.si;
  } else {
    return processor.endUser;
  }
}

/**
 * Validate that all required processors are configured
 */
export function validateProcessorPricing(): { isValid: boolean; missing: string[] } {
  const requiredProcessors = [
    'TB40', 'TB60', 'VX1', 'VX400', 'VX400 Pro',
    'VX600', 'VX600 Pro', 'VX1000', 'VX1000 Pro', 'VX16S',
    'VX2000 Pro', 'TU15 Pro', 'TU20 Pro', 'TU4K Pro'
  ];

  const missing = requiredProcessors.filter(p => !normalizedPriceMap[normalize(p)]);

  return {
    isValid: missing.length === 0,
    missing
  };
}
