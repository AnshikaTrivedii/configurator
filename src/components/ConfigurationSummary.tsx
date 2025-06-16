import React from 'react';
import { DisplayConfig, Product, CabinetGrid } from '../types';

interface ConfigurationSummaryProps {
  config: DisplayConfig;
  cabinetGrid: CabinetGrid;
  selectedProduct?: Product;
}

export const ConfigurationSummary: React.FC<ConfigurationSummaryProps> = ({
  config,
  cabinetGrid,
  selectedProduct
}) => {
  if (!selectedProduct) return null;

  // Convert mm to meters with 3 decimal places
  const toMeters = (mm: number) => (mm / 1000).toFixed(3);
  
  // Calculate display area in square meters
  const displayArea = (config.width * config.height) / 1000000; // mm² to m²
  
  // Calculate diagonal in meters
  const diagonalMeters = Math.sqrt(Math.pow(config.width/1000, 2) + Math.pow(config.height/1000, 2));
  
  // Convert meters to inches for diagonal
  const diagonalInches = diagonalMeters * 39.3701;
  const feet = Math.floor(diagonalInches / 12);
  const inches = Math.round((diagonalInches % 12) * 16) / 16; // Round to nearest 1/16 inch
  
  // Calculate power consumption
  const powerPerCabinet = selectedProduct.powerDraw || 91.7; // Default to 91.7W if not specified
  const avgPower = (powerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(1);
  const maxPower = (powerPerCabinet * 3 * cabinetGrid.columns * cabinetGrid.rows).toFixed(1); // Assuming 3x max power

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-gray-500">Size (w × h)</h3>
        <p className="mt-1 text-lg font-medium">
          {toMeters(config.width)} m × {toMeters(config.height)} m
        </p>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-500">Resolution</h3>
        <p className="mt-1 text-lg font-medium">
          {selectedProduct.resolution.width * cabinetGrid.columns} px × {selectedProduct.resolution.height * cabinetGrid.rows} px
        </p>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-500">Number of Cabinets (w × h)</h3>
        <p className="mt-1 text-lg font-medium">
          {cabinetGrid.columns * cabinetGrid.rows} ({cabinetGrid.columns} × {cabinetGrid.rows})
        </p>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-500">Aspect Ratio</h3>
        <p className="mt-1 text-lg font-medium">
          {Math.round((config.width / config.height) * 9)}:9
        </p>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-500">Visible Display Area</h3>
        <p className="mt-1 text-lg font-medium">
          {displayArea.toFixed(2)} m²
        </p>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-500">Visible Display Diagonal</h3>
        <p className="mt-1 text-lg font-medium">
          {diagonalMeters.toFixed(3)} m ({feet > 0 ? `${feet}′ ` : ''}{inches}″)
        </p>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-500">Power Consumption (avg.)</h3>
        <p className="mt-1 text-lg font-medium">
          {avgPower} W
        </p>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-500">Power Consumption (max.)</h3>
        <p className="mt-1 text-lg font-medium">
          {maxPower} W
        </p>
      </div>
    </div>
  );
};
