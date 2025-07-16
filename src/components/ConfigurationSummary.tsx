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

  // Convert mm to meters with 3 decimal places
  const toMeters = (mm: number) => (mm / 1000).toFixed(3);
  
  // Convert mm to inches with 2 decimal places
  const toInches = (mm: number) => (mm / 25.4).toFixed(2);
  
  // Calculate display area in square meters
  const displayArea = (config.width * config.height) / 1000000; // mm² to m²
  // Calculate display area in square feet
  const displayAreaFeet = displayArea * 10.7639;
  
  // Calculate display area in square inches
  const displayAreaInches = (config.width * config.height) / (25.4 * 25.4); // mm² to in²
  
  // Calculate diagonal in meters
  const diagonalMeters = Math.sqrt(Math.pow(config.width/1000, 2) + Math.pow(config.height/1000, 2));
  
  // Convert meters to inches for diagonal
  const diagonalInches = diagonalMeters * 39.3701;
  const feet = Math.floor(diagonalInches / 12);
  const inches = Math.round((diagonalInches % 12) * 16) / 16; // Round to nearest 1/16 inch
  
  // Calculate power consumption
  const powerPerCabinet = selectedProduct.avgPowerConsumption || 91.7; // Default to 91.7W if not specified
  const avgPower = (powerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(1);
  const maxPower = (powerPerCabinet * 3 * cabinetGrid.columns * cabinetGrid.rows).toFixed(1); // Assuming 3x max power

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

  // Configuration items with icons and colors
  const configItems = [
    {
      icon: <Ruler className="w-5 h-5 text-blue-500" />,
      title: 'Size (w × h)',
      value: (
        <>
          {toMeters(config.width)} m × {toMeters(config.height)} m<br />
          ({toInches(config.width)} in × {toInches(config.height)} in)
        </>
      ),
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      icon: <Monitor className="w-5 h-5 text-purple-500" />,
      title: 'Resolution',
      value: `${selectedProduct.resolution.width * cabinetGrid.columns} × ${selectedProduct.resolution.height * cabinetGrid.rows} px`,
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      icon: <Boxes className="w-5 h-5 text-amber-500" />,
      title: 'Number of Cabinets',
      value: `${cabinetGrid.columns * cabinetGrid.rows} (${cabinetGrid.columns} × ${cabinetGrid.rows})`,
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      icon: <Maximize2 className="w-5 h-5 text-emerald-500" />,
      title: 'Aspect Ratio',
      value: (() => {
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
      })(),
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    },
    {
      icon: <Square className="w-5 h-5 text-rose-500" />,
      title: 'Display Area',
      value: (
        <>
          {displayArea.toFixed(2)} m²<br />
          ({displayAreaFeet.toFixed(2)} ft²)
        </>
      ),
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700'
    },
    {
      icon: <Move3d className="w-5 h-5 text-indigo-500" />,
      title: 'Display Diagonal',
      value: `${diagonalMeters.toFixed(2)} m (${feet > 0 ? `${feet}′ ` : ''}${inches}″)`,
      bgColor: 'bg-indigo-50',
      textColor: 'text-indigo-700'
    },
    {
      icon: <Zap className="w-5 h-5 text-yellow-500" />,
      title: 'Power (avg)',
      value: `${avgPower} W`,
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      icon: <ZapOff className="w-5 h-5 text-red-500" />,
      title: 'Power (max)',
      value: `${maxPower} W`,
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      icon: <Boxes className="w-5 h-5 text-green-500" />,
      title: 'Pixel Density',
      value: `${pixelDensity} px²/m²`,
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      icon: <Maximize2 className="w-5 h-5 text-cyan-500" />,
      title: 'Total Pixels',
      value: formatIndianNumber(totalPixels),
      bgColor: 'bg-cyan-50',
      textColor: 'text-cyan-700'
    },
    {
      icon: <Boxes className="w-5 h-5 text-pink-500" />, // You can use a different icon if you prefer
      title: 'Processor',
      value: processor || 'N/A',
      bgColor: 'bg-pink-50',
      textColor: 'text-pink-700'
    },
    {
      icon: <Boxes className="w-5 h-5 text-gray-500" />, // You can use a different icon if you prefer
      title: 'Mode',
      value: mode || 'N/A',
      bgColor: 'bg-gray-50',
      textColor: 'text-gray-700'
    }
  ];

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {configItems.map((item, index) => (
          <div 
            key={index}
            className={`${item.bgColor} p-4 rounded-xl transition-all duration-200 hover:shadow-md flex-1 min-w-0`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${item.bgColor} ${item.textColor.replace('700', '500')} bg-opacity-50 flex-shrink-0`}>
                {item.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-gray-500 truncate">{item.title}</h3>
                <p className={`mt-1 text-lg font-semibold ${item.textColor} break-words`}>
                  {item.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4">
        {/* Show only the relevant price for the user type */}
        <div className="flex flex-col gap-1 bg-blue-50 rounded-lg px-4 py-3 mt-2">
          {userType === 'endUser' && (
            <div>
              <span className="font-semibold text-blue-800">End Customer Price:</span>
              <span className="text-blue-900 font-bold text-lg ml-2">
                ₹{
                  selectedProduct && selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.rentalOption && selectedProduct.prices
                    ? selectedProduct.prices[
                        selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet'
                      ][userTypeToPriceKey(currentUserType)]?.toLocaleString('en-IN') || 'N/A'
                    : showPrice('endUser')?.toLocaleString('en-IN') || 'N/A'
                }
                <span className="text-xs text-gray-500 ml-2">
                  {selectedProduct && selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.rentalOption
                    ? `(${selectedProduct.rentalOption === 'curve lock' ? 'Curve Lock' : 'Cabinet'})/ft²`
                    : '/ft²'}
                </span>
              </span>
            </div>
          )}
          {userType === 'siChannel' && (
            <div>
              <span className="font-semibold text-green-800">SI / Channel Price:</span>
              <span className="text-green-900 font-bold text-lg ml-2">
                ₹{
                  selectedProduct && selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.rentalOption && selectedProduct.prices
                    ? selectedProduct.prices[
                        selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet'
                      ][userTypeToPriceKey(currentUserType)]?.toLocaleString('en-IN') || 'N/A'
                    : showPrice('siChannel')?.toLocaleString('en-IN') || 'N/A'
                }
                <span className="text-xs text-gray-500 ml-2">
                  {selectedProduct && selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.rentalOption
                    ? `(${selectedProduct.rentalOption === 'curve lock' ? 'Curve Lock' : 'Cabinet'})/ft²`
                    : '/ft²'}
                </span>
              </span>
            </div>
          )}
          {userType === 'reseller' && (
            <div>
              <span className="font-semibold text-purple-800">Reseller Price:</span>
              <span className="text-purple-900 font-bold text-lg ml-2">
                ₹{
                  selectedProduct && selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.rentalOption && selectedProduct.prices
                    ? selectedProduct.prices[
                        selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet'
                      ][userTypeToPriceKey(currentUserType)]?.toLocaleString('en-IN') || 'N/A'
                    : showPrice('reseller')?.toLocaleString('en-IN') || 'N/A'
                }
                <span className="text-xs text-gray-500 ml-2">
                  {selectedProduct && selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.rentalOption
                    ? `(${selectedProduct.rentalOption === 'curve lock' ? 'Curve Lock' : 'Cabinet'})/ft²`
                    : '/ft²'}
                </span>
              </span>
            </div>
          )}
        </div>
        {/* Show price for rental series */}
        {selectedProduct && selectedProduct.category?.toLowerCase().includes('rental') && selectedProduct.rentalOption && selectedProduct.prices ? (
          (() => {
            // Get price per sq ft for selected rental option and user type
            const rentalOptionKey = selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet';
            const rentalPricePerSqFt = selectedProduct.prices[rentalOptionKey]?.[userTypeToPriceKey(currentUserType)] || 0;
            const rentalSubtotal = displayAreaFeet * rentalPricePerSqFt;
            const rentalTotal = rentalSubtotal + (processorPrice || 0);
            return (
              <div className="flex flex-col gap-1 bg-green-50 rounded-lg px-4 py-3 mt-2">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-green-800">Total Price</span>
                  <span className="text-green-900 font-bold text-lg">
                    ₹{rentalTotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </span>
                </div>
                <div className="text-xs text-green-700 flex flex-col">
                  <span>
                    ( {displayAreaFeet.toFixed(2)} ft² × ₹{rentalPricePerSqFt.toLocaleString('en-IN')}/ft² )
                    {rentalSubtotal > 0 && (
                      <> ₹{rentalSubtotal.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</>
                    )}
                    {processorPrice > 0 && (
                      <> + Processor Price ₹{processorPrice.toLocaleString('en-IN')}</>
                    )}
                    <span className="ml-2 text-gray-500">({selectedProduct.rentalOption === 'curve lock' ? 'Curve Lock' : 'Cabinet'})</span>
                  </span>
                </div>
              </div>
            );
          })()
        ) : pricePerSqFt !== undefined && (
          <div className="flex flex-col gap-1 bg-green-50 rounded-lg px-4 py-3 mt-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-green-800">Total Price</span>
              <span className="text-green-900 font-bold text-lg">
                ₹{totalPriceWithProcessor?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
              </span>
            </div>
            <div className="text-xs text-green-700 flex flex-col">
              <span>
                ( {displayAreaFeet.toFixed(2)} ft² × ₹{pricePerSqFt.toLocaleString('en-IN')}/ft² )
                {totalPrice !== undefined && (
                  <>
                    {' '}₹{totalPrice.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </>
                )}
                {processorPrice > 0 && (
                  <>
                    {' '}+ Processor Price ₹{processorPrice.toLocaleString('en-IN')}
                  </>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
