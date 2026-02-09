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
    endUser: 65000, 
    reseller: 55300, 
    channel: 58500 
  },

  'VX1': { 
    endUser: 35000, 
    reseller: 29800, 
    channel: 31500 
  },
  'VX400': { 
    endUser: 100000, 
    reseller: 85000, 
    channel: 90000 
  },
  'VX400 Pro': { 
    endUser: 110000, 
    reseller: 93500, 
    channel: 99000 
  },
  'VX600': { 
    endUser: 120000, 
    reseller: 102000, 
    channel: 108000 
  },
  'VX600 Pro': { 
    endUser: 130000, 
    reseller: 110500, 
    channel: 117000 
  },
  'VX1000': { 
    endUser: 150000, 
    reseller: 127500, 
    channel: 135000 
  },
  'VX1000 Pro': { 
    endUser: 160000, 
    reseller: 136000, 
    channel: 144000 
  },
  '4K PRIME': { 
    endUser: 290000, 
    reseller: 246500, 
    channel: 261000 
  },
  '4K Prime': { 
    endUser: 290000, 
    reseller: 246500, 
    channel: 261000 
  }
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
    'VX600', 'VX600 Pro', 'VX1000', 'VX1000 Pro', '4K PRIME'
  ];
  
  const missing = requiredProcessors.filter(processor => !PROCESSOR_PRICES[processor]);
  
  return {
    isValid: missing.length === 0,
    missing
  };
}
