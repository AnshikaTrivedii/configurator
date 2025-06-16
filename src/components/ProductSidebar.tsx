import React, { useState } from 'react';
import { Product, CabinetGrid } from '../types';
import { ChevronDown } from 'lucide-react';

interface ProductSidebarProps {
  selectedProduct: Product | undefined;
  cabinetGrid: CabinetGrid;
  onColumnsChange: (columns: number) => void;
  onRowsChange: (rows: number) => void;
}

export const ProductSidebar: React.FC<ProductSidebarProps> = ({
  selectedProduct,
  cabinetGrid,
  onColumnsChange,
  onRowsChange,
}) => {
  const [activeTab, setActiveTab] = useState<'dimensions' | 'power'>('dimensions');
  const [voltage, setVoltage] = useState<number>(220);
  const [amperage, setAmperage] = useState<number>(16);
  
  const VOLTAGE_OPTIONS = [110, 120, 208, 220, 230, 240];
  const AMPERAGE_OPTIONS = [15, 16, 20];
  if (!selectedProduct) {
    return (
      <div className="w-80 bg-white h-screen overflow-y-auto border-r border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Select a product to configure</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white h-screen overflow-y-auto border-r border-gray-200 flex flex-col">
      {/* Product Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            <img 
              src={selectedProduct.image} 
              alt={selectedProduct.name}
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">{selectedProduct.name}</h2>
            <p className="text-sm text-gray-500">
              Pixel Pitch: {selectedProduct.pixelPitch}mm
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button 
            onClick={() => setActiveTab('dimensions')}
            className={`flex-1 py-4 px-6 text-center text-sm font-medium ${
              activeTab === 'dimensions' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dimensions
          </button>
          <button 
            onClick={() => setActiveTab('power')}
            className={`flex-1 py-4 px-6 text-center text-sm font-medium ${
              activeTab === 'power' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Power
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'dimensions' ? (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Screen Size</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Columns
                  </label>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => onColumnsChange(Math.max(1, cabinetGrid.columns - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center px-4 py-2 bg-gray-50 rounded-lg">
                      {cabinetGrid.columns}
                    </div>
                    <button 
                      onClick={() => onColumnsChange(cabinetGrid.columns + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rows
                  </label>
                  <div className="flex items-center space-x-2">
                    <button 
                      onClick={() => onRowsChange(Math.max(1, cabinetGrid.rows - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center px-4 py-2 bg-gray-50 rounded-lg">
                      {cabinetGrid.rows}
                    </div>
                    <button 
                      onClick={() => onRowsChange(cabinetGrid.rows + 1)}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Configuration</h3>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Total Cabinets:</span>
                  <span className="font-medium text-gray-900">{cabinetGrid.columns * cabinetGrid.rows}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Width:</span>
                  <span className="font-medium text-gray-900">
                    {(cabinetGrid.totalWidth / 1000).toFixed(2)} m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Height:</span>
                  <span className="font-medium text-gray-900">
                    {(cabinetGrid.totalHeight / 1000).toFixed(2)} m
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Power Configuration</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Voltage (V)
                  </label>
                  <div className="relative">
                    <select
                      value={voltage}
                      onChange={(e) => setVoltage(Number(e.target.value))}
                      className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white border"
                    >
                      {VOLTAGE_OPTIONS.map((value) => (
                        <option key={`voltage-${value}`} value={value}>
                          {value} V
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amperage (A)
                  </label>
                  <div className="relative">
                    <select
                      value={amperage}
                      onChange={(e) => setAmperage(Number(e.target.value))}
                      className="w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-lg bg-white border"
                    >
                      {AMPERAGE_OPTIONS.map((value) => (
                        <option key={`amperage-${value}`} value={value}>
                          {value} A
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-200 mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Power Summary</h3>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Voltage:</span>
                      <span className="font-medium text-gray-900">{voltage} V</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Amperage:</span>
                      <span className="font-medium text-gray-900">{amperage} A</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max Power:</span>
                      <span className="font-medium text-gray-900">
                        {((voltage * amperage) / 1000).toFixed(1)} kW
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
