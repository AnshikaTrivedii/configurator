import React, { useEffect, useState } from 'react';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import { Ruler, Zap, ZapOff, Move3d, Monitor, Boxes, Square, Maximize2 } from 'lucide-react';
import { UserType } from './UserTypeModal';

interface ConfigurationSummaryProps {
  config: DisplayConfig;
  cabinetGrid: CabinetGrid;
  selectedProduct?: Product;
  userType?: UserType | null;
  processor?: string;
  mode?: string;
}

// Helper for Indian number formatting
function formatIndianNumber(x: number): string {
  const s = x.toString();
  let afterFirst = s.length > 3 ? s.slice(0, s.length - 3) : '';
  let lastThree = s.slice(-3);
  if (afterFirst) {
    afterFirst = afterFirst.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return afterFirst + ',' + lastThree;
  } else {
    return lastThree;
  }
}

// Processor price mapping by controller and user type
const processorPrices: Record<string, { endUser: number; siChannel: number; reseller: number }> = {
  TB2:      { endUser: 35000, siChannel: 31500, reseller: 29800 },
  TB40:     { endUser: 35000, siChannel: 31500, reseller: 29800 },
  TB60:     { endUser: 65000, siChannel: 58500, reseller: 55300 },
  VX1:      { endUser: 35000, siChannel: 31500, reseller: 29800 },
  VX400:    { endUser: 100000, siChannel: 90000, reseller: 85000 },
  'VX400 Pro': { endUser: 110000, siChannel: 99000, reseller: 93500 },
  VX600:    { endUser: 150000, siChannel: 135000, reseller: 127500 },
  'VX600 Pro': { endUser: 165000, siChannel: 148500, reseller: 140250 },
  VX1000:   { endUser: 200000, siChannel: 180000, reseller: 170000 },
  'VX1000 Pro': { endUser: 220000, siChannel: 198000, reseller: 187000 },
  '4K PRIME': { endUser: 300000, siChannel: 270000, reseller: 255000 },
};

// Helper to map UserType to product price key
const userTypeToPriceKey = (type: UserType) => type === 'endUser' ? 'endCustomer' : type;

