import React from 'react';
import { Minus, Plus, X, ChevronDown, AlertCircle } from 'lucide-react';
import { DisplayConfig, Product } from '../types';
import { validateDimensions, hasDimensionConstraints } from '../utils/dimensionConstraints';

interface DimensionControlsProps {
  config: DisplayConfig;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
  onUnitChange: (unit: 'm' | 'ft') => void;
  selectedProduct?: Product | null;
}

export const DimensionControls: React.FC<DimensionControlsProps> = ({
  config,
  onWidthChange,
  onHeightChange,
  onUnitChange,
  selectedProduct
}) => {

  const c = selectedProduct?.dimensionConstraints;
  const cabinetWidth = c ? c.moduleWidth : (selectedProduct?.cabinetDimensions?.width ?? 600);
  const cabinetHeight = c ? c.moduleHeight : (selectedProduct?.cabinetDimensions?.height ?? 337.5);

  const METERS_TO_FEET = 3.2808399;
  const FEET_TO_METERS = 1 / METERS_TO_FEET;
  const FEET_TO_MM = 304.8; // Exact: 1 ft = 304.8 mm
  const MM_TO_FEET = 1 / FEET_TO_MM;

  const toDisplayUnit = (mm: number, unit: 'm' | 'ft') => {
    if (unit === 'ft') {
      const feet = mm * MM_TO_FEET;
      if (hasConstraints) {
        return (Math.floor(feet * 100) / 100).toFixed(2);
      }
      return feet.toFixed(2);
    }
    const meters = mm / 1000;
    return meters.toFixed(2);
  };

  const fromDisplayUnit = (value: number, unit: 'm' | 'ft') => {
    if (unit === 'ft') {
      return value * FEET_TO_MM;
    }
    return value * 1000;
  };

  const stepSize = config.unit === 'ft' ? 0.33 : 0.1; // ~1ft or 0.1m

  const minWidthDisplay = c ? (config.unit === 'ft' ? c.minWidth * MM_TO_FEET : c.minWidth / 1000) : 0.1;
  const maxWidthDisplay = c
    ? config.unit === 'ft'
      ? Math.floor(c.maxWidth * MM_TO_FEET * 100) / 100
      : c.maxWidth / 1000
    : 100;
  const minHeightDisplay = c ? (config.unit === 'ft' ? c.minHeight * MM_TO_FEET : c.minHeight / 1000) : 0.1;
  const maxHeightDisplay = c
    ? config.unit === 'ft'
      ? Math.floor(c.maxHeight * MM_TO_FEET * 100) / 100
      : c.maxHeight / 1000
    : 100;

  const adjustValue = (value: number, increment: number, isWidth: boolean) => {
    const cabinetSize = isWidth ? cabinetWidth : cabinetHeight;
    const currentCabinets = Math.round(value / cabinetSize);
    const newCabinets = Math.max(1, currentCabinets + increment);
    let result = newCabinets * cabinetSize;
    if (c && isWidth) result = Math.min(c.maxWidth, Math.max(c.minWidth, result));
    if (c && !isWidth) result = Math.min(c.maxHeight, Math.max(c.minHeight, result));
    return result;
  };

  const isDigitalStandee = selectedProduct && selectedProduct.category?.toLowerCase().includes('digital standee');
  const isJumbo = selectedProduct && selectedProduct.category?.toLowerCase().includes('jumbo');
  const hasConstraints = selectedProduct ? hasDimensionConstraints(selectedProduct) : false;
  const isFixedGrid = isDigitalStandee || (isJumbo && !hasConstraints);

  const dimensionValidation = selectedProduct
    ? validateDimensions(selectedProduct, config.width, config.height)
    : { valid: true, message: null as string | null };
  const showDimensionError = hasConstraints && !dimensionValidation.valid && dimensionValidation.message;

  return (
    <div className="flex flex-col gap-2">
    {showDimensionError && (
      <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-amber-800 text-xs sm:text-sm">
        <AlertCircle className="flex-shrink-0 w-4 h-4 mt-0.5" />
        <span>{dimensionValidation.message}</span>
      </div>
    )}
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
                min={hasConstraints ? minWidthDisplay : 0.1}
                max={hasConstraints ? maxWidthDisplay : undefined}
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
                min={hasConstraints ? minHeightDisplay : 0.1}
                max={hasConstraints ? maxHeightDisplay : undefined}
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
    </div>
  );
};