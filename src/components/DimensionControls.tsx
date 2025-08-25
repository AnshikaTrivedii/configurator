import React from 'react';
import { Minus, Plus, X, ChevronDown } from 'lucide-react';
import { DisplayConfig } from '../types';

interface DimensionControlsProps {
  config: DisplayConfig;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onUnitChange: (unit: 'm' | 'ft') => void;
  selectedProduct?: {
    cabinetDimensions: {
      width: number;
      height: number;
    };
  };
}

export const DimensionControls: React.FC<DimensionControlsProps> = ({
  config,
  onWidthChange,
  onHeightChange,
  onUnitChange,
  selectedProduct
}) => {
  // Get cabinet dimensions or use defaults (600x337.5mm)
  const cabinetWidth = selectedProduct?.cabinetDimensions?.width || 600;
  const cabinetHeight = selectedProduct?.cabinetDimensions?.height || 337.5;

  // Conversion constants
  const METERS_TO_FEET = 3.2808399;
  const FEET_TO_METERS = 1 / METERS_TO_FEET;

  // Convert mm to display unit
  const toDisplayUnit = (mm: number, unit: 'm' | 'ft') => {
    const meters = mm / 1000;
    if (unit === 'ft') {
      return (meters * METERS_TO_FEET).toFixed(2);
    }
    return meters.toFixed(2);
  };

  // Convert display unit to mm
  const fromDisplayUnit = (value: number, unit: 'm' | 'ft') => {
    let meters = value;
    if (unit === 'ft') {
      meters = value * FEET_TO_METERS;
    }
    return Math.round(meters * 1000);
  };
  
  // Step size in display unit
  const stepSize = config.unit === 'ft' ? 0.33 : 0.1; // ~1ft or 0.1m

  // Adjust value by cabinet size
  const adjustValue = (value: number, increment: number, isWidth: boolean) => {
    const cabinetSize = isWidth ? cabinetWidth : cabinetHeight;
    const currentCabinets = Math.round(value / cabinetSize);
    const newCabinets = Math.max(1, currentCabinets + increment);
    return newCabinets * cabinetSize;
  };



  // Detect if product is digital standee or jumbo
  const isDigitalStandee = selectedProduct && selectedProduct.category?.toLowerCase().includes('digital standee');
  const isJumbo = selectedProduct && selectedProduct.category?.toLowerCase().includes('jumbo');
  const isFixedGrid = isDigitalStandee || isJumbo;

  return (
    <div className="flex flex-col lg:flex-row items-start lg:items-center gap-3 sm:gap-4 lg:gap-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full lg:w-auto">
        <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-800">Target Display Size</h3>
        
        {/* Unit Selection Dropdown */}
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <label className="text-xs sm:text-sm font-medium text-gray-600">Unit</label>
          <div className="relative">
            <select
              value={config.unit}
              onChange={(e) => onUnitChange(e.target.value as 'm' | 'ft')}
              className="appearance-none bg-white border rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 pr-6 sm:pr-8 text-xs sm:text-sm lg:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isFixedGrid}
            >
              <option value="m">Meters (m)</option>
              <option value="ft">Feet (ft)</option>
            </select>
            <ChevronDown className="absolute right-1 sm:right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3 sm:w-4 sm:h-4 pointer-events-none" />
          </div>
        </div>
        
        {/* Width Control */}
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <label className="text-xs sm:text-sm font-medium text-gray-600">Width</label>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onWidthChange(adjustValue(config.width, -1, true))}
              className="p-1 sm:p-1.5 lg:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isFixedGrid}
            >
              <Minus size={12} className="sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
            </button>
            <div className="flex items-center gap-1 bg-white border rounded-lg px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 min-w-[60px] sm:min-w-[80px] lg:min-w-[100px]">
              <input
                type="number"
                value={toDisplayUnit(config.width, config.unit)}
                onChange={(e) => onWidthChange(fromDisplayUnit(Number(e.target.value), config.unit))}
                className="w-full text-center outline-none text-xs sm:text-sm lg:text-base"
                step={stepSize}
                min={0.1}
                disabled={isFixedGrid}
              />
              <span className="text-xs sm:text-sm text-gray-500">{config.unit}</span>
            </div>
            <button
              onClick={() => onWidthChange(adjustValue(config.width, 1, true))}
              className="p-1 sm:p-1.5 lg:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isFixedGrid}
            >
              <Plus size={12} className="sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>

        <X size={14} className="text-gray-400 hidden sm:block" />

        {/* Height Control */}
        <div className="flex flex-col items-center gap-1 sm:gap-2">
          <label className="text-xs sm:text-sm font-medium text-gray-600">Height</label>
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onHeightChange(adjustValue(config.height, -1, false))}
              className="p-1 sm:p-1.5 lg:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isFixedGrid}
            >
              <Minus size={12} className="sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
            </button>
            <div className="flex items-center gap-1 bg-white border rounded-lg px-1.5 sm:px-2 lg:px-3 py-1 sm:py-1.5 lg:py-2 min-w-[60px] sm:min-w-[80px] lg:min-w-[100px]">
              <input
                type="number"
                value={toDisplayUnit(config.height, config.unit)}
                onChange={(e) => onHeightChange(fromDisplayUnit(Number(e.target.value), config.unit))}
                className="w-full text-center outline-none text-xs sm:text-sm lg:text-base"
                step={stepSize}
                min={0.1}
                disabled={isFixedGrid}
              />
              <span className="text-xs sm:text-sm text-gray-500">{config.unit}</span>
            </div>
            <button
              onClick={() => onHeightChange(adjustValue(config.height, 1, false))}
              className="p-1 sm:p-1.5 lg:p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isFixedGrid}
            >
              <Plus size={12} className="sm:w-3 sm:h-3 lg:w-4 lg:h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};