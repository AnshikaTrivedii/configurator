import { Product } from '../types';

// Define NA constant for products without pricing

export const products: Product[] = [

  // Orion P1.5 Flexible Series Indoor Display
  {
    id: "orion-p15-flexible-indoor",
    name: "Orion P1.5mm Flexible Series LED display",
    category: "Flexible Series",
    enabled: false,
    image: "/products/flexible-series/Flexible Series Indoor P1.5.png", // Not provided in PDF
    resolution: {
      width: 213, // Calculated: 320mm ÷ 1.5mm pixel pitch
      height: 107  // Calculated: 160mm ÷ 1.5mm pixel pitch
    },
    price: 14167, // Flexible series pricing (₹25,700 per ft² × 0.551 ft²)
    siChannelPrice: 12842, // (₹23,300 per ft² × 0.551 ft²)
    resellerPrice: 12072, // (₹21,900 per ft² × 0.551 ft²)
    prices: {
      cabinet: { endCustomer: 14167, siChannel: 12842, reseller: 12072 },
      curveLock: { endCustomer: 0, siChannel: 0, reseller: 0 } // Not applicable for flexible series
    },
    // Structure Cost: End Customer ₹700, SI Channel ₹700, Reseller ₹600
    cabinetDimensions: {
      width: 320, // Using module size as cabinet (flexible display)
      height: 160
    },
    moduleDimensions: {
      width: 320,
      height: 160
    },
    moduleResolution: {
      width: 213, // Calculated: 320mm ÷ 1.5mm pixel pitch
      height: 107  // Calculated: 160mm ÷ 1.5mm pixel pitch
    },
    moduleQuantity: 1, // Single flexible module
    pixelPitch: 1.5,
    pixelDensity: 409600, // pixels/m²
    brightness: 1000, // cd/m²
    refreshRate: 3840, // Hz (minimum)
    environment: "Indoor",
    maxPowerConsumption: 700, // W
    avgPowerConsumption: 350, // W
    weightPerCabinet: 0, // Not specified in PDF
    pdf: "https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/flexible-series/Flexible+Series+Indoor+P1.5.pdf"
  },

  // Orion P1.8 Flexible Series Indoor Display  
  {
    id: "orion-p18-flexible-indoor",
    name: "Orion P1.8mm Flexible Series LED display",
    category: "Flexible Series",
    enabled: false,
    image: "/products/flexible-series/Flexible Series Indoor P1.8.png", // Not provided in PDF
    resolution: {
      width: 171, // Calculated: 320mm ÷ 1.875mm pixel pitch (spec shows 1.875mm)
      height: 85   // Calculated: 160mm ÷ 1.875mm pixel pitch
    },
    price: 9700, // Flexible series pricing (₹17,600 per ft² × 0.551 ft²)
    siChannelPrice: 8816, // (₹16,000 per ft² × 0.551 ft²)
    resellerPrice: 8265, // (₹15,000 per ft² × 0.551 ft²)
    prices: {
      cabinet: { endCustomer: 9700, siChannel: 8816, reseller: 8265 },
      curveLock: { endCustomer: 0, siChannel: 0, reseller: 0 } // Not applicable for flexible series
    },
    // Structure Cost: End Customer ₹700, SI Channel ₹700, Reseller ₹600
    cabinetDimensions: {
      width: 320, // Using module size as cabinet (flexible display)
      height: 160
    },
    moduleDimensions: {
      width: 320,
      height: 160
    },
    moduleResolution: {
      width: 171, // Calculated: 320mm ÷ 1.875mm pixel pitch
      height: 85   // Calculated: 160mm ÷ 1.875mm pixel pitch
    },
    moduleQuantity: 1, // Single flexible module
    pixelPitch: 1.875, // Actual spec from PDF
    pixelDensity: 284444, // pixels/m²
    brightness: 1000, // cd/m²
    refreshRate: 3840, // Hz (minimum)
    environment: "Indoor",
    maxPowerConsumption: 700, // W
    avgPowerConsumption: 350, // W
    weightPerCabinet: 0, // Not specified in PDF
    pdf: "https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/flexible-series/Flexible+Series+Indoor+P1.8.pdf"
  },

  // Orion P2.5 Flexible Series Indoor Display
  {
    id: "orion-p25-flexible-indoor",
    name: "Orion P2.5mm Flexible Series LED display",
    category: "Flexible Series",
    enabled: false,
    image: "/products/flexible-series/Flexible Series Indoor P2.5.png", // Not provided in PDF
    resolution: {
      width: 128, // Calculated: 320mm ÷ 2.5mm pixel pitch
      height: 64   // Calculated: 160mm ÷ 2.5mm pixel pitch
    },
    price: 6888, // Flexible series pricing (₹12,500 per ft² × 0.551 ft²)
    siChannelPrice: 6227, // (₹11,300 per ft² × 0.551 ft²)
    resellerPrice: 5841, // (₹10,600 per ft² × 0.551 ft²)
    prices: {
      cabinet: { endCustomer: 6888, siChannel: 6227, reseller: 5841 },
      curveLock: { endCustomer: 0, siChannel: 0, reseller: 0 } // Not applicable for flexible series
    },
    // Structure Cost: End Customer ₹700, SI Channel ₹700, Reseller ₹600
    cabinetDimensions: {
      width: 320, // Using module size as cabinet (flexible display)
      height: 160
    },
    moduleDimensions: {
      width: 320,
      height: 160
    },
    moduleResolution: {
      width: 128, // Calculated: 320mm ÷ 2.5mm pixel pitch
      height: 64   // Calculated: 160mm ÷ 2.5mm pixel pitch
    },
    moduleQuantity: 1, // Single flexible module
    pixelPitch: 2.5,
    pixelDensity: 160000, // pixels/m²
    brightness: 1200, // cd/m²
    refreshRate: 3840, // Hz (minimum)
    environment: "Indoor",
    maxPowerConsumption: 700, // W
    avgPowerConsumption: 350, // W
    weightPerCabinet: 0, // Not specified in PDF
    pdf: "https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/flexible-series/Flexible+Series+Indoor+P2.5.pdf"
  },

  // Orion P3 Flexible Series Indoor Display
  {
    id: "orion-p3-flexible-indoor",
    name: "Orion P3mm Flexible Series LED display",
    category: "Flexible Series",
    enabled: false,
    image: "/products/flexible-series/Flexible Series Indoor P3.png", // Not provided in PDF
    resolution: {
      width: 107, // Calculated: 320mm ÷ 3mm pixel pitch
      height: 53   // Calculated: 160mm ÷ 3mm pixel pitch
    },
    price: 3193, // Flexible series pricing (₹10,300 per ft² × 0.31 ft²)
    siChannelPrice: 2883, // (₹9,300 per ft² × 0.31 ft²)
    resellerPrice: 2728, // (₹8,800 per ft² × 0.31 ft²)
    prices: {
      cabinet: { endCustomer: 3193, siChannel: 2883, reseller: 2728 },
      curveLock: { endCustomer: 0, siChannel: 0, reseller: 0 } // Not applicable for flexible series
    },
    // Structure Cost: End Customer ₹700, SI Channel ₹700, Reseller ₹600
    cabinetDimensions: {
      width: 320, // Using module size as cabinet (flexible display)
      height: 160
    },
    moduleDimensions: {
      width: 320,
      height: 160
    },
    moduleResolution: {
      width: 107, // Calculated: 320mm ÷ 3mm pixel pitch
      height: 53   // Calculated: 160mm ÷ 3mm pixel pitch
    },
    moduleQuantity: 1, // Single flexible module
    pixelPitch: 3.0,
    pixelDensity: 111111, // pixels/m²
    brightness: 1200, // cd/m²
    refreshRate: 3840, // Hz (minimum)
    environment: "Indoor",
    maxPowerConsumption: 700, // W
    avgPowerConsumption: 350, // W
    weightPerCabinet: 0, // Not specified in PDF
    pdf: "https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/flexible-series/Flexible+Series+Indoor+P3.pdf"
  },

  // Orion P4 Flexible Series Indoor Display
  {
    id: "orion-p4-flexible-indoor",
    name: "Orion P4mm Flexible Series LED display",
    category: "Flexible Series",
    enabled: false,
    image: "/products/flexible-series/Flexible Series Indoor P4.png", // Not provided in PDF
    resolution: {
      width: 80, // Calculated: 320mm ÷ 4mm pixel pitch
      height: 40  // Calculated: 160mm ÷ 4mm pixel pitch
    },
    price: 32000, // Flexible series pricing
    siChannelPrice: 28800,
    resellerPrice: 27200,
    cabinetDimensions: {
      width: 320, // Using module size as cabinet (flexible display)
      height: 160
    },
    moduleDimensions: {
      width: 320,
      height: 160
    },
    moduleResolution: {
      width: 80, // Calculated: 320mm ÷ 4mm pixel pitch
      height: 40  // Calculated: 160mm ÷ 4mm pixel pitch
    },
    moduleQuantity: 1, // Single flexible module
    pixelPitch: 4.0,
    pixelDensity: 62500, // pixels/m²
    brightness: 1200, // cd/m²
    refreshRate: 3840, // Hz (minimum)
    environment: "Indoor",
    maxPowerConsumption: 700, // W
    avgPowerConsumption: 350, // W
    weightPerCabinet: 0, // Not specified in PDF
    pdf: "https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/flexible-series/Flexible+Series+Indoor+P4.pdf"
  },


  // Bellatrix Series
  {
    id: 'bellatrix-indoor-cob-p0.9',
    name: 'Bellatrix Series Indoor COB P0.9',
    category: 'Bellatrix Series',
    enabled: false,
    image: '/products/bellatrix-series/Bellatrix Series Indoor COB P0.9.jpg',
    resolution: { width: 640, height: 360 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 150, height: 168.75 },
    moduleResolution: { width: 160, height: 180 },
    moduleQuantity: 8, // 4x2
    pixelPitch: 0.9375,
    pixelDensity: 1137778,
    brightness: 600,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 420,
    avgPowerConsumption: 150,
    weightPerCabinet: 4.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/Bellatrix+Series+Indoor+COB+P0.9.pdf',
    price: 49300,
    siChannelPrice: 44370,
    resellerPrice: 41905,
  },
  {
    id: 'bellatrix-indoor-cob-p1.25',
    name: 'Bellatrix Series Indoor COB P1.25',
    category: 'Bellatrix Series',
    enabled: false,
    image: '/products/bellatrix-series/Bellatrix Series Indoor COB P1.25.jpg',
    resolution: { width: 480, height: 270 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 150, height: 168.75 },
    moduleResolution: { width: 120, height: 135 },
    moduleQuantity: 8, // 4x2
    pixelPitch: 1.25,
    pixelDensity: 640000,
    brightness: 600,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 420,
    avgPowerConsumption: 150,
    weightPerCabinet: 4.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+COB+P1.25.pdf',
    price: 27200,
    siChannelPrice: 24480,
    resellerPrice: 23120,
  },
  {
    id: 'bellatrix-indoor-cob-p1.5',
    name: 'Bellatrix Series Indoor COB P1.5',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Indoor COB P1.5.jpg',
    resolution: { width: 384, height: 216 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 150, height: 168.75 },
    moduleResolution: { width: 96, height: 108 },
    moduleQuantity: 8, // 4x2
    pixelPitch: 1.5625,
    pixelDensity: 409600,
    brightness: 600,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 420,
    avgPowerConsumption: 150,
    weightPerCabinet: 4.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+COB+P1.5.pdf',
    price: 24300,
    siChannelPrice: 21870,
    resellerPrice: 20655,
  },
  
  {
    id: 'bellatrix-indoor-smd-p1.25',
    name: 'Bellatrix Series Indoor SMD P1.25',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P1.25.jpg',
    resolution: { width: 512, height: 384 },
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 256, height: 128 },
    moduleQuantity: 6, // 2x3
    pixelPitch: 1.25,
    pixelDensity: 640000,
    brightness: 700,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P1.25.pdf',
    price: 21300,
    siChannelPrice: 19170,
    resellerPrice: 18105,
  },
  {
    id: 'bellatrix-indoor-smd-p1.5',
    name: 'Bellatrix Series Indoor SMD P1.5',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P1.5.jpg',
    resolution: { width: 384, height: 216 },
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 213, height: 107 },
    moduleQuantity: 6, // 2x3
    pixelPitch: 1.5,
    pixelDensity: 444000,
    brightness: 700,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P1.5.pdf',
    price: 16900,
    siChannelPrice: 15210,
    resellerPrice: 14365,
  },
  {
    id: 'bellatrix-indoor-smd-p1.8',
    name: 'Bellatrix Series Indoor SMD P1.8',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P1.8.jpg',
    resolution: { width: 344, height: 258 },
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 172, height: 86 },
    moduleQuantity: 6, // 2x3
    pixelPitch: 1.86,
    pixelDensity: 284444,
    brightness: 850,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P1.8.pdf',
    price: 16200,
    siChannelPrice: 14580,
    resellerPrice: 13770,
  },
  {
    id: 'bellatrix-indoor-smd-p2.5',
    name: 'Bellatrix Series Indoor SMD P2.5',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P2.5.jpg',
    resolution: { width: 256, height: 192 },
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 6, // 2x2
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 850,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 350,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P2.5.pdf',
    price: 8800,
    siChannelPrice: 7920,
    resellerPrice: 7480,
  },
  {
    id: 'bellatrix-outdoor-smd-p2.5',
    name: 'Bellatrix Series Outdoor SMD P2.5',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Outdoor SMD P2.5.png',
    resolution: { width: 384, height: 384 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 4000,
    refreshRate: 1920,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 350,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P2.5.pdf',
    price: 13200,
    siChannelPrice: 11880,
    resellerPrice: 11220,
  },
  {
    id: 'bellatrix-outdoor-smd-p3',
    name: 'Bellatrix Series Outdoor SMD P3',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Outdoor SMD P3.png',
    resolution: { width: 256, height: 256 },
    cabinetDimensions: { width: 768, height: 768 },
    moduleDimensions: { width: 192, height: 192 },
    moduleResolution: { width: 64, height: 64 },
    moduleQuantity: 16, // 4x4
    pixelPitch: 3.0,
    pixelDensity: 111000,
    brightness: 4000,
    refreshRate: 1920,
    environment: 'outdoor',
    maxPowerConsumption: 450,
    avgPowerConsumption: 250,
    weightPerCabinet: 16,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P3.pdf',
    price: 10600,
    siChannelPrice: 9540,
    resellerPrice: 9010,
  },
  {
    id: 'bellatrix-outdoor-smd-p3-lh',
    name: 'Bellatrix Series Outdoor SMD P3 LH',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Outdoor SMD P3 LH (1).png',
    resolution: { width: 192, height: 192 },
    cabinetDimensions: { width: 576, height: 576 },
    moduleDimensions: { width: 192, height: 192 },
    moduleResolution: { width: 64, height: 64 },
    moduleQuantity: 16, // 4x4
    pixelPitch: 3.0,
    pixelDensity: 111000,
    brightness: 4000,
    refreshRate: 1920,
    environment: 'outdoor',
    maxPowerConsumption: 450,
    avgPowerConsumption: 250,
    weightPerCabinet: 16,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P3+LH.pdf',
    price: 10600,
    siChannelPrice: 9540,
    resellerPrice: 9010,
  },
  {
    id: 'bellatrix-outdoor-smd-p4',
    name: 'Bellatrix Series Outdoor SMD P4',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Outdoor SMD P4.png',
    resolution: { width: 240, height: 240 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 80, height: 40 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 4.0,
    pixelDensity: 62500,
    brightness: 4500,
    refreshRate: 1920,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 400,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P4.pdf',
    price: 8100,
    siChannelPrice: 7290,
    resellerPrice: 6885,
  },
  {
    id: 'bellatrix-outdoor-smd-p6.6',
    name: 'Bellatrix Series Outdoor SMD P6.6',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Outdoor SMD P6.6.png',
    resolution: { width: 144, height: 144 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 48, height: 24 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 6.6,
    pixelDensity: 23104,
    brightness: 4500,
    refreshRate: 1920,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 400,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P6.6.pdf',
    price: 7100,
    siChannelPrice: 6390,
    resellerPrice: 6035,
  },
  {
    id: 'bellatrix-outdoor-smd-p10',
    name: 'Bellatrix Series Outdoor SMD P10',
    category: 'Bellatrix Series',
    enabled: true,
    image: '/products/bellatrix-series/Bellatrix Series Outdoor SMD P10.png',
    resolution: { width: 96, height: 96 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 32, height: 16 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 10.0,
    pixelDensity: 10000,
    brightness: 5000,
    refreshRate: 1920,
    environment: 'outdoor',
    maxPowerConsumption: 750,
    avgPowerConsumption: 350,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P10.pdf',
    price: 5900,
    siChannelPrice: 5310,
    resellerPrice: 5015,
  },

  // Digital Standee Series
  {
    id: 'orion-p18-digital-standee',
    name: 'Orion P1.8 Indoor Standee Display',
    category: 'Digital Standee Series',
    enabled: false,
    image: '/products/standee-series/Digital Standee Series SMD P1.8.png',
    resolution: { width: 344, height: 946 }, // 344 dots x 946 dots
    cabinetDimensions: { width: 665, height: 1785 }, // 665mm x 1785mm
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 160, height: 80 },
    moduleQuantity: 12,
    pixelPitch: 1.8,
    pixelDensity: 284444,
    brightness: 780, // cd/m²
    refreshRate: 3840, // Hz
    environment: 'indoor',
    maxPowerConsumption: 400, // <400W
    avgPowerConsumption: 120, // <120W
    weightPerCabinet: 45, // kg
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/standee-series/Digital+Standee+Series++SMD+P1.8.pdf',
    ledType: 'SMD',
    driverIC: 'ICN/MBI/SM',
    viewingAngle: 'H140°, V140°',
    colorDepth: '14-16 bit',
    frameChangingFrequently: '>60 frames/sec',
    voltage: '110V-220V',
    serviceAccess: 'REAR',
    ipGrade: 'IP31/43',
    operatingTemperature: '-0°C~40°C 10-90%RH',
    storageTempHumidity: '-0°C~40°C 10-90%RH',
    lifeTime: 100000,
    controller: 'Novastar TB40',
    cabinetMaterial: 'Aluminum',
    screenResolution: '344 dots x 946 dots',
    activeDisplayArea: '640mm x 1760mm',
    price: 110300,
    siChannelPrice: 100000,
    resellerPrice: 93800,
  },
  {
    id: 'orion-p25-digital-standee',
    name: 'Orion P2.5 Indoor Standee Display',
    category: 'Digital Standee Series',
    enabled: false,
    image: '/products/standee-series/Digital Standee Series SMD P2.5.png',
    resolution: { width: 256, height: 704 }, // 256 dots x 704 dots
    cabinetDimensions: { width: 665, height: 1785 }, // 665mm x 1785mm
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 12,
    pixelPitch: 2.5,
    pixelDensity: 275625,
    brightness: 780, // cd/m²
    refreshRate: 3840, // Hz
    environment: 'indoor',
    maxPowerConsumption: 400, // <400W
    avgPowerConsumption: 120, // <120W
    weightPerCabinet: 45, // kg
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/standee-series/Digital+Standee+Series++SMD+P2.5.pdf',
    ledType: 'SMD',
    driverIC: 'ICN/MBI/SM',
    viewingAngle: 'H140°, V140°',
    colorDepth: '14-16 bit',
    frameChangingFrequently: '>60 frames/sec',
    voltage: '110V-220V',
    serviceAccess: 'REAR',
    ipGrade: 'IP31/43',
    operatingTemperature: '-0°C~40°C 10-90%RH',
    storageTempHumidity: '-0°C~40°C 10-90%RH',
    lifeTime: 100000,
    controller: 'Novastar TB40',
    cabinetMaterial: 'Aluminum',
    screenResolution: '256 dots x 704 dots',
    activeDisplayArea: '640mm x 1760mm',
    price: 80900,
    siChannelPrice: 73300,
    resellerPrice: 68800,
  },
  {
    id: 'orion-p4-digital-standee',
    name: 'Orion P4 Indoor Standee Display',
    category: 'Digital Standee Series',
    enabled: false,
    image: '/products/standee-series/Digital Standee Series SMD P4.png',
    resolution: { width: 160, height: 440 }, // 160 dots x 440 dots
    cabinetDimensions: { width: 665, height: 1785 }, // 665mm x 1785mm
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 80, height: 40 },
    moduleQuantity: 12,
    pixelPitch: 4.0,
    pixelDensity: 160000,
    brightness: 4500, // cd/m²
    refreshRate: 3840, // Hz
    environment: 'outdoor',
    maxPowerConsumption: 750, // <750W
    avgPowerConsumption: 400, // <400W
    weightPerCabinet: 60, // kg
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/standee-series/Digital+Standee+Series++SMD+P4.pdf',
    ledType: 'SMD',
    driverIC: 'ICN/MBI/SM',
    viewingAngle: 'H140°, V140°',
    colorDepth: '14-16 bit',
    frameChangingFrequently: '>60 frames/sec',
    voltage: '110V-220V',
    serviceAccess: 'REAR',
    ipGrade: 'IP65/43',
    operatingTemperature: '-0°C~40°C 10-90%RH',
    storageTempHumidity: '-0°C~40°C 10-90%RH',
    lifeTime: 100000,
    controller: 'Novastar TB2',
    cabinetMaterial: 'Aluminum',
    screenResolution: '160 dots x 440 dots',
    activeDisplayArea: '640mm x 1760mm',
    price: 95600,
    siChannelPrice: 86700,
    resellerPrice: 81300,
  },

  // Rigel Series
  // Rigel Series Outdoor P2.5
  {
    id: 'rigel-p2.5-outdoor',
    name: 'Rigel Series Outdoor SMD P2.5',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Outdoor P2.5.png',
    resolution: { width: 384, height: 384 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 18, // 3x6 modules
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 4500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P2.5.pdf',
    price: 15400,
    siChannelPrice: 13860,
    resellerPrice: 13090,
  },
  // Rigel Series Outdoor P3
  {
    id: 'rigel-p3-outdoor',
    name: 'Rigel Series Outdoor P3',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Outdoor P3.png',
    resolution: { width: 256, height: 256 },
    cabinetDimensions: { width: 768, height: 768 },
    moduleDimensions: { width: 192, height: 192 },
    moduleResolution: { width: 64, height: 64 },
    moduleQuantity: 16, // 4x4 modules
    pixelPitch: 3.0,
    pixelDensity: 111000,
    brightness: 5000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 450,
    avgPowerConsumption: 200,
    weightPerCabinet: 16,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P3.pdf',
    price: 13200,
    siChannelPrice: 11880,
    resellerPrice: 11220,
  },
  // Rigel Series Outdoor P4
  {
    id: 'rigel-p4-outdoor',
    name: 'Rigel Series Outdoor P4',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Outdoor P4.png',
    resolution: { width: 240, height: 240 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 80, height: 40 },
    moduleQuantity: 18, // 3x6 modules
    pixelPitch: 4.0,
    pixelDensity: 62500,
    brightness: 5500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P4.pdf',
    price: 10300,
    siChannelPrice: 9270,
    resellerPrice: 8755,
  },
  // Rigel Series Outdoor P6.6
  {
    id: 'rigel-p6.6-outdoor',
    name: 'Rigel Series Outdoor P6.6',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Outdoor P6.6.png',
    resolution: { width: 144, height: 144 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 48, height: 24 },
    moduleQuantity: 18, // 3x6 modules
    pixelPitch: 6.6,
    pixelDensity: 23104,
    brightness: 5500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P6.6.pdf',
    price: 8300,
    siChannelPrice: 7470,
    resellerPrice: 7055,
  },
  // Rigel Series Outdoor P10
  {
    id: 'rigel-p10-outdoor',
    name: 'Rigel Series Outdoor P10',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Outdoor P10.png',
    resolution: { width: 96, height: 96 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 32, height: 16 },
    moduleQuantity: 18, // 3x6 modules
    pixelPitch: 10.0,
    pixelDensity: 10000,
    brightness: 6000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P10.pdf',
    price: 6600,
    siChannelPrice: 5940,
    resellerPrice: 5610,
  },
  // Rigel Series P0.9 (COB)
  {
    id: 'rigel-cob-p0.9',
    name: 'Rigel Series Indoor COB P0.9',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Indoor P0.9.jpg',
    resolution: { width: 640, height: 360 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 150, height: 168.75 },
    moduleResolution: { width: 160, height: 180 },
    moduleQuantity: 8, // 4x2 modules
    pixelPitch: 0.9375,
    pixelDensity: 1137778,
    brightness: 600,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 420,
    avgPowerConsumption: 150,
    weightPerCabinet: 4.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+COB+P0.9.pdf',
    price: 60000,
    siChannelPrice: 54000,
    resellerPrice: 51000,
  },
  // Rigel Series SMD P0.9 (not present, skip)
  // Rigel Series P1.25 (COB)
  {
    id: 'rigel-cob-p1.25',
    name: 'Rigel Series Indoor COB P1.25',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Indoor P1.25.jpg',
    resolution: { width: 480, height: 270 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 150, height: 168.75 },
    moduleResolution: { width: 120, height: 135 },
    moduleQuantity: 8, // 4x2 modules
    pixelPitch: 1.25,
    pixelDensity: 640000,
    brightness: 600,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 420,
    avgPowerConsumption: 150,
    weightPerCabinet: 4.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+COB+P1.25.pdf',
    price: 28700,
    siChannelPrice: 25830,
    resellerPrice: 24395,
  },
  // Rigel Series SMD P1.25
  {
    id: 'rigel-smd-p1.25',
    name: 'Rigel Series Indoor SMD P1.25',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Indoor SMD P1.25.jpg',
    resolution: { width: 512, height: 384 }, // Calculated from module dimensions and pixel pitch
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 256, height: 128 }, // Calculated from module dimensions and pixel pitch
    moduleQuantity: 4, // 2x2 modules
    pixelPitch: 1.25,
    pixelDensity: 640000,
    brightness: 700,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P1.25.pdf',
    price: 23200,
    siChannelPrice: 20880,
    resellerPrice: 19720,
  },
  // Rigel Series P1.5 (COB)
  {
    id: 'rigel-cob-p1.5',
    name: 'Rigel Series Indoor COB P1.5',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Indoor P1.5.jpg',
    resolution: { width: 384, height: 216 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 150, height: 168.75 },
    moduleResolution: { width: 96, height: 108 },
    moduleQuantity: 8, // 4x2 modules
    pixelPitch: 1.5625,
    pixelDensity: 409600,
    brightness: 600,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 420,
    avgPowerConsumption: 150,
    weightPerCabinet: 4.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+COB+P1.5.pdf',
    price: 27200,
    siChannelPrice: 24480,
    resellerPrice: 23120,
  },
  // Rigel Series SMD P1.5
  {
    id: 'rigel-smd-p1.5',
    name: 'Rigel Series Indoor SMD P1.5',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Indoor SMD P1.5.jpg',
    resolution: { width: 384, height: 216 }, // Updated to standard resolution
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 213, height: 107 }, // Calculated from module dimensions and pixel pitch
    moduleQuantity: 4, // 2x2 modules
    pixelPitch: 1.5,
    pixelDensity: 444000,
    brightness: 700,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P1.5.pdf',
    price: 19900,
    siChannelPrice: 17910,
    resellerPrice: 16915,
  },
  // Rigel Series SMD P1.8
  {
    id: 'rigel-smd-p1.8',
    name: 'Rigel Series Indoor SMD P1.8',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Indoor P1.8.jpg',
    resolution: { width: 344, height: 258 }, // Calculated from module dimensions and pixel pitch
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 172, height: 86 }, // Calculated from module dimensions and pixel pitch
    moduleQuantity: 4, // 2x2 modules
    pixelPitch: 1.86,
    pixelDensity: 284444,
    brightness: 850,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P1.8.pdf',
    price: 18800,
    siChannelPrice: 16920,
    resellerPrice: 15980,
  },
  // Rigel Series SMD P2.5
  {
    id: 'rigel-smd-p2.5',
    name: 'Rigel Series Indoor SMD P2.5',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Indoor SMD P2.5.jpg',
    resolution: { width: 256, height: 192 }, // Calculated from module dimensions and pixel pitch
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 }, // Calculated from module dimensions and pixel pitch
    moduleQuantity: 4, // 2x2 modules
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 850,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P2.5.pdf',
    price: 11000,
    siChannelPrice: 9900,
    resellerPrice: 9350,
  },
  // Rigel Series Outdoor P2.5
  {
    id: 'rigel-p2.5-outdoor',
    name: 'Rigel Series Outdoor SMD P2.5',
    category: 'Rigel Series',
    enabled: true,
    image: '/products/rigel-series/Outdoor P2.5.png',
    resolution: { width: 384, height: 384 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 18, // 3x6 modules
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 4500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P2.5.pdf',
    price: 15400,
    siChannelPrice: 13860,
    resellerPrice: 13090,
  },
  
  // Betel Series Indoor SMD P1.25 (DISABLED)
  {
    id: 'betel-indoor-smd-p1.25',
    name: 'Betelgeuse Series Indoor SMD P1.25',
    category: 'Betelgeuse Series',
    enabled: false,
    image: '/products/Betel-series/Betelgeuse Series Indoor SMD P1.25.jpg',
    resolution: { width: 480, height: 270 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 300, height: 168.75 },
    moduleResolution: { width: 240, height: 135 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 1.25,
    pixelDensity: 640000,
    brightness: 800,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Indoor+SMD+P1.25.pdf',
    price: 27200,
    siChannelPrice: 24480,
    resellerPrice: 23120,
    viewingAngle: '160/160',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Front',
    ipGrade: '31/31',
    operatingTemperature: '0℃~+50℃',
    operatingHumidity: '0-50%',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
  },
  // Betel Series Indoor SMD P1.5 (DISABLED)
  {
    id: 'betel-indoor-smd-p1.5',
    name: 'Betelgeuse Series Indoor SMD P1.5',
    category: 'Betelgeuse Series',
    enabled: false,
    image: '/products/Betel-series/Betelgeuse Series Indoor SMD P1.5.jpg',
    resolution: { width: 384, height: 216 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 300, height: 168.75 },
    moduleResolution: { width: 192, height: 108 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 1.5,
    pixelDensity: 444000,
    brightness: 800,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Indoor+SMD+P1.5.pdf',
    price: 25500,
    siChannelPrice: 22950,
    resellerPrice: 21675,
    viewingAngle: '160/160',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Front',
    ipGrade: '31/31',
    operatingTemperature: '0℃~+50℃',
    operatingHumidity: '0-50%',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
  },
  // Betel Series Indoor SMD P1.8
  {
    id: 'betel-indoor-smd-p1.8',
    name: 'Betelgeuse Series Indoor SMD P1.8',
    category: 'Betelgeuse Series',
    enabled: true,
    image: '/products/Betel-series/Betelgeuse Series Indoor SMD P1.8.jpg',
    resolution: { width: 344, height: 258 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 300, height: 168.75 },
    moduleResolution: { width: 172, height: 86 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 1.86,
    pixelDensity: 284444,
    brightness: 850,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Indoor+SMD+P1.8.pdf',
    viewingAngle: '160/160',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Front',
    ipGrade: '31/31',
    operatingTemperature: '0℃~+50℃',
    operatingHumidity: '0-50%',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
    price: 20900,
    siChannelPrice: 18810,
    resellerPrice: 17765,
  },
  // Betel Series Indoor SMD P2.5
  {
    id: 'betel-indoor-smd-p2.5',
    name: 'Betelgeuse Series Indoor SMD P2.5',
    category: 'Betelgeuse Series',
    enabled: true,
     image: '/products/Betel-series/Betelgeuse Series Indoor SMD P2.5.jpg',
    resolution: { width: 256, height: 192 },
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 1000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Indoor+SMD+P2.5.pdf',
    viewingAngle: '160/160',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Front',
    ipGrade: '31/31',
    operatingTemperature: '0℃~+50℃',
    operatingHumidity: '0-50%',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
    price: 18400,
    siChannelPrice: 16560,
    resellerPrice: 15640,
  },
  // Betel Series Outdoor SMD P2.5
  {
    id: 'betel-outdoor-smd-p2.5',
    name: 'Betelgeuse Series Outdoor SMD P2.5',
    category: 'Betelgeuse Series',
    enabled: true,
      image: '/products/Betel-series/Betelgeuse Series Outdoor SMD P2.5.jpg',
    resolution: { width: 256, height: 192 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 6, // 3x2
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 5000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Outdoor+SMD+P2.5.pdf',
    viewingAngle: '160/160',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Rear',
    ipGrade: '65/54',
    operatingTemperature: '-10℃~+65℃',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
    price: 27900,
    siChannelPrice: 25110,
    resellerPrice: 23715,
  },
  // Betel Series Outdoor SMD P3
  {
    id: 'betel-outdoor-smd-p3',
    name: 'Betelgeuse Series Outdoor SMD P3',
    category: 'Betelgeuse Series',
    enabled: true,
    image: '/products/Betel-series/Betelgeuse Series Outdoor SMD P3.jpg',
    resolution: { width: 192, height: 192 },
    cabinetDimensions: { width: 768, height: 768 },
    moduleDimensions: { width: 192, height: 192 },
    moduleResolution: { width: 64, height: 64 },
    moduleQuantity: 16, // 4x4
    pixelPitch: 3.0,
    pixelDensity: 111000,
    brightness: 5500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 450,
    avgPowerConsumption: 200,
    weightPerCabinet: 16,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Outdoor+SMD+P3.pdf',
    viewingAngle: '160/160',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Rear',
    ipGrade: '65/54',
    operatingTemperature: '-10℃~+65℃',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
    price: 18400,
    siChannelPrice: 16560,
    resellerPrice: 15640,
  },
  // Betel Series Outdoor SMD P4
  {
    id: 'betel-outdoor-smd-p4',
    name: 'Betelgeuse Series Outdoor SMD P4',
    category: 'Betelgeuse Series',
    enabled: true,
    image: '/products/Betel-series/Betelgeuse Series Outdoor SMD P4.jpg',
    resolution: { width: 240, height: 240 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 80, height: 40 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 4.0,
    pixelDensity: 62500,
    brightness: 6000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Outdoor+SMD+P4.pdf',
    viewingAngle: '160/160',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Rear',
    ipGrade: '65/54',
    operatingTemperature: '-10℃~+65℃',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
    price: 15400,
    siChannelPrice: 13860,
    resellerPrice: 13090,
  },
  // Betel Series Outdoor SMD P6.6
  {
    id: 'betel-outdoor-smd-p6.6',
    name: 'Betelgeuse Series Outdoor SMD P6.6',
    category: 'Betelgeuse Series',
    enabled: true,
    image: '/products/Betel-series/Betelgeuse Series Outdoor SMD P6.6.jpg',
    resolution: { width: 144, height: 144 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 48, height: 24 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 6.6,
    pixelDensity: 23104,
    brightness: 6000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Outdoor+SMD+P6.6.pdf',
    viewingAngle: 'Customised',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Rear',
    ipGrade: '65/54',
    operatingTemperature: '-10℃~+65℃',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
    price: 9400,
    siChannelPrice: 8460,
    resellerPrice: 7990,
  },
  // Betel Series Outdoor SMD P10
  {
    id: 'betel-outdoor-smd-p10',
    name: 'Betelgeuse Series Outdoor SMD P10',
    category: 'Betelgeuse Series',
    enabled: true,
    image: '/products/Betel-series/Betelgeuse Series Outdoor SMD P10.jpg',
    resolution: { width: 96, height: 96 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 32, height: 16 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 10.0,
    pixelDensity: 10000,
    brightness: 6500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 600,
    avgPowerConsumption: 225,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Outdoor+SMD+P10.pdf',
    viewingAngle: 'Customised',
    colorDepth: '16 Bit',
    voltage: '220v',
    serviceAccess: 'Rear',
    ipGrade: '65/54',
    operatingTemperature: '-10℃~+65℃',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    mtbf: 10000,
    ledChip: 'Nation star Gold Bond',
    pcb: '4 Layer',
    driverIC: 'MBI/ICN',
    powerSupply: 'Meanwell',
    controller: 'Nova',
    cabinetMaterial: 'Die Cast',
    price: 8100,
    siChannelPrice: 7290,
    resellerPrice: 6885,
  },
  // Rental Series Indoor P2.6
  {
    id: 'rental-indoor-p2.6',
    name: 'Rental Series Indoor P2.6',
    category: 'Rental Series',
    enabled: false,
    image: '/products/rental-series/Rental SMD P2.6 Indoor.png',
    resolution: { width: 192, height: 192 },
    cabinetDimensions: { width: 500, height: 500 },
    moduleDimensions: { width: 250, height: 250 },
    moduleResolution: { width: 96, height: 96 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 2.6,
    pixelDensity: 147456,
    brightness: 900,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 800,
    avgPowerConsumption: 280,
    weightPerCabinet: 8.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/Rental-series/Rental+Series+Indoor+SMD+P2.6.pdf',
    viewingAngle: 'H 140° ， V 140°',
    ledType: 'Black SMD 2121 / Black SMD 2020',
    contrastRatio: '10000:1',
    colorTemperature: '3200-9300 Optional',
    frameChangingFrequently: '50/60',
    driveMethod: '1/32 1/16',
    serviceAccess: 'FRONT',
    ipGrade: 'IP31/43',
    operatingTemperature: '0℃～50℃, 10～90%RH',
    storageTempHumidity: '0℃～60℃, 10～90%RH',
    controller: 'Novastar',
    cabinetMaterial: 'Die-casting Aluminum',
    certificates: 'CE/BIS/ISO/ROHS/MII',
    prices: {
      cabinet: { endCustomer: 28200, siChannel: 26400, reseller: 25600 },
      curveLock: { endCustomer: 1700, siChannel: 1600, reseller: 1500 }
    }
  },
  // Rental Series Indoor P2.97
  {
    id: 'rental-indoor-p2.97',
    name: 'Rental Series Indoor P2.97',
    category: 'Rental Series',
    enabled: false,
    image: '/products/rental-series/Rental SMD P2.97 Indoor.png',
    resolution: { width: 168, height: 168 },
    cabinetDimensions: { width: 500, height: 500 },
    moduleDimensions: { width: 250, height: 250 },
    moduleResolution: { width: 84, height: 84 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 2.97,
    pixelDensity: 112896,
    brightness: 900,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 800,
    avgPowerConsumption: 280,
    weightPerCabinet: 8.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/Rental-series/Rental+Series+Indoor+SMD+P2.97.pdf',
    viewingAngle: 'H 140° ， V 140°',
    ledType: 'Black SMD 2121 / Black SMD 2020',
    contrastRatio: '10000:1',
    colorTemperature: '3200-9300 Optional',
    frameChangingFrequently: '50/60',
    driveMethod: '1/21',
    serviceAccess: 'FRONT',
    ipGrade: 'IP31/43',
    operatingTemperature: '0 ℃～ 50 ℃ , 10 ～ 90%RH',
    storageTempHumidity: '0℃～60℃, 10～90%RH',
    controller: 'Novastar',
    cabinetMaterial: 'Die-casting Aluminum',
    certificates: 'CE/BIS/ISO/ROHS/MII',
    prices: {
      cabinet: { endCustomer: 25000, siChannel: 23400, reseller: 22700 },
      curveLock: { endCustomer: 1700, siChannel: 1600, reseller: 1500 }
    }
  },
  // Rental Series Outdoor P3.8
  {
    id: 'rental-outdoor-p3.8',
    name: 'Rental Series Outdoor P3.8',
    category: 'Rental Series',
    enabled: false,
    image: '/products/rental-series/Rental SMD P3.8 Outdoor.png',
    resolution: { width: 150, height: 150 },
    cabinetDimensions: { width: 576, height: 576 },
    moduleDimensions: { width: 288, height: 288 },
    moduleResolution: { width: 75, height: 75 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 3.84,
    pixelDensity: 67600,
    brightness: 3500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 500,
    avgPowerConsumption: 160,
    weightPerCabinet: 8.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/Rental-series/Rental+Series+Outdoor+SMD+P3.8.pdf',
    viewingAngle: 'H 140° ， V 140°',
    ledType: 'Atenti SMD LED',
    contrastRatio: '10000:1',
    colorTemperature: '3200-9300 Optional',
    frameChangingFrequently: '50/60',
    driveMethod: '1/25',
    serviceAccess: 'FRONT/REAR',
    ipGrade: 'IP65/54',
    operatingTemperature: '-20℃～ 50 ℃ , 10 ～ 90%RH',
    storageTempHumidity: '-20℃～ 60 ℃ , 10 ～ 90%RH',
    controller: 'Novastar',
    cabinetMaterial: 'Die-casting Aluminum',
    certificates: 'CE/BIS/ISO/ROHS/MII',
    prices: {
      cabinet: { endCustomer: 30100, siChannel: 27500, reseller: 25900 },
      curveLock: { endCustomer: 2100, siChannel: 1900, reseller: 1800 }
    }
  },
  // Rental Series Outdoor P4.8
  {
    id: 'rental-outdoor-p4.8',
    name: 'Rental Series Outdoor P4.8',
    category: 'Rental Series',
    enabled: false,
    image: '/products/rental-series/Rental SMD P4.8 Outdoor.png',
    resolution: { width: 120, height: 120 },
    cabinetDimensions: { width: 576, height: 576 },
    moduleDimensions: { width: 288, height: 288 },
    moduleResolution: { width: 60, height: 60 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 4.81,
    pixelDensity: 43403,
    brightness: 3500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 500,
    avgPowerConsumption: 160,
    weightPerCabinet: 8.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/Rental-series/Rental+Series+Outdoor+SMD+P4.8.pdf',
    viewingAngle: 'H 140° ， V 140°',
    ledType: 'Atenti SMD LED',
    contrastRatio: '10000:1',
    colorTemperature: '3200-9300 Optional',
    frameChangingFrequently: '50/60',
    driveMethod: '1/15',
    serviceAccess: 'FRONT/REAR',
    ipGrade: 'IP65/54',
    operatingTemperature: '-20 ℃～ 50 ℃ , 10 ～ 90%RH',
    storageTempHumidity: '-20 ℃～ 60 ℃ , 10 ～ 90%RH',
    controller: 'Novastar',
    cabinetMaterial: 'Die-casting Aluminum',
    certificates: 'CE/BIS/ISO/ROHS/MII',
    prices: {
      cabinet: { endCustomer: 27100, siChannel: 24800, reseller: 23300 },
      curveLock: { endCustomer: 2100, siChannel: 1900, reseller: 1800 }
    }
  },
  // Jumbo Series Outdoor P6
  {
    id: 'jumbo-outdoor-p6',
    name: 'Jumbo Series Outdoor P6',
    category: 'Jumbo Series',
    enabled: false,
    image: '/products/jumbo-series/Screenshot 2025-06-24 at 1.51.07 PM.png',
    resolution: { width: 352, height: 256 }, // 11 columns x 8 rows x 32 pixels per module
    cabinetDimensions: { width: 2109, height: 1536 }, // Fixed display size: 6.92ft x 5.04ft
    moduleDimensions: { width: 192, height: 192 }, // Fixed module size: 192x192mm
    moduleResolution: { width: 32, height: 32 },
    moduleQuantity: 88, // 11 columns x 8 rows
    moduleGrid: { columns: 11, rows: 8 },
    pixelPitch: 6,
    pixelDensity: 27776,
    brightness: 5500,
    refreshRate: 1920,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 350,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/jumbo-series/Jumbo+Series+Outdoor+SMD+P6.pdf',
    ledType: 'SMD',
    ledConfiguration: '1R+1G+1B',
    minViewDistance: '6m',
    viewingAngle: 'H:140°, V:140° @ 50% brightness',
    brightnessAdjustment: 'Manual, 256 level; Auto, 8 levels',
    colorDepth: '16 bit/color',
    availableColorPalette: '281 trillion colors',
    operatingTemperature: '-10°C ~+65°C',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    voltage: 'AC110V/220V/380V ±10%',
    inputPowerFrequency: '>50/60Hz',
    defectRate: '≤0.0001',
    dataTransferMethod: 'RJ45',
    controlMethod: 'Synchronized with computer monitor',
    driveMethod: 'Constant current driving, 1/5',
    mtbf: 10000,
    controlDistance: 'CAT5: 120 m (no repeating); Optical fiber transmission: 500m - 10km',
    serviceAccess: 'Rear Access',
    ipGrade: 'IP65',
    certificates: 'CE, ROHS, ISO, BIS',
    price: 6600,
    siChannelPrice: 6000,
    resellerPrice: 5600,
  },
  // Jumbo Series Outdoor P4
  {
    id: 'jumbo-outdoor-p4',
    name: 'Jumbo Series Outdoor P4',
    category: 'Jumbo Series',
    enabled: false,
    image: '/products/jumbo-series/Screenshot 2025-06-24 at 1.51.07 PM copy.png',
    resolution: { width: 560, height: 360 }, // 7 columns x 9 rows x 80x40 pixels per module
    cabinetDimensions: { width: 2237, height: 1439 }, // Fixed display size: 7.34ft x 4.72ft
    moduleDimensions: { width: 320, height: 160 }, // Fixed module size: 320x160mm
    moduleResolution: { width: 80, height: 40 },
    moduleQuantity: 63, // 7 columns x 9 rows
    moduleGrid: { columns: 7, rows: 9 },
    pixelPitch: 4,
    pixelDensity: 62500,
    brightness: 5000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 350,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/jumbo-series/Jumbo+Series+Outdoor+SMD+P4.pdf',
    ledType: 'SMD',
    ledConfiguration: '1R+1PG+1PB',
    minViewDistance: '4m',
    viewingAngle: 'H:160°, V:160° @ 50% brightness',
    brightnessAdjustment: 'Manual, 256 level; Auto, 8 levels',
    colorDepth: '16 bit/color',
    availableColorPalette: '281 trillion colors',
    operatingTemperature: '-10°C ~+65°C',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    voltage: 'AC110V/220V/380V ±10%',
    inputPowerFrequency: '>50/60Hz',
    defectRate: '≤0.0001',
    dataTransferMethod: 'RJ45',
    controlMethod: 'Synchronized with computer monitor',
    driveMethod: 'Constant current driving, 1/5',
    mtbf: 10000,
    controlDistance: 'CAT5: 120 m (no repeating); Optical fiber transmission: 500m - 10km',
    serviceAccess: 'Rear Access',
    ipGrade: 'IP65',
    certificates: 'CE, ROHS, ISO, BIS',
    price: 7900,
    siChannelPrice: 7200,
    resellerPrice: 6800,
  },
  // Jumbo Series Outdoor P3
  {
    id: 'jumbo-outdoor-p3',
    name: 'Jumbo Series Outdoor P3',
    category: 'Jumbo Series',
    enabled: false,
    image: '/products/jumbo-series/Screenshot 2025-06-24 at 1.51.07 PM copy 2.png',
    resolution: { width: 704, height: 512 }, // 11 columns x 8 rows x 64 pixels per module
    cabinetDimensions: { width: 2109, height: 1536 }, // Fixed display size: 6.92ft x 5.04ft
    moduleDimensions: { width: 192, height: 192 }, // Fixed module size: 192x192mm
    moduleResolution: { width: 64, height: 64 },
    moduleQuantity: 88, // 11 columns x 8 rows
    moduleGrid: { columns: 11, rows: 8 },
    pixelPitch: 3,
    pixelDensity: 111000,
    brightness: 5000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 350,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/jumbo-series/Jumbo+Series+Outdoor+SMD+P3.pdf',
    ledType: 'SMD',
    ledConfiguration: '1R+1PG+1PB',
    minViewDistance: '3m',
    viewingAngle: 'H:160°, V:160° @ 50% brightness',
    brightnessAdjustment: 'Manual, 256 level; Auto, 8 levels',
    colorDepth: '16 bit/color',
    availableColorPalette: '281 trillion colors',
    operatingTemperature: '-10°C ~+65°C',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    voltage: 'AC110V/220V/380V ±10%',
    inputPowerFrequency: '>50/60Hz',
    defectRate: '≤0.0001',
    dataTransferMethod: 'RJ45',
    controlMethod: 'Synchronized with computer monitor',
    driveMethod: 'Constant current driving, 1/5',
    mtbf: 10000,
    controlDistance: 'CAT5: 120 m (no repeating); Optical fiber transmission: 500m - 10km',
    serviceAccess: 'Rear Access',
    ipGrade: 'IP65',
    certificates: 'CE, ROHS, ISO, BIS',
    price: 9400,
    siChannelPrice: 8500,
    resellerPrice: 8000,
  },
  // Jumbo Series Outdoor P2.5
  {
    id: 'jumbo-indoor-p2.5',
    name: 'Jumbo Series Indoor P2.5',
    category: 'Jumbo Series',
    enabled: false,
    image: '/products/jumbo-series/Screenshot 2025-06-24 at 1.51.07 PM copy 3.png',
    resolution: { width: 896, height: 576 }, // 7 columns x 9 rows x 128x64 pixels per module
    cabinetDimensions: { width: 2237, height: 1439 }, // Fixed display size: 7.34ft x 4.72ft
    moduleDimensions: { width: 320, height: 160 }, // Fixed module size: 320x160mm
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 63, // 7 columns x 9 rows
    moduleGrid: { columns: 7, rows: 9 },
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 4500,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/jumbo-series/Jumbo+Series+Outdoor+SMD+P2.5.pdf',
    ledType: 'SMD',
    ledConfiguration: '1R+1PG+1PB',
    minViewDistance: '2.5m',
    viewingAngle: 'H:160°, V:160° @ 50% brightness',
    brightnessAdjustment: 'Manual, 256 level; Auto, 8 levels',
    colorDepth: '16 bit/color',
    availableColorPalette: '281 trillion colors',
    operatingTemperature: '-10°C ~+65°C',
    operatingHumidity: '10%~95%RH',
    lifeTime: 100000,
    voltage: 'AC110V/220V/380V ±10%',
    inputPowerFrequency: '>50/60Hz',
    defectRate: '≤0.0001',
    dataTransferMethod: 'RJ45',
    controlMethod: 'Synchronized with computer monitor',
    driveMethod: 'Constant current driving, 1/5',
    mtbf: 10000,
    controlDistance: 'CAT5: 120 m (no repeating); Optical fiber transmission: 500m - 10km',
    serviceAccess: 'Rear Access',
    ipGrade: 'IP65',
    certificates: 'CE, ROHS, ISO, BIS',
    price: 12500,
    siChannelPrice: 11300,
    resellerPrice: 10600,
  },

  // Transparent Series
  // Group 1: Transparent adhesive in front of glass
  {
    id: 'transparent-front-glass-p3.91',
    name: 'Transparent Adhesive in Front of Glass P3.91',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P3.91 Adhesive Front Glass.png',
    resolution: {
      width: 64,
      height: 300
    },
    price: 44300,
    siChannelPrice: 40100,
    resellerPrice: 37600,
    cabinetDimensions: {
      width: 250,
      height: 1200
    },
    moduleDimensions: {
      width: 250,
      height: 1200
    },
    moduleResolution: {
      width: 64,
      height: 300
    },
    moduleQuantity: 1,
    pixelPitch: 3.91,
    pixelDensity: 65536,
    brightness: 5000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 400,
    avgPowerConsumption: 150,
    weightPerCabinet: 8,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Front+Glass+P3.91.pdf',
    transparency: 90,
    scanMode: 'Static',
    pixelComposition: 'SMD2121'
  },
  {
    id: 'transparent-front-glass-p6.25',
    name: 'Transparent Adhesive in Front of Glass P6.25',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P6.25 Adhesive Front Glass.png',
    resolution: {
      width: 40,
      height: 188
    },
    price: 24300,
    siChannelPrice: 22000,
    resellerPrice: 20600,
    cabinetDimensions: {
      width: 250,
      height: 1200
    },
    moduleDimensions: {
      width: 250,
      height: 1200
    },
    moduleResolution: {
      width: 40,
      height: 188
    },
    moduleQuantity: 1,
    pixelPitch: 6.25,
    pixelDensity: 25600,
    brightness: 5000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 350,
    avgPowerConsumption: 120,
    weightPerCabinet: 8,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Front+Glass+P6.25.pdf',
    transparency: 95,
    scanMode: 'Static',
    pixelComposition: 'SMD2121'
  },

  // Group 2: Transparent adhesive behind glass
  {
    id: 'transparent-behind-glass-p6.5',
    name: 'Transparent Adhesive Behind Glass P6.5',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P6.5 Adhesive Behind Glass.png',
    resolution: {
      width: 32,
      height: 148
    },
    price: 22900,
    siChannelPrice: 20800,
    resellerPrice: 19500,
    cabinetDimensions: {
      width: 208,
      height: 1000
    },
    moduleDimensions: {
      width: 208,
      height: 1000
    },
    moduleResolution: {
      width: 32,
      height: 148
    },
    moduleQuantity: 1,
    pixelPitch: 6.5,
    pixelDensity: 23716,
    brightness: 5500,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 400,
    avgPowerConsumption: 150,
    weightPerCabinet: 6,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Behind+Glass+P6.5.pdf',
    transparency: 55,
    scanMode: 'Static',
    pixelComposition: 'SMD2020'
  },

  // Group 3: Transparent adhesive rollable film behind glass
  {
    id: 'transparent-rollable-film-p5',
    name: 'Transparent Rollable Film Behind Glass P5',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P5 Rollable Film Behind Glass.png',
    resolution: {
      width: 64,
      height: 200
    },
    price: 40400,
    siChannelPrice: 36700,
    resellerPrice: 34400,
    cabinetDimensions: {
      width: 320,
      height: 1000
    },
    moduleDimensions: {
      width: 320,
      height: 1000
    },
    moduleResolution: {
      width: 64,
      height: 200
    },
    moduleQuantity: 1,
    pixelPitch: 5.0,
    pixelDensity: 40000,
    brightness: 2000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 300,
    avgPowerConsumption: 100,
    weightPerCabinet: 2,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Rollable+P5.pdf',
    transparency: 85,
    scanMode: 'Static',
    pixelComposition: 'SMD1313'
  },
  {
    id: 'transparent-rollable-film-p6.25',
    name: 'Transparent Rollable Film Behind Glass P6.25',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P6.25 Rollable Film Behind Glass.png',
    resolution: {
      width: 64,
      height: 160
    },
    price: 30900,
    siChannelPrice: 28000,
    resellerPrice: 26300,
    cabinetDimensions: {
      width: 400,
      height: 1000
    },
    moduleDimensions: {
      width: 400,
      height: 1000
    },
    moduleResolution: {
      width: 64,
      height: 160
    },
    moduleQuantity: 1,
    pixelPitch: 6.25,
    pixelDensity: 25600,
    brightness: 2000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 280,
    avgPowerConsumption: 90,
    weightPerCabinet: 2,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Rollable+P6.25.pdf',
    transparency: 90,
    scanMode: 'Static',
    pixelComposition: 'SMD1313'
  },
  {
    id: 'transparent-rollable-film-p8',
    name: 'Transparent Rollable Film Behind Glass P8',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P8 Rollable Film Behind Glass.png',
    resolution: {
      width: 50,
      height: 125
    },
    price: 24300,
    siChannelPrice: 22000,
    resellerPrice: 20600,
    cabinetDimensions: {
      width: 400,
      height: 1000
    },
    moduleDimensions: {
      width: 400,
      height: 1000
    },
    moduleResolution: {
      width: 50,
      height: 125
    },
    moduleQuantity: 1,
    pixelPitch: 8.0,
    pixelDensity: 16500,
    brightness: 2000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 250,
    avgPowerConsumption: 80,
    weightPerCabinet: 2,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Rollable+P8.pdf',
    transparency: 92,
    scanMode: 'Static',
    pixelComposition: 'SMD1313'
  },
  {
    id: 'transparent-rollable-film-p10',
    name: 'Transparent Rollable Film Behind Glass P10',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P10 Rollable Film Behind Glass.png',
    resolution: {
      width: 40,
      height: 100
    },
    price: 19900,
    siChannelPrice: 18000,
    resellerPrice: 16900,
    cabinetDimensions: {
      width: 400,
      height: 1000
    },
    moduleDimensions: {
      width: 400,
      height: 1000
    },
    moduleResolution: {
      width: 40,
      height: 100
    },
    moduleQuantity: 1,
    pixelPitch: 10.0,
    pixelDensity: 10000,
    brightness: 2000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 220,
    avgPowerConsumption: 70,
    weightPerCabinet: 2,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Rollable+P10.pdf',
    transparency: 93,
    scanMode: 'Static',
    pixelComposition: 'SMD1313'
  },
  {
    id: 'transparent-rollable-film-p15',
    name: 'Transparent Rollable Film Behind Glass P15',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P15 Rollable Film Behind Glass.png',
    resolution: {
      width: 26,
      height: 66
    },
    price: 15400,
    siChannelPrice: 14000,
    resellerPrice: 13100,
    cabinetDimensions: {
      width: 390,
      height: 990
    },
    moduleDimensions: {
      width: 390,
      height: 990
    },
    moduleResolution: {
      width: 26,
      height: 66
    },
    moduleQuantity: 1,
    pixelPitch: 15.0,
    pixelDensity: 4356,
    brightness: 2000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 180,
    avgPowerConsumption: 60,
    weightPerCabinet: 2,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Rollable+P15.pdf',
    transparency: 94,
    scanMode: 'Static',
    pixelComposition: 'SMD1313'
  },
  {
    id: 'transparent-rollable-film-p20',
    name: 'Transparent Rollable Film Behind Glass P20',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P20 Rollable Film Behind Glass.png',
    resolution: {
      width: 20,
      height: 50
    },
    price: 13200,
    siChannelPrice: 12000,
    resellerPrice: 11300,
    cabinetDimensions: {
      width: 400,
      height: 1000
    },
    moduleDimensions: {
      width: 400,
      height: 1000
    },
    moduleResolution: {
      width: 20,
      height: 50
    },
    moduleQuantity: 1,
    pixelPitch: 20.0,
    pixelDensity: 2500,
    brightness: 2000,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 150,
    avgPowerConsumption: 50,
    weightPerCabinet: 2,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Transparent+Rollable+P20.pdf',
    transparency: 95,
    scanMode: 'Static',
    pixelComposition: 'SMD1313'
  },

  // Group 4: Standard transparent screen (indoor behind glass version)
  {
    id: 'transparent-standard-p3.91-7.82-256x128',
    name: 'Standard Transparent Screen P3.91-7.82 (256x128)',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P3.91-7.82 Standard (256x128).png',
    resolution: {
      width: 256,
      height: 128
    },
    price: 11200,
    siChannelPrice: 10100,
    resellerPrice: 9500,
    cabinetDimensions: {
      width: 1000,
      height: 1000
    },
    moduleDimensions: {
      width: 1000,
      height: 1000
    },
    moduleResolution: {
      width: 256,
      height: 128
    },
    moduleQuantity: 1,
    pixelPitch: 3.91, // Average of P3.91-7.82
    pixelDensity: 32768,
    brightness: 4500,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 350,
    avgPowerConsumption: 120,
    weightPerCabinet: 15,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Standard+Transparent+P3.91-7.82.pdf',
    transparency: 55,
    scanMode: 'Static',
    pixelComposition: 'SMD1921'
  },
  {
    id: 'transparent-standard-p3.91-7.82-256x64',
    name: 'Standard Transparent Screen P3.91-7.82 (256x64)',
    category: 'Transparent Series',
    enabled: false,
    image: '/products/transparent-series/Transparent Series P3.91-7.82 Standard (256x64).png',
    resolution: {
      width: 256,
      height: 64
    },
    price: 11200,
    siChannelPrice: 10100,
    resellerPrice: 9500,
    cabinetDimensions: {
      width: 1000,
      height: 500
    },
    moduleDimensions: {
      width: 1000,
      height: 500
    },
    moduleResolution: {
      width: 256,
      height: 64
    },
    moduleQuantity: 1,
    pixelPitch: 3.91, // Average of P3.91-7.82
    pixelDensity: 32768,
    brightness: 4500,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 350,
    avgPowerConsumption: 120,
    weightPerCabinet: 15,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/transparent-series/Standard+Transparent+P3.91-7.82.pdf',
    transparency: 55,
    scanMode: 'Static',
    pixelComposition: 'SMD1921'
  },
];

export const categories = Array.from(new Set(products.filter(p => p.enabled !== false).map(p => p.category)));