import React from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { DisplayConfig } from '../types';

interface DimensionControlsProps {
  config: DisplayConfig;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
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
  selectedProduct
}) => {
  // Get cabinet dimensions or use defaults (600x337.5mm)
  const cabinetWidth = selectedProduct?.cabinetDimensions?.width || 600;
  const cabinetHeight = selectedProduct?.cabinetDimensions?.height || 337.5;

  // Convert mm to meters for display
  const toMeters = (mm: number) => (mm / 1000).toFixed(3);
  const toMM = (m: number) => Math.round(m * 1000);
  
  // Step size in meters (100mm)
  const stepSize = 0.1;

  // Adjust value by cabinet size
  const adjustValue = (value: number, increment: number, isWidth: boolean) => {
    const cabinetSize = isWidth ? cabinetWidth : cabinetHeight;
    const currentCabinets = Math.round(value / cabinetSize);
    const newCabinets = Math.max(1, currentCabinets + increment);
    return newCabinets * cabinetSize;
  };

  // Calculate step sizes based on cabinet dimensions
  const widthStep = cabinetWidth / 1000; // Convert mm to meters
  const heightStep = cabinetHeight / 1000; // Convert mm to meters

  // Detect if product is digital standee or jumbo
  const isDigitalStandee = selectedProduct && selectedProduct.category?.toLowerCase().includes('digital standee');
  const isJumbo = selectedProduct && selectedProduct.category?.toLowerCase().includes('jumbo');
  const isFixedGrid = isDigitalStandee || isJumbo;

  return (
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-800">Target Display Size</h3>
        
        {/* Width Control */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Width</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onWidthChange(adjustValue(config.width, -1, true))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isFixedGrid}
            >
              <Minus size={16} />
            </button>
            <div className="flex items-center gap-1 bg-white border rounded-lg px-3 py-2 min-w-[100px]">
              <input
                type="number"
                value={toMeters(config.width)}
                onChange={(e) => onWidthChange(toMM(Number(e.target.value)))}
                className="w-full text-center outline-none"
                step={stepSize}
                min={0.1}
                disabled={isFixedGrid}
              />
              <span className="text-sm text-gray-500">m</span>
            </div>
            <button
              onClick={() => onWidthChange(adjustValue(config.width, 1, true))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isFixedGrid}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        <X size={20} className="text-gray-400" />

        {/* Height Control */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Height</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onHeightChange(adjustValue(config.height, -1, false))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isFixedGrid}
            >
              <Minus size={16} />
            </button>
            <div className="flex items-center gap-1 bg-white border rounded-lg px-3 py-2 min-w-[100px]">
              <input
                type="number"
                value={toMeters(config.height)}
                onChange={(e) => onHeightChange(toMM(Number(e.target.value)))}
                className="w-full text-center outline-none"
                step={stepSize}
                min={0.1}
                disabled={isFixedGrid}
              />
              <span className="text-sm text-gray-500">m</span>
            </div>
            <button
              onClick={() => onHeightChange(adjustValue(config.height, 1, false))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={isFixedGrid}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};