import React from 'react';
import { DisplayConfig, Product, CabinetGrid } from '../types';

interface DisplayPreviewProps {
  config: DisplayConfig;
  displayDimensions: {
    width: number;
    height: number;
    actualRatio: number;
  };
  selectedProduct?: Product;
  cabinetGrid: CabinetGrid;
}

export const DisplayPreview: React.FC<DisplayPreviewProps> = ({
  config,
  displayDimensions,
  selectedProduct,
  cabinetGrid
}) => {
  const getAspectRatioLabel = () => {
    const ratio = displayDimensions.actualRatio;
    if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
    if (Math.abs(ratio - 21/9) < 0.01) return '21:9';
    if (Math.abs(ratio - 32/9) < 0.01) return '32:9';
    return `${ratio.toFixed(2)}:1`;
  };

  const renderCabinetGrid = () => {
    const cabinets = [];
    const cabinetWidth = displayDimensions.width / cabinetGrid.columns;
    const cabinetHeight = displayDimensions.height / cabinetGrid.rows;

    for (let row = 0; row < cabinetGrid.rows; row++) {
      for (let col = 0; col < cabinetGrid.columns; col++) {
        cabinets.push(
          <div
            key={`${row}-${col}`}
            className="absolute border border-gray-400 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center"
            style={{
              left: `${col * cabinetWidth}px`,
              top: `${row * cabinetHeight}px`,
              width: `${cabinetWidth}px`,
              height: `${cabinetHeight}px`
            }}
          >
            {/* Cabinet content */}
            <div className="text-white text-center text-xs opacity-80">
              <div className="font-semibold">
                {selectedProduct ? selectedProduct.name.split(' ')[0] : 'Cabinet'}
              </div>
              <div className="text-[10px]">
                {col + 1},{row + 1}
              </div>
            </div>
            
            {/* Cabinet border indicators */}
            <div className="absolute inset-0 border border-white opacity-30"></div>
          </div>
        );
      }
    }
    return cabinets;
  };

  // Convert current unit to meters
  const toMeters = (value: number): string => {
    switch (config.unit) {
      case 'mm':
        return (value / 1000).toFixed(3);
      case 'px':
        // Assuming 96 DPI for pixel to meter conversion
        return (value * 0.0254 / 96).toFixed(3);
      case 'ft':
        return (value * 0.3048).toFixed(3);
      default: // meters
        return value.toFixed(3);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6 py-8">
      {/* Top measurement */}
      <div className="flex items-center space-x-2">
        <div className="h-px bg-gray-300 w-8"></div>
        <span className="text-sm text-gray-600 font-medium">{toMeters(config.width)} m</span>
        <div className="h-px bg-gray-300 w-8"></div>
      </div>

      {/* Display preview container */}
      <div className="relative flex items-center">
        {/* Left measurement */}
        <div className="flex flex-col items-center mr-4">
          <div className="w-px bg-gray-300 h-8"></div>
          <span className="text-sm text-gray-600 font-medium transform -rotate-90 whitespace-nowrap">
            {toMeters(config.height)} m
          </span>
          <div className="w-px bg-gray-300 h-8"></div>
        </div>

        {/* Display screen with cabinet grid */}
        <div 
          className="relative border-2 border-dashed border-gray-400 shadow-xl overflow-hidden transition-all duration-300 ease-in-out"
          style={{
            width: `${displayDimensions.width}px`,
            height: `${displayDimensions.height}px`
          }}
        >
          {/* Cabinet grid */}
          {renderCabinetGrid()}

          {/* Overlay information */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-black bg-opacity-60 text-white p-4 rounded-lg backdrop-blur-sm text-center">
              <h3 className="text-lg font-bold mb-1">
                {cabinetGrid.columns} × {cabinetGrid.rows} Grid
              </h3>
              <p className="text-sm">
                {cabinetGrid.columns * cabinetGrid.rows} Cabinets Total
              </p>
              {selectedProduct && (
                <p className="text-xs mt-1 opacity-90">
                  {selectedProduct.cabinetDimensions.width}×{selectedProduct.cabinetDimensions.height}mm each
                </p>
              )}
            </div>
          </div>

          {/* Corner indicators */}
          <div className="absolute top-1 left-1 w-3 h-3 border-t-2 border-l-2 border-white opacity-60"></div>
          <div className="absolute top-1 right-1 w-3 h-3 border-t-2 border-r-2 border-white opacity-60"></div>
          <div className="absolute bottom-1 left-1 w-3 h-3 border-b-2 border-l-2 border-white opacity-60"></div>
          <div className="absolute bottom-1 right-1 w-3 h-3 border-b-2 border-r-2 border-white opacity-60"></div>
        </div>

        {/* Right measurement */}
        <div className="flex flex-col items-center ml-4">
          <div className="w-px bg-gray-300 h-8"></div>
          <span className="text-sm text-gray-600 font-medium transform rotate-90 whitespace-nowrap">
            {toMeters(config.height)} m
          </span>
          <div className="w-px bg-gray-300 h-8"></div>
        </div>
      </div>

      {/* Bottom measurement and aspect ratio */}
      <div className="text-center space-y-2">
        <div className="flex items-center space-x-2">
          <div className="h-px bg-gray-300 w-8"></div>
          <span className="text-sm text-gray-600 font-medium">{toMeters(config.width)} m</span>
          <div className="h-px bg-gray-300 w-8"></div>
        </div>
        <div className="text-lg font-semibold text-gray-700">
          {getAspectRatioLabel()}
        </div>
        <div className="text-sm text-gray-600">
          Actual: {cabinetGrid.totalWidth} × {cabinetGrid.totalHeight} {config.unit}
        </div>
      </div>
    </div>
  );
};