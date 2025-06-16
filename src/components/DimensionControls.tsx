import React from 'react';
import { Minus, Plus, X } from 'lucide-react';
import { DisplayConfig } from '../types';

interface DimensionControlsProps {
  config: DisplayConfig;
  onWidthChange: (width: number) => void;
  onHeightChange: (height: number) => void;
}

export const DimensionControls: React.FC<DimensionControlsProps> = ({
  config,
  onWidthChange,
  onHeightChange
}) => {
  // Convert mm to meters for display
  const toMeters = (mm: number) => (mm / 1000).toFixed(3);
  const toMM = (m: number) => Math.round(m * 1000);

  // Adjust value in mm, but display in meters
  const adjustValue = (value: number, increment: number) => {
    // Convert increment to mm (0.1m = 100mm)
    const incrementMM = increment * 1000;
    return Math.max(100, value + incrementMM);
  };

  // Step size in meters (0.1m = 100mm)
  const stepSize = 0.1;

  return (
    <div className="flex items-center gap-8">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-semibold text-gray-800">Target Display Size</h3>
        
        {/* Width Control */}
        <div className="flex flex-col items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Width</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onWidthChange(adjustValue(config.width, -stepSize))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
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
              />
              <span className="text-sm text-gray-500">m</span>
            </div>
            <button
              onClick={() => onWidthChange(adjustValue(config.width, stepSize))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
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
              onClick={() => onHeightChange(adjustValue(config.height, -stepSize))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={config.aspectRatio !== 'None'}
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
                disabled={config.aspectRatio !== 'None'}
              />
              <span className="text-sm text-gray-500">m</span>
            </div>
            <button
              onClick={() => onHeightChange(adjustValue(config.height, stepSize))}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
              disabled={config.aspectRatio !== 'None'}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};