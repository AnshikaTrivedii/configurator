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
  const adjustValue = (value: number, increment: number) => {
    return Math.max(100, Number((value + increment).toFixed(0))); // Minimum 100mm
  };

  const stepSize = config.unit === 'mm' ? 50 : 0.1; // 50mm steps for mm, 0.1 for other units

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
                value={config.width}
                onChange={(e) => onWidthChange(Number(e.target.value) || 100)}
                className="w-full text-center outline-none"
                step={0.001}
                min={0.1}
              />
              <span className="text-sm text-gray-500">{config.unit}</span>
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
                value={Math.round(config.height)}
                onChange={(e) => onHeightChange(Number(e.target.value) || 100)}
                className="w-full text-center outline-none"
                step={stepSize}
                min={100}
                disabled={config.aspectRatio !== 'None'}
              />
              <span className="text-sm text-gray-500">{config.unit}</span>
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