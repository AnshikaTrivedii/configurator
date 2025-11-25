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
    endUser: 65000, 
    reseller: 55300, 
    channel: 58500 
  },
  
  // Nova Products - Synchronous
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
  }
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

