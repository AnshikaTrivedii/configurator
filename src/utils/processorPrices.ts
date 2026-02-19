/**
 * CENTRALIZED PROCESSOR PRICING CONFIGURATION
 * 
 * This is the SINGLE SOURCE OF TRUTH for all processor prices.
 * All files MUST import from this configuration to ensure price consistency
 * between PDF generation, database storage, and dashboard display.
 * 
 * Prices are based on the official pricing spreadsheet provided.
 * 
 * DO NOT modify processor prices anywhere else in the codebase.
 * All changes must be made here only.
 */

export interface ProcessorPrice {
  endUser: number;
  reseller: number;
  channel: number;
}

export const PROCESSOR_PRICES: Record<string, ProcessorPrice> = {

  'TB2': { 
    endUser: 35000, 
    reseller: 29800, 
    channel: 31500 
  },
  'TB40': { 
    endUser: 35000, 
    reseller: 29800, 
    channel: 31500 
  },
  'TB60': { 
    endUser: 51000, 
    reseller: 43350, 
    channel: 45900 
  },

  'VX1': { 
    endUser: 35000, 
    reseller: 29800, 
    channel: 31500 
  },
  'VX400': { 
    endUser: 90000, 
    reseller: 76500, 
    channel: 81000 
  },
  'VX400 Pro': { 
    endUser: 98000, 
    reseller: 83300, 
    channel: 88200 
  },
  'VX600': { 
    endUser: 105000, 
    reseller: 89250, 
    channel: 94500 
  },
  'VX600 Pro': { 
    endUser: 115000, 
    reseller: 97750, 
    channel: 103500 
  },
  'VX1000': { 
    endUser: 157500, 
    reseller: 133875, 
    channel: 141750 
  },
  'VX1000 Pro': { 
    endUser: 168000, 
    reseller: 142800, 
    channel: 151200 
  },
  'VX16S': { 
    endUser: 315000, 
    reseller: 267750, 
    channel: 283500 
  },
  'VX2000pro': { 
    endUser: 337500, 
    reseller: 286875, 
    channel: 303750 
  },
  'TU15PRO': { 
    endUser: 51000, 
    reseller: 43350, 
    channel: 45900 
  },
  'TU20PRO': { 
    endUser: 72000, 
    reseller: 61200, 
    channel: 64800 
  },
  'TU4k pro': { 
    endUser: 290500, 
    reseller: 246925, 
    channel: 261450 
  },
};

/**
 * Get processor price based on user type
 * @param processorName - The processor model name
 * @param userType - The user type ('End User', 'Reseller', 'Channel')
 * @returns The processor price for the given user type, or 0 if not found
 */
export function getProcessorPrice(processorName: string, userType: string): number {
  const processor = PROCESSOR_PRICES[processorName];
  if (!processor) {

    return 0;
  }

  let price = 0;
  if (userType === 'Reseller') {
    price = processor.reseller;
  } else if (userType === 'Channel') {
    price = processor.channel;
  } else {
    price = processor.endUser;
  }

  return price;
}

/**
 * Validate that all required processors are configured
 */
export function validateProcessorPricing(): { isValid: boolean; missing: string[] } {
  const requiredProcessors = [
    'TB2', 'TB40', 'TB60', 'VX1', 'VX400', 'VX400 Pro', 
    'VX600', 'VX600 Pro', 'VX1000', 'VX1000 Pro', 'VX16S', 
    'VX2000pro', 'TU15PRO', 'TU20PRO', 'TU4k pro'
  ];
  
  const missing = requiredProcessors.filter(processor => !PROCESSOR_PRICES[processor]);
  
  return {
    isValid: missing.length === 0,
    missing
  };
}
