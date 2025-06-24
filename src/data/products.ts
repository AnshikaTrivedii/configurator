import { Product } from '../types';

export const products: Product[] = [

  // Orion P1.5 Flexible Series Indoor Display
  {
    id: "orion-p15-flexible-indoor",
    name: "Orion P1.5mm Flexible Series LED display",
    category: "Flexible Series",
    image: "/products/flexible-series/Flexible Series Indoor P1.5.png", // Not provided in PDF
    resolution: {
      width: 213, // Calculated: 320mm ÷ 1.5mm pixel pitch
      height: 107  // Calculated: 160mm ÷ 1.5mm pixel pitch
    },
    price: undefined, // Not provided in PDF
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
    image: "/products/flexible-series/Flexible Series Indoor P1.8.png", // Not provided in PDF
    resolution: {
      width: 171, // Calculated: 320mm ÷ 1.875mm pixel pitch (spec shows 1.875mm)
      height: 85   // Calculated: 160mm ÷ 1.875mm pixel pitch
    },
    price: undefined, // Not provided in PDF
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
    image: "/products/flexible-series/Flexible Series Indoor P2.5.png", // Not provided in PDF
    resolution: {
      width: 128, // Calculated: 320mm ÷ 2.5mm pixel pitch
      height: 64   // Calculated: 160mm ÷ 2.5mm pixel pitch
    },
    price: undefined, // Not provided in PDF
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
    image: "/products/flexible-series/Flexible Series Indoor P3.png", // Not provided in PDF
    resolution: {
      width: 107, // Calculated: 320mm ÷ 3mm pixel pitch
      height: 53   // Calculated: 160mm ÷ 3mm pixel pitch
    },
    price: undefined, // Not provided in PDF
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
    image: "/products/flexible-series/Flexible Series Indoor P4.png", // Not provided in PDF
    resolution: {
      width: 80, // Calculated: 320mm ÷ 4mm pixel pitch
      height: 40  // Calculated: 160mm ÷ 4mm pixel pitch
    },
    price: undefined, // Not provided in PDF
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
    image: '/products/bellatrix-series/Bellatrix Series Indoor COB P0.9.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/Bellatrix+Series+Indoor+COB+P0.9.pdf'
  },
  {
    id: 'bellatrix-indoor-cob-p1.25',
    name: 'Bellatrix Series Indoor COB P1.25',
    category: 'Bellatrix Series',
    image: '/products/bellatrix-series/Bellatrix Series Indoor COB P1.25.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+COB+P1.25.pdf'
  },
  {
    id: 'bellatrix-indoor-cob-p1.5',
    name: 'Bellatrix Series Indoor COB P1.5',
    category: 'Bellatrix Series',
    image: '/products/bellatrix-series/Bellatrix Series Indoor COB P1.5.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+COB+P1.5.pdf'
  },
  {
    id: 'bellatrix-indoor-smd-p0.9',
    name: 'Bellatrix Series Indoor SMD P0.9',
    category: 'Bellatrix Series',
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P0.9.png',
    resolution: { width: 667, height: 375 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 300, height: 168.75 },
    moduleResolution: { width: 333, height: 188 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 0.9,
    pixelDensity: 1234444,
    brightness: 700,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P0.9.pdf'
  },
  {
    id: 'bellatrix-indoor-smd-p1.25',
    name: 'Bellatrix Series Indoor SMD P1.25',
    category: 'Bellatrix Series',
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P1.25.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P1.25.pdf'
  },
  {
    id: 'bellatrix-indoor-smd-p1.5',
    name: 'Bellatrix Series Indoor SMD P1.5',
    category: 'Bellatrix Series',
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P1.5.png',
    resolution: { width: 427, height: 320 },
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P1.5.pdf'
  },
  {
    id: 'bellatrix-indoor-smd-p1.8',
    name: 'Bellatrix Series Indoor SMD P1.8',
    category: 'Bellatrix Series',
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P1.8.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P1.8.pdf'
  },
  {
    id: 'bellatrix-indoor-smd-p2.5',
    name: 'Bellatrix Series Indoor SMD P2.5',
    category: 'Bellatrix Series',
    image: '/products/bellatrix-series/Bellatrix Series Indoor SMD P2.5.png',
    resolution: { width: 256, height: 192 },
    cabinetDimensions: { width: 640, height: 480 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 6, // 2x3
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 850,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 350,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Indoor+SMD+P2.5.pdf'
  },
  {
    id: 'bellatrix-outdoor-smd-p2.5',
    name: 'Bellatrix Series Outdoor SMD P2.5',
    category: 'Bellatrix Series',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P2.5.pdf'
  },
  {
    id: 'bellatrix-outdoor-smd-p3',
    name: 'Bellatrix Series Outdoor SMD P3',
    category: 'Bellatrix Series',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P3.pdf'
  },
  {
    id: 'bellatrix-outdoor-smd-p4',
    name: 'Bellatrix Series Outdoor SMD P4',
    category: 'Bellatrix Series',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P4.pdf'
  },
  {
    id: 'bellatrix-outdoor-smd-p6.6',
    name: 'Bellatrix Series Outdoor SMD P6.6',
    category: 'Bellatrix Series',
    image: '/products/bellatrix-series/Bellatrix Series Outdoor SMD P6.6.png',
    resolution: { width: 145, height: 145 },
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P6.6.pdf'
  },
  {
    id: 'bellatrix-outdoor-smd-p10',
    name: 'Bellatrix Series Outdoor SMD P10',
    category: 'Bellatrix Series',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/bellatrix/Bellatrix+Series+Outdoor+SMD+P10.pdf'
  },

  // Digital Standee Series
  {
    id: 'orion-p18-digital-standee',
    name: 'Orion P1.8 Indoor Standee Display',
    category: 'Digital Standee Series',
    image: '/products/standee-series/Digital Standee Series SMD P1.8.png',
    resolution: { width: 344, height: 946 },
    cabinetDimensions: { width: 665, height: 1785 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 178, height: 89 },
    moduleQuantity: 12,
    pixelPitch: 1.8,
    pixelDensity: 284444,
    brightness: 780,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 400,
    avgPowerConsumption: 120,
    weightPerCabinet: 45,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/standee-series/Digital+Standee+Series++SMD+P1.8.pdf'
  },
  {
    id: 'orion-p25-digital-standee',
    name: 'Orion P2.5 Indoor Standee Display',
    category: 'Digital Standee Series',
    image: '/products/standee-series/Digital Standee Series SMD P2.5.png',
    resolution: { width: 256, height: 704 },
    cabinetDimensions: { width: 665, height: 1785 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 12,
    pixelPitch: 2.5,
    pixelDensity: 275625,
    brightness: 780,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 400,
    avgPowerConsumption: 120,
    weightPerCabinet: 45,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/standee-series/Digital+Standee+Series++SMD+P2.5.pdf'
  },
  {
    id: 'orion-p4-digital-standee',
    name: 'Orion P4 Outdoor Standee Display',
    category: 'Digital Standee Series',
    image: '/products/standee-series/Digital Standee Series SMD P4.png',
    resolution: { width: 160, height: 440 },
    cabinetDimensions: { width: 665, height: 1785 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 80, height: 40 },
    moduleQuantity: 12,
    pixelPitch: 4.0,
    pixelDensity: 160000,
    brightness: 4500,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 750,
    avgPowerConsumption: 400,
    weightPerCabinet: 60,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/standee-series/Digital+Standee+Series++SMD+P4.pdf'
  },

  // Rigel Series
  // Rigel Series Outdoor P2.5
  {
    id: 'rigel-p2.5-outdoor',
    name: 'Orion P2.5 Outdoor Rigel Series',
    category: 'Rigel Series',
    image: '/products/rigel-series/outdoor-P2.5.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P2.5.pdf'
  },
  // Rigel Series Outdoor P3
  {
    id: 'rigel-p3-outdoor',
    name: 'Orion P3 Outdoor Rigel Series',
    category: 'Rigel Series',
    image: '/products/rigel-series/outdoor-P3.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P3.pdf'
  },
  // Rigel Series Outdoor P4
  {
    id: 'rigel-p4-outdoor',
    name: 'Orion P4 Outdoor Rigel Series',
    category: 'Rigel Series',
    image: '/products/rigel-series/outdoor-P4.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P4.pdf'
  },
  // Rigel Series Outdoor P6.6
  {
    id: 'rigel-p6.6-outdoor',
    name: 'Orion P6.6 Outdoor Rigel Series',
    category: 'Rigel Series',
    image: '/products/rigel-series/outdoor-P6.6.png',
    resolution: { width: 145, height: 145 },
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P6.6.pdf'
  },
  // Rigel Series Outdoor P10
  {
    id: 'rigel-p10-outdoor',
    name: 'Orion P10 Outdoor Rigel Series',
    category: 'Rigel Series',
    image: '/products/rigel-series/outdoor-P10.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Outdoor+SMD+P10.pdf'
  },
  // Rigel Series COB P1.5
  {
    id: 'rigel-cob-p1.5',
    name: 'Rigel Indoor COB P1.5',
    category: 'Rigel Series',
    image: '/products/rigel-series/indoor-P1.5.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+COB+P1.5.pdf'
  },
  // Rigel Series SMD P0.9
  {
    id: 'rigel-smd-p0.9',
    name: 'Rigel Indoor SMD P0.9',
    category: 'Rigel Series',
    image: '/products/rigel-series/indoor-P0.9.png',
    resolution: { width: 667, height: 375 }, // Calculated from cabinet dimensions and pixel pitch
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 300, height: 168.75 },
    moduleResolution: { width: 333, height: 188 }, // Calculated from module dimensions and pixel pitch
    moduleQuantity: 2, // 2x1 modules
    pixelPitch: 0.9,
    pixelDensity: 1234444,
    brightness: 700,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P0.9.pdf'
  },
  // Rigel Series SMD P1.5
  {
    id: 'rigel-smd-p1.5',
    name: 'Rigel Indoor SMD P1.5',
    category: 'Rigel Series',
    image: '/products/rigel-series/indoor-P1.5.png',
    resolution: { width: 426, height: 320 }, // Calculated from cabinet dimensions and pixel pitch
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P1.5.pdf'
  },
  // Rigel Series SMD P1.8
  {
    id: 'rigel-smd-p1.8',
    name: 'Rigel Indoor SMD P1.8',
    category: 'Rigel Series',
    image: '/products/rigel-series/indoor-P1.8.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P1.8.pdf'
  },
  // Rigel Series SMD P1.25
  {
    id: 'rigel-smd-p1.25',
    name: 'Rigel Indoor SMD P1.25',
    category: 'Rigel Series',
    image: '/products/rigel-series/indoor-P1.25.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P1.25.pdf'
  },
  // Rigel Series SMD P2.5
  {
    id: 'rigel-smd-p2.5',
    name: 'Rigel Indoor SMD P2.5',
    category: 'Rigel Series',
    image: '/products/rigel-series/indoor-smd-P2.5.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+SMD+P2.5.pdf'
  },
  // Rigel Series P1.25
  {
    id: 'rigel-cob-p1.25',
    name: 'Orion Rigel Indoor COB P1.25',
    category: 'Rigel Series',
    image: '/products/rigel-series/indoor-P1.25.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+COB+P1.25.pdf'
  },
  // Rigel Series P0.9
  {
    id: 'rigel-cob-p0.9',
    name: 'Orion Rigel Indoor COB P0.9',
    category: 'Rigel Series',
    image: '/products/rigel-series/indoor-P0.9.png',
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
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/rigel-series/Rigel+Indoor+COB+P0.9.pdf'
  },
  
  // Betel Series Indoor SMD P0.9
  {
    id: 'betel-indoor-smd-p0.9',
    name: 'Betel Series Indoor SMD P0.9',
    category: 'Betel Series',
    image: '/products/Betel-series/indoor-0.91.png',
    resolution: { width: 667, height: 375 },
    cabinetDimensions: { width: 600, height: 337.5 },
    moduleDimensions: { width: 300, height: 168.75 },
    moduleResolution: { width: 333, height: 188 },
    moduleQuantity: 4, // 2x2
    pixelPitch: 0.9,
    pixelDensity: 1234444,
    brightness: 800,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 225,
    weightPerCabinet: 6.5,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/betel-series/Betelgeuse+Indoor+SMD+P0.9mm.pdf',
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
  // Betel Series Indoor SMD P1.25
  {
    id: 'betel-indoor-smd-p1.25',
    name: 'Betel Series Indoor SMD P1.25',
    category: 'Betel Series',
    image: '/products/Betel-series/indoor-1.25.png',
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
  // Betel Series Indoor SMD P1.5
  {
    id: 'betel-indoor-smd-p1.5',
    name: 'Betel Series Indoor SMD P1.5',
    category: 'Betel Series',
    image: '/products/Betel-series/indoor-1.5.png',
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
    name: 'Betel Series Indoor SMD P1.8',
    category: 'Betel Series',
    image: '/products/Betel-series/indoor-1.8.png',
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
  },
  // Betel Series Indoor SMD P2.5
  {
    id: 'betel-indoor-smd-p2.5',
    name: 'Betel Series Indoor SMD P2.5',
    category: 'Betel Series',
    image: '/products/Betel-series/indoor-2.5.png',
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
  },
  // Betel Series Outdoor SMD P2.5
  {
    id: 'betel-outdoor-smd-p2.5',
    name: 'Betel Series Outdoor SMD P2.5',
    category: 'Betel Series',
    image: '/products/Betel-series/outdoor-2.5.png',
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
  },
  // Betel Series Outdoor SMD P3
  {
    id: 'betel-outdoor-smd-p3',
    name: 'Betel Series Outdoor SMD P3',
    category: 'Betel Series',
    image: '/products/Betel-series/outdoor-3.png',
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
  },
  // Betel Series Outdoor SMD P4
  {
    id: 'betel-outdoor-smd-p4',
    name: 'Betel Series Outdoor SMD P4',
    category: 'Betel Series',
    image: '/products/Betel-series/outdoor-4.png',
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
  },
  // Betel Series Outdoor SMD P6.6
  {
    id: 'betel-outdoor-smd-p6.6',
    name: 'Betel Series Outdoor SMD P6.6',
    category: 'Betel Series',
    image: '/products/Betel-series/outdoor-6.6.png',
    resolution: { width: 145, height: 145 },
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
  },
  // Betel Series Outdoor SMD P10
  {
    id: 'betel-outdoor-smd-p10',
    name: 'Betel Series Outdoor SMD P10',
    category: 'Betel Series',
    image: '/products/Betel-series/outdoor-10.png',
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
  },
  // Rental Series Indoor P2.6
  {
    id: 'rental-indoor-p2.6',
    name: 'Rental Series Indoor P2.6',
    category: 'Rental Series',
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
    certificates: 'CE/BIS/ISO/ROHS/MII'
  },
  // Rental Series Indoor P2.97
  {
    id: 'rental-indoor-p2.97',
    name: 'Rental Series Indoor P2.97',
    category: 'Rental Series',
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
    certificates: 'CE/BIS/ISO/ROHS/MII'
  },
  // Rental Series Outdoor P3.8
  {
    id: 'rental-outdoor-p3.8',
    name: 'Rental Series Outdoor P3.8',
    category: 'Rental Series',
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
    certificates: 'CE/BIS/ISO/ROHS/MII'
  },
  // Rental Series Outdoor P4.8
  {
    id: 'rental-outdoor-p4.8',
    name: 'Rental Series Outdoor P4.8',
    category: 'Rental Series',
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
    certificates: 'CE/BIS/ISO/ROHS/MII'
  },
  // Jumbo Series Outdoor P6
  {
    id: 'jumbo-outdoor-p6',
    name: 'Jumbo Series Outdoor P6',
    category: 'Jumbo Series',
    image: '/products/jumbo-series/Screenshot 2025-06-24 at 12.58.47 PM.png',
    resolution: { width: 160, height: 160 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 192, height: 192 },
    moduleResolution: { width: 32, height: 32 },
    moduleQuantity: 25, // 5x5
    pixelPitch: 6,
    pixelDensity: 27776,
    brightness: 5500,
    refreshRate: 1920,
    environment: 'outdoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 325,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/jumbo-series/Jumbo+Series+Outdoor+SMD+P6.pdf',
    ledType: 'SMD',
    ledConfiguration: '1R + 1G + 1B',
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
    certificates: 'CE, ROHS, ISO, BIS'
  },
  // Jumbo Series Outdoor P4
  {
    id: 'jumbo-outdoor-p4',
    name: 'Jumbo Series Outdoor P4',
    category: 'Jumbo Series',
    image: '/products/jumbo-series/Screenshot 2025-06-24 at 12.58.47 PM copy.png',
    resolution: { width: 240, height: 240 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 80, height: 40 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 4,
    pixelDensity: 62500,
    brightness: 5000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 325,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/jumbo-series/Jumbo+Series+Outdoor+SMD+P4.pdf',
    ledType: 'SMD',
    ledConfiguration: '1R + 1PG + 1PB',
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
    certificates: 'CE, ROHS, ISO, BIS'
  },
  // Jumbo Series Outdoor P3
  {
    id: 'jumbo-outdoor-p3',
    name: 'Jumbo Series Outdoor P3',
    category: 'Jumbo Series',
    image: '/products/jumbo-series/Screenshot 2025-06-24 at 12.58.47 PM copy 2.png',
    resolution: { width: 320, height: 320 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 192, height: 192 },
    moduleResolution: { width: 64, height: 64 },
    moduleQuantity: 25, // 5x5
    pixelPitch: 3,
    pixelDensity: 111000,
    brightness: 5000,
    refreshRate: 3840,
    environment: 'outdoor',
    maxPowerConsumption: 650,
    avgPowerConsumption: 325,
    weightPerCabinet: 27,
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/jumbo-series/Jumbo+Series+Outdoor+SMD+P3.pdf',
    ledType: 'SMD',
    ledConfiguration: '1R + 1PG + 1PB',
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
    certificates: 'CE, ROHS, ISO, BIS'
  },
  // Jumbo Series Indoor P2.5
  {
    id: 'jumbo-indoor-p2.5',
    name: 'Jumbo Series Indoor P2.5',
    category: 'Jumbo Series',
    image: '/products/jumbo-series/Screenshot 2025-06-24 at 12.58.47 PM copy 3.png',
    resolution: { width: 384, height: 384 },
    cabinetDimensions: { width: 960, height: 960 },
    moduleDimensions: { width: 320, height: 160 },
    moduleResolution: { width: 128, height: 64 },
    moduleQuantity: 18, // 3x6
    pixelPitch: 2.5,
    pixelDensity: 160000,
    brightness: 4500,
    refreshRate: 3840,
    environment: 'indoor',
    maxPowerConsumption: 700,
    avgPowerConsumption: 300,
    weightPerCabinet: 27, // Assuming same as other jumbo series
    pdf: 'https://origin-cms1.s3.ap-south-1.amazonaws.com/products-pdfs/jumbo-series/Jumbo+Series+Outdoor+SMD+P2.5.pdf',
    ledType: 'SMD',
    ledConfiguration: '1R + 1PG + 1PB',
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
    ipGrade: 'IP65', // Note: High for an indoor product
    certificates: 'CE, ROHS, ISO, BIS'
  },
];

export const categories = Array.from(new Set(products.map(p => p.category)));