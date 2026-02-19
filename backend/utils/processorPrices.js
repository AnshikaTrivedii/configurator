/**
 * CENTRALIZED PROCESSOR PRICING CONFIGURATION (Backend)
 * 
 * This matches the frontend processor prices exactly.
 */

export const PROCESSOR_PRICES = {
  // Nova Products - Asynchronous
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
  
  // Nova Products - Synchronous
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
 */
export const getProcessorPrice = (processorName, userType) => {
  // Extract base name (e.g., "Nova TB2" -> "TB2")
  const baseName = processorName.replace(/^Nova\s+/i, '').trim();
  const processor = PROCESSOR_PRICES[baseName] || PROCESSOR_PRICES[processorName];
  
  if (!processor) {
    console.warn(`⚠️ Processor "${processorName}" (base: "${baseName}") not found in pricing configuration`);
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
};

