import React from 'react';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import { Ruler, Zap, Move3d, Monitor, Boxes, Square, Maximize2 } from 'lucide-react';
interface ConfigurationSummaryProps {
  config: DisplayConfig;
  cabinetGrid: CabinetGrid;
  selectedProduct?: Product;
  processor?: string;
  mode?: string;
}

// Helper for Indian number formatting
function formatIndianNumber(x: number): string {
  const s = x.toString();
  let afterFirst = s.length > 3 ? s.slice(0, s.length - 3) : '';
  const lastThree = s.slice(-3);
  if (afterFirst) {
    afterFirst = afterFirst.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
    return afterFirst + ',' + lastThree;
  } else {
    return lastThree;
  }
}



export const ConfigurationSummary: React.FC<ConfigurationSummaryProps> = ({
  config,
  cabinetGrid,
  selectedProduct,
  processor,
  mode
}) => {
  if (!selectedProduct) return null;

  // Check if product is Jumbo Series (prices already include controllers)
  const isJumboSeries = selectedProduct.category?.toLowerCase().includes('jumbo') || 
                        selectedProduct.id?.toLowerCase().startsWith('jumbo-') ||
                        selectedProduct.name?.toLowerCase().includes('jumbo series');

  // Conversion constants - using exact values for precision
  const FEET_TO_MM = 304.8; // Exact: 1 ft = 304.8 mm
  const MM_TO_FEET = 1 / FEET_TO_MM;

  // Convert mm to display unit with high precision
  const toDisplayUnit = (mm: number, unit: string) => {
    if (unit === 'ft') {
      // Direct conversion from mm to ft for precision (matches wizard conversion)
      const feet = mm * MM_TO_FEET;
      return feet.toFixed(2);
    }
    // Convert mm to meters
    const meters = mm / 1000;
    return meters.toFixed(2);
  };
  

  
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
    MM_TO_FEET: MM_TO_FEET
  });
  

  
  // Calculate diagonal in display units
  const diagonalMeters = Math.sqrt(Math.pow(config.width/1000, 2) + Math.pow(config.height/1000, 2));
  // Convert diagonal to feet if needed using direct mm to ft conversion
  const diagonalInDisplayUnit = config.unit === 'ft' 
    ? Math.sqrt(Math.pow(config.width * MM_TO_FEET, 2) + Math.pow(config.height * MM_TO_FEET, 2))
    : diagonalMeters;
  
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


  // Calculate total price based on user type and area in square feet - Commented out for future use
  // const totalCabinets = cabinetGrid.columns * cabinetGrid.rows;
  // let pricePerSqFt = selectedProduct.price;
  // // Remove Digital Standee Series override logic
  // if (userType === 'siChannel') pricePerSqFt = selectedProduct.siChannelPrice;
  // if (userType === 'reseller') pricePerSqFt = selectedProduct.resellerPrice;
  // const totalPrice = pricePerSqFt ? displayAreaFeet * pricePerSqFt : undefined;

  // Get processor price based on user type and selected processor - Commented out for future use
  // let processorPrice = 0;
  // if (processor && processorPrices[processor]) {
  //   if (userType === 'siChannel') processorPrice = processorPrices[processor].siChannel;
  //   else if (userType === 'reseller') processorPrice = processorPrices[processor].reseller;
  //   else processorPrice = processorPrices[processor].endUser;
  // }
  
  // Debug logging for processor price - Commented out for future use
  // console.log('Processor Price Debug:', {
  //   processor,
  //   userType,
  //   processorPrice,
  //   availableProcessors: Object.keys(processorPrices),
  //   processorFound: processor ? processorPrices[processor] : false
  // });
  
  // const totalPriceWithProcessor = totalPrice !== undefined ? totalPrice + processorPrice : undefined;





  // Show only the correct prices for the product type - Commented out for future use
  // const showPrice = (type: 'endUser' | 'siChannel' | 'reseller') => {
  //   if (productType === 'SMD' || productType === 'COB') {
  //     if (type === 'endUser') return selectedProduct.price;
  //     if (type === 'siChannel') return selectedProduct.siChannelPrice;
  //     if (type === 'reseller') return selectedProduct.resellerPrice;
  //   }
  //   return undefined;
  // };



  // Helper to get price for rental series - Commented out for future use
  // const getRentalPrice = () => {
  //   if (!selectedProduct || !selectedProduct.prices || !selectedProduct.rentalOption) return null;
  //   const option = selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet';
  //   return selectedProduct.prices[option]?.[userTypeToPriceKey(currentUserType)] || null;
  // };

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

        {/* Number of Cabinets/Modules */}
        <div className="bg-amber-50 p-3 sm:p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 rounded-lg bg-amber-100 text-amber-500 bg-opacity-50 flex-shrink-0">
              <Boxes className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-medium text-gray-500 truncate">
                {isJumboSeries ? 'Number of Modules' : 'Number of Cabinets'}
              </h3>
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
            {selectedProduct.category === 'Transparent Series' && selectedProduct.transparency && (
              <div className="bg-white rounded-lg p-2 sm:p-3">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Transparency</div>
                <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.transparency}%</div>
              </div>
            )}
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
            {selectedProduct.category === 'Transparent Series' && selectedProduct.scanMode && (
              <div className="bg-white rounded-lg p-2 sm:p-3">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Scan Mode</div>
                <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.scanMode}</div>
              </div>
            )}
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
            {selectedProduct.category === 'Transparent Series' && selectedProduct.pixelComposition && (
              <div className="bg-white rounded-lg p-2 sm:p-3">
                <div className="text-xs sm:text-sm text-gray-600 mb-1">Pixel Composition</div>
                <div className="font-medium text-gray-900 text-xs sm:text-sm">{selectedProduct.pixelComposition}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controller Information - Hidden for Jumbo Series (prices include controllers) */}
      {!isJumboSeries && (processor || mode) && (
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