export const ConfigurationSummary: React.FC<ConfigurationSummaryProps> = ({
  config,
  cabinetGrid,
  selectedProduct,
  userType,
  processor,
  mode
}) => {
  if (!selectedProduct) return null;

  // Conversion constants
  const METERS_TO_FEET = 3.2808399;
  const FEET_TO_METERS = 1 / METERS_TO_FEET;

  // Convert mm to display unit with 2 decimal places
  const toDisplayUnit = (mm: number, unit: string) => {
    const meters = mm / 1000;
    if (unit === 'ft') {
      return (meters * METERS_TO_FEET).toFixed(2);
    }
    return meters.toFixed(2);
  };
  
  // Convert mm to inches with 2 decimal places (for imperial display)
  const toInches = (mm: number) => (mm / 25.4).toFixed(2);
  
  // Calculate display area using displayed dimensions for consistency
  const displayedWidth = parseFloat(toDisplayUnit(config.width, config.unit));
  const displayedHeight = parseFloat(toDisplayUnit(config.height, config.unit));
  const displayAreaFeet = displayedWidth * displayedHeight;
  
  // Calculate display area in square display units
  const displayArea = (config.width * config.height) / 1000000; // mm² to m²
  const displayAreaInDisplayUnit = config.unit === 'ft' ? displayAreaFeet : displayArea;
  
  // Debug logging for area calculation
  console.log('Area Calculation Debug:', {
    configWidth: config.width,
    configHeight: config.height,
    displayAreaFeet: displayAreaFeet,
    displayedWidth: displayedWidth,
    displayedHeight: displayedHeight,
    expectedAreaFromDisplayed: displayedWidth * displayedHeight,
    METERS_TO_FEET: METERS_TO_FEET
  });
  
  // Calculate display area in square inches
  const displayAreaInches = (config.width * config.height) / (25.4 * 25.4); // mm² to in²
  
  // Calculate diagonal in display units
  const diagonalMeters = Math.sqrt(Math.pow(config.width/1000, 2) + Math.pow(config.height/1000, 2));
  const diagonalInDisplayUnit = config.unit === 'ft' ? diagonalMeters * METERS_TO_FEET : diagonalMeters;
  
  // Convert to inches for imperial display
  const diagonalInches = diagonalMeters * 39.3701;
  const feet = Math.floor(diagonalInches / 12);
  const inches = Math.round((diagonalInches % 12) * 16) / 16; // Round to nearest 1/16 inch
  
  // Calculate power consumption
  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7; // Default to 91.7W if not specified
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3); // Use actual max power or default to 3x avg
  const avgPower = (avgPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);
  const maxPower = (maxPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);
  
  // Debug logging for power consumption
  console.log('Power Consumption Debug:', {
    productName: selectedProduct.name,
    productCategory: selectedProduct.category,
    avgPowerPerCabinet: selectedProduct.avgPowerConsumption || 91.7,
    maxPowerPerCabinet: selectedProduct.maxPowerConsumption || (selectedProduct.avgPowerConsumption || 91.7) * 3,
    cabinetGrid: { columns: cabinetGrid.columns, rows: cabinetGrid.rows, total: cabinetGrid.columns * cabinetGrid.rows },
    calculatedAvgPower: avgPower,
    calculatedMaxPower: maxPower,
    config: { width: config.width, height: config.height },
    cabinetDimensions: selectedProduct.cabinetDimensions,
    expectedAvgPower: selectedProduct.avgPowerConsumption || 91.7,
    expectedMaxPower: selectedProduct.maxPowerConsumption || (selectedProduct.avgPowerConsumption || 91.7) * 3
  });
  
  // Special debug for BETELGEUSE series
  if (selectedProduct.category?.toLowerCase().includes('betelgeuse')) {
    console.log('BETELGEUSE Series Debug:', {
      productName: selectedProduct.name,
      avgPowerPerCabinet: selectedProduct.avgPowerConsumption,
      maxPowerPerCabinet: selectedProduct.maxPowerConsumption,
      cabinetGrid: { columns: cabinetGrid.columns, rows: cabinetGrid.rows, total: cabinetGrid.columns * cabinetGrid.rows },
      calculatedAvgPower: avgPower,
      calculatedMaxPower: maxPower,
      expectedFor1Cabinet: {
        avg: selectedProduct.avgPowerConsumption,
        max: selectedProduct.maxPowerConsumption
      }
    });
  }
  
  // Special debug for FLEXIBLE series
  if (selectedProduct.category?.toLowerCase().includes('flexible')) {
    console.log('FLEXIBLE Series Debug:', {
      productName: selectedProduct.name,
      avgPowerPerCabinet: selectedProduct.avgPowerConsumption,
      maxPowerPerCabinet: selectedProduct.maxPowerConsumption,
      cabinetGrid: { columns: cabinetGrid.columns, rows: cabinetGrid.rows, total: cabinetGrid.columns * cabinetGrid.rows },
      calculatedAvgPower: avgPower,
      calculatedMaxPower: maxPower,
      expectedFor1Cabinet: {
        avg: selectedProduct.avgPowerConsumption,
        max: selectedProduct.maxPowerConsumption
      }
    });
  }
  
  // Special debug for RENTAL series
  if (selectedProduct.category?.toLowerCase().includes('rental')) {
    console.log('RENTAL Series Debug:', {
      productName: selectedProduct.name,
      avgPowerPerCabinet: selectedProduct.avgPowerConsumption,
      maxPowerPerCabinet: selectedProduct.maxPowerConsumption,
      cabinetGrid: { columns: cabinetGrid.columns, rows: cabinetGrid.rows, total: cabinetGrid.columns * cabinetGrid.rows },
      calculatedAvgPower: avgPower,
      calculatedMaxPower: maxPower,
      expectedFor1Cabinet: {
        avg: selectedProduct.avgPowerConsumption,
        max: selectedProduct.maxPowerConsumption
      }
    });
  }

  // Calculate pixel density (pixels per meter)
  const pixelsPerMeterWidth = (selectedProduct.resolution.width * cabinetGrid.columns) / (config.width / 1000); // pixels per meter width
  const pixelsPerMeterHeight = (selectedProduct.resolution.height * cabinetGrid.rows) / (config.height / 1000); // pixels per meter height
  const pixelDensity = Math.round(pixelsPerMeterWidth * pixelsPerMeterHeight); // Total pixels per square meter
  
  // Calculate total pixels
  const totalPixels = selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows;

  // Calculate total price based on user type and area in square feet
  const totalCabinets = cabinetGrid.columns * cabinetGrid.rows;
  let pricePerSqFt = selectedProduct.price;
  // Remove Digital Standee Series override logic
  if (userType === 'siChannel') pricePerSqFt = selectedProduct.siChannelPrice;
  if (userType === 'reseller') pricePerSqFt = selectedProduct.resellerPrice;
  const totalPrice = pricePerSqFt ? displayAreaFeet * pricePerSqFt : undefined;

  // Get processor price based on user type and selected processor
  let processorPrice = 0;
  if (processor && processorPrices[processor]) {
    if (userType === 'siChannel') processorPrice = processorPrices[processor].siChannel;
    else if (userType === 'reseller') processorPrice = processorPrices[processor].reseller;
    else processorPrice = processorPrices[processor].endUser;
  }
  
  // Debug logging for processor price
  console.log('Processor Price Debug:', {
    processor,
    userType,
    processorPrice,
    availableProcessors: Object.keys(processorPrices),
    processorFound: processor ? processorPrices[processor] : false
  });
  
  const totalPriceWithProcessor = totalPrice !== undefined ? totalPrice + processorPrice : undefined;

  // Determine product type (SMD or COB)
  const getProductType = (product: Product) => {
    if (product.ledType) {
      if (product.ledType.toLowerCase().includes('cob')) return 'COB';
      if (product.ledType.toLowerCase().includes('smd')) return 'SMD';
    }
    if (product.name.toLowerCase().includes('cob')) return 'COB';
    if (product.name.toLowerCase().includes('smd')) return 'SMD';
    return undefined;
  };
  const productType = getProductType(selectedProduct);



  // Show only the correct prices for the product type
  const showPrice = (type: 'endUser' | 'siChannel' | 'reseller') => {
    if (productType === 'SMD' || productType === 'COB') {
      if (type === 'endUser') return selectedProduct.price;
      if (type === 'siChannel') return selectedProduct.siChannelPrice;
      if (type === 'reseller') return selectedProduct.resellerPrice;
    }
    return undefined;
  };

  // User type detection (from localStorage or prop)
  const [currentUserType, setCurrentUserType] = useState<UserType>(userType || 'endUser');
  useEffect(() => {
    if (userType) setCurrentUserType(userType);
    else {
      const stored = localStorage.getItem('userType');
      if (stored === 'siChannel' || stored === 'reseller' || stored === 'endUser') setCurrentUserType(stored as UserType);
    }
  }, [userType]);

  // Helper to get price for rental series
  const getRentalPrice = () => {
    if (!selectedProduct || !selectedProduct.prices || !selectedProduct.rentalOption) return null;
    const option = selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet';
    return selectedProduct.prices[option]?.[userTypeToPriceKey(currentUserType)] || null;
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main Configuration Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 w-full">
        {/* Size (w × h) */}
        <div className="bg-blue-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-blue-100 text-blue-500 bg-opacity-50 flex-shrink-0">
              <Ruler className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">Size (w × h)</h3>
              <p className="mt-1 text-sm sm:text-lg font-semibold text-blue-700 break-words">
                {toDisplayUnit(config.width, config.unit)} {config.unit}<br />
                {toDisplayUnit(config.height, config.unit)} {config.unit}
              </p>
            </div>
          </div>
        </div>

        {/* Resolution */}
        <div className="bg-purple-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-purple-100 text-purple-500 bg-opacity-50 flex-shrink-0">
              <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">Resolution</h3>
              <p className="mt-1 text-sm sm:text-lg font-semibold text-purple-700 break-words">
                {selectedProduct.resolution.width * cabinetGrid.columns} × {selectedProduct.resolution.height * cabinetGrid.rows} px
              </p>
            </div>
          </div>
        </div>

        {/* Number of Cabinets */}
        <div className="bg-amber-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 text-amber-500 bg-opacity-50 flex-shrink-0">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">Number of Cabinets</h3>
              <p className="mt-1 text-sm sm:text-lg font-semibold text-amber-700 break-words">
                {cabinetGrid.columns * cabinetGrid.rows} ({cabinetGrid.columns} × {cabinetGrid.rows})
              </p>
            </div>
          </div>
        </div>

        {/* Aspect Ratio */}
        <div className="bg-emerald-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-100 text-emerald-500 bg-opacity-50 flex-shrink-0">
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">Aspect Ratio</h3>
              <p className="mt-1 text-sm sm:text-lg font-semibold text-emerald-700 break-words">
                {(() => {
        // Show the selected aspect ratio label if available
        if (config.aspectRatio && typeof config.aspectRatio === 'string') {
          if (config.aspectRatio === '16:9' || config.aspectRatio === '4:3' || config.aspectRatio === '1:1') {
            return config.aspectRatio;
          }
          if (config.aspectRatio === 'none') {
            return 'None';
          }
        }
        // Fallback to calculated ratio
        return `${Math.round((config.width / config.height) * 9)}:9`;
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* Display Area */}
        <div className="bg-rose-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-rose-100 text-rose-500 bg-opacity-50 flex-shrink-0">
              <Square className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">Display Area</h3>
              <p className="mt-1 text-sm sm:text-lg font-semibold text-rose-700 break-words">
                {displayAreaInDisplayUnit.toFixed(2)} {config.unit}²<br />
          ({displayAreaFeet.toFixed(2)} ft²)
              </p>
            </div>
          </div>
        </div>

        {/* Display Diagonal */}
        <div className="bg-indigo-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-100 text-indigo-500 bg-opacity-50 flex-shrink-0">
              <Move3d className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">Display Diagonal</h3>
              <p className="mt-1 text-sm sm:text-lg font-semibold text-indigo-700 break-words">
                {diagonalInDisplayUnit.toFixed(2)} {config.unit} ({feet > 0 ? `${feet}′ ` : ''}{inches}″)
              </p>
            </div>
          </div>
        </div>

        {/* Total Pixels */}
        <div className="bg-cyan-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
            <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-cyan-100 text-cyan-500 bg-opacity-50 flex-shrink-0">
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">Total Pixels</h3>
              <p className="mt-1 text-sm sm:text-lg font-semibold text-cyan-700 break-words">
                {formatIndianNumber(selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows)}
                </p>
              </div>
          </div>
        </div>

        {/* Pixel Density */}
        <div className="bg-green-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-green-100 text-green-500 bg-opacity-50 flex-shrink-0">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">Pixel Density</h3>
              <p className="mt-1 text-sm sm:text-lg font-semibold text-green-700 break-words">
                {selectedProduct.pixelDensity} px²/m²
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Power Consumption Details */}
      <div className="bg-red-50 rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-red-100 text-red-500 bg-opacity-50">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="font-semibold text-red-900 text-base sm:text-lg">Power Consumption Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Power (avg)</div>
            <div className="text-sm sm:text-lg font-semibold text-red-700">{avgPower} W</div>
          </div>
          <div className="bg-white rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Power (max)</div>
            <div className="text-sm sm:text-lg font-semibold text-red-700">{maxPower} W</div>
          </div>
          <div className="bg-white rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Per Cabinet (avg)</div>
            <div className="text-sm sm:text-lg font-semibold text-red-700">{avgPowerPerCabinet} W</div>
          </div>
          <div className="bg-white rounded-lg p-2 sm:p-3">
            <div className="text-xs sm:text-sm text-gray-600 mb-1">Per Cabinet (max)</div>
            <div className="text-sm sm:text-lg font-semibold text-red-700">{maxPowerPerCabinet} W</div>
          </div>
        </div>
      </div>

      {/* Product Details */}
      <div className="bg-gray-50 rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-md">
        <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
          <div className="p-1.5 sm:p-2 rounded-lg bg-gray-100 text-gray-500 bg-opacity-50">
            <Move3d className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <h3 className="font-semibold text-gray-900 text-base sm:text-lg">Product Details</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="space-y-2 sm:space-y-3">
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Product</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.name}</div>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Category</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.category}</div>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Pixel Pitch</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.pixelPitch} mm</div>
            </div>
          </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Brightness</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.brightness} nits</div>
        </div>
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Refresh Rate</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.refreshRate} Hz</div>
                </div>
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Environment</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm capitalize">{selectedProduct.environment}</div>
                </div>
              </div>
          <div className="space-y-2 sm:space-y-3">
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Cabinet Size</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.cabinetDimensions.width} × {selectedProduct.cabinetDimensions.height} mm</div>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Weight per Cabinet</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.weightPerCabinet || 'N/A'} kg</div>
            </div>
            <div className="bg-white rounded-lg p-2 sm:p-3">
              <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Weight</div>
              <div className="font-medium text-gray-900 text-xs sm:text-sm">{((selectedProduct.weightPerCabinet || 0) * cabinetGrid.columns * cabinetGrid.rows).toFixed(2)} kg</div>
            </div>
          </div>
        </div>
      </div>

      {/* Controller Information */}
      {(processor || mode) && (
        <div className="bg-indigo-50 rounded-xl p-3 sm:p-4 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4">
            <div className="p-1.5 sm:p-2 rounded-lg bg-indigo-100 text-indigo-500 bg-opacity-50">
              <Maximize2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="font-semibold text-indigo-900 text-base sm:text-lg">Controller Information</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {processor && (
              <div className="bg-white rounded-lg p-2 sm:p-3">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Processor</div>
                <div className="font-medium text-gray-900 text-xs sm:text-sm">{processor}</div>
              </div>
            )}
            {mode && (
              <div className="bg-white rounded-lg p-2 sm:p-3">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Mode</div>
                <div className="font-medium text-gray-900 text-xs sm:text-sm">{mode}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
