// Debug script to test Bellatrix P0.9 price calculation
const METERS_TO_FEET = 3.2808399;

// Bellatrix P0.9 product data
const product = {
  id: 'bellatrix-indoor-cob-p0.9',
  name: 'Bellatrix Series Indoor COB P0.9',
  category: 'Bellatrix Series',
  price: 49300, // End User price
  siChannelPrice: 44370,
  resellerPrice: 41905,
  cabinetDimensions: { width: 600, height: 337.5 }
};

// Configuration from the image
const config = { width: 1800, height: 680, unit: 'mm' }; // 1.8m × 0.68m
const cabinetGrid = { columns: 3, rows: 2 };
const processor = 'TB60';
const userType = 'endUser'; // End User

// Calculate price using QuoteModal logic
function calculateCorrectTotalPrice(product, cabinetGrid, processor, userType, config) {
  // Convert userType to match PDF logic
  let pdfUserType = 'End User';
  if (userType === 'reseller') {
    pdfUserType = 'Reseller';
  } else if (userType === 'siChannel') {
    pdfUserType = 'Channel';
  }
  
  // Get unit price
  let unitPrice = 0;
  
  if (product.category?.toLowerCase().includes('rental') && product.prices) {
    if (pdfUserType === 'Reseller') {
      unitPrice = product.prices.cabinet.reseller;
    } else if (pdfUserType === 'Channel') {
      unitPrice = product.prices.cabinet.siChannel;
    } else {
      unitPrice = product.prices.cabinet.endCustomer;
    }
  } else {
    // Handle regular products
    if (pdfUserType === 'Reseller' && typeof product.resellerPrice === 'number') {
      unitPrice = product.resellerPrice;
    } else if (pdfUserType === 'Channel' && typeof product.siChannelPrice === 'number') {
      unitPrice = product.siChannelPrice;
    } else if (typeof product.price === 'number') {
      unitPrice = product.price;
    } else {
      unitPrice = 5300; // Default fallback
    }
  }
  
  // Calculate quantity
  let quantity = 0;
  
  if (product.category?.toLowerCase().includes('rental')) {
    quantity = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
  } else {
    // Calculate quantity in square feet
    const widthInMeters = config.width / 1000;
    const heightInMeters = config.height / 1000;
    const widthInFeet = widthInMeters * METERS_TO_FEET;
    const heightInFeet = heightInMeters * METERS_TO_FEET;
    quantity = widthInFeet * heightInFeet;
    
    quantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  }
  
  // Calculate subtotal
  const subtotal = unitPrice * quantity;
  
  // Add processor price
  let processorPrice = 0;
  if (processor) {
    const processorPrices = {
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
    
    const procPricing = processorPrices[processor];
    if (procPricing) {
      if (pdfUserType === 'Reseller') {
        processorPrice = procPricing.reseller;
      } else if (pdfUserType === 'Channel') {
        processorPrice = procPricing.channel;
      } else {
        processorPrice = procPricing.endUser;
      }
    }
  }
  
  // Calculate totals with GST (18%)
  const gstProduct = subtotal * 0.18;
  const totalProduct = subtotal + gstProduct;
  
  const gstProcessor = processorPrice * 0.18;
  const totalProcessor = processorPrice + gstProcessor;
  
  const grandTotal = totalProduct + totalProcessor;
  
  return {
    unitPrice,
    quantity,
    subtotal,
    gstProduct,
    totalProduct,
    processorPrice,
    gstProcessor,
    totalProcessor,
    grandTotal: Math.round(grandTotal)
  };
}

// Calculate the price
const result = calculateCorrectTotalPrice(product, cabinetGrid, processor, userType, config);

console.log('🔍 Bellatrix P0.9 Price Calculation Debug:');
console.log('Product:', product.name);
console.log('Config:', config.width + '×' + config.height + 'mm');
console.log('Cabinet Grid:', cabinetGrid.columns + '×' + cabinetGrid.rows);
console.log('Processor:', processor);
console.log('User Type:', userType);
console.log('');
console.log('📊 Calculation Results:');
console.log('Unit Price (per sq.ft): ₹' + result.unitPrice.toLocaleString());
console.log('Quantity (sq.ft):', result.quantity.toFixed(2));
console.log('Subtotal: ₹' + result.subtotal.toLocaleString());
console.log('Product GST (18%): ₹' + result.gstProduct.toLocaleString());
console.log('Product Total: ₹' + result.totalProduct.toLocaleString());
console.log('TB60 Processor: ₹' + result.processorPrice.toLocaleString());
console.log('Processor GST (18%): ₹' + result.gstProcessor.toLocaleString());
console.log('Processor Total: ₹' + result.totalProcessor.toLocaleString());
console.log('');
console.log('🎯 GRAND TOTAL: ₹' + result.grandTotal.toLocaleString());
console.log('');
console.log('❓ Dashboard shows: ₹73,440');
console.log('❓ Difference: ₹' + (result.grandTotal - 73440).toLocaleString());
console.log('');
console.log('🔍 This suggests the dashboard is using a completely different calculation!');
