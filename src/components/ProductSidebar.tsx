import React, { useState } from 'react';
import { Product, CabinetGrid } from '../types';

interface ProductSidebarProps {
  selectedProduct: Product | undefined;
  cabinetGrid: CabinetGrid;
  onColumnsChange: (columns: number) => void;
  onRowsChange: (rows: number) => void;
  onSelectProductClick: () => void;
  onControllerChange?: (controller: string) => void;
  onModeChange?: (mode: string) => void;
  onRedundancyChange?: (enabled: boolean) => void;
  redundancyEnabled?: boolean;
  controllerSelection?: {
    selectedController: {
      name: string;
      type: string;
      portCount: number;
      pixelCapacity: number;
    };
    requiredPorts: number;
    dataHubPorts: number;
    backupPorts?: number;
    isRedundancyMode?: boolean;
  };
}

export const ProductSidebar: React.FC<ProductSidebarProps> = ({
  selectedProduct,
  cabinetGrid,
  onColumnsChange,
  onRowsChange,
  onSelectProductClick,
  onControllerChange,
  onModeChange,
  onRedundancyChange,
  redundancyEnabled = false,
  controllerSelection
}) => {
  const [activeTab, setActiveTab] = useState<'dimensions' | 'processing'>('dimensions');
  const [cloudSolution, setCloudSolution] = useState<'Synchronous' | 'Asynchronous' | null>(null);


  // Calculate total pixels (width * height) only if selectedProduct is defined
  const totalPixels = selectedProduct ? (selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows) : 0;
  const totalPixelsMillion = totalPixels / 1_000_000;

  // Use the controller selection from parent if available, otherwise calculate locally
  const selectedController = controllerSelection?.selectedController?.name || '4K PRIME';

  // Mode logic: only TB40 and TB60 allow both modes, others default to Synchronous
  const isSyncAsyncSelectable = selectedController === 'TB40' || selectedController === 'TB60';
  React.useEffect(() => {
    // Always default to Synchronous unless TB40 or TB60 and user has chosen otherwise
    if (!isSyncAsyncSelectable) {
      setCloudSolution('Synchronous');
    }
  }, [selectedController]);

  // Call onModeChange when cloudSolution changes
  React.useEffect(() => {
    if (onModeChange && cloudSolution) onModeChange(cloudSolution);
  }, [cloudSolution]);

  // Helper to check if product is Digital Standee
  const isDigitalStandee = selectedProduct && selectedProduct.category?.toLowerCase().includes('digital standee');
  // Helper to check if product is Jumbo Series
  const isJumbo = selectedProduct && selectedProduct.category?.toLowerCase().includes('jumbo');
  // Helper to get fixed grid for Jumbo
  function getJumboFixedGrid(product: Product | undefined) {
    if (!product) return null;
    if (product.category?.toLowerCase() !== 'jumbo series') return null;
    if (product.name.toLowerCase().includes('p2.5') || product.name.toLowerCase().includes('p4')) {
      return { columns: 7, rows: 9 };
    }
    if (product.name.toLowerCase().includes('p6') || product.name.toLowerCase().includes('p5')) {
      return { columns: 11, rows: 8 };
    }
    return null;
  }
  const jumboGrid = getJumboFixedGrid(selectedProduct);

  // Use fixed grid for display if digital standee or jumbo
  const displayColumns = isDigitalStandee ? 7 : (jumboGrid ? jumboGrid.columns : cabinetGrid.columns);
  const displayRows = isDigitalStandee ? 5 : (jumboGrid ? jumboGrid.rows : cabinetGrid.rows);

  if (!selectedProduct) {
    return (
      <div className="w-full bg-white h-screen overflow-y-auto border-r border-gray-200 p-3 sm:p-4 lg:p-6 flex flex-col items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 mb-3 sm:mb-4 text-xs sm:text-sm lg:text-base">Select a product to begin</p>
          <button
            onClick={onSelectProductClick}
            className="bg-black hover:bg-gray-800 text-white font-bold py-2 px-3 sm:px-4 rounded-lg transition-colors text-xs sm:text-sm lg:text-base"
          >
            Select a Product
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Product Header */}
      <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
        <div className="flex flex-col items-center space-y-2 sm:space-y-3 mb-3 sm:mb-4">
          <div className="w-full bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
            <img 
              src={selectedProduct.image} 
              alt={selectedProduct.name}
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="text-center">
            <h2 className="font-semibold text-gray-900 text-xs sm:text-sm lg:text-base">{selectedProduct.name}</h2>
            <p className="text-xs text-gray-500">
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
            className={`flex-1 py-2 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-center text-xs sm:text-sm font-medium ${
              activeTab === 'dimensions' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Dimensions
          </button>
          <button 
            onClick={() => setActiveTab('processing')}
            className={`flex-1 py-2 sm:py-3 lg:py-4 px-3 sm:px-4 lg:px-6 text-center text-xs sm:text-sm font-medium ${
              activeTab === 'processing' 
                ? 'text-black border-b-2 border-black' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Processor
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 px-3 sm:px-4 lg:px-6 py-2">
        {activeTab === 'dimensions' ? (
          <div className="space-y-3 sm:space-y-4 lg:space-y-6">
            <div>
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 sm:mb-3">Screen Size</h3>
              <div className="space-y-2 sm:space-y-3 lg:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Columns
                  </label>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button 
                      onClick={() => onColumnsChange(Math.max(1, cabinetGrid.columns - 1))}
                      className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                      disabled={isDigitalStandee || isJumbo}
                    >
                      -
                    </button>
                    <div className="flex-1 text-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-50 rounded-lg text-xs sm:text-sm">
                      {displayColumns}
                    </div>
                    <button 
                      onClick={() => onColumnsChange(cabinetGrid.columns + 1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                      disabled={isDigitalStandee || isJumbo}
                    >
                      +
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Rows
                  </label>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <button 
                      onClick={() => onRowsChange(Math.max(1, cabinetGrid.rows - 1))}
                      className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                      disabled={isDigitalStandee || isJumbo}
                    >
                      -
                    </button>
                    <div className="flex-1 text-center px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-50 rounded-lg text-xs sm:text-sm">
                      {displayRows}
                    </div>
                    <button 
                      onClick={() => onRowsChange(cabinetGrid.rows + 1)}
                      className="w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 flex items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-xs sm:text-sm"
                      disabled={isDigitalStandee || isJumbo}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 sm:pt-3 lg:pt-4 border-t border-gray-200">
              <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Configuration</h3>
              <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm text-gray-600">
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
          <div className="space-y-2 sm:space-y-3 lg:space-y-4 pt-2">
            <div className="flex items-center space-x-2 mb-2">
              <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 rounded bg-gray-100 text-black">
                {/* Simple processor icon using SVG */}
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3" stroke="#0284c7" strokeWidth="2"/><rect x="8" y="8" width="8" height="8" rx="1.5" stroke="#0284c7" strokeWidth="2"/></svg>
              </span>
              <span className="font-semibold text-sm sm:text-base lg:text-lg text-gray-900">Processing</span>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 flex items-center">
                Selected Processor
              </label>
              <div className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 font-semibold text-xs sm:text-sm">
                {selectedController}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Pixels: {totalPixels.toLocaleString()} ({totalPixelsMillion.toFixed(2)} million)</div>
            </div>

            {/* Enhanced Controller Information */}
            {controllerSelection && (
              <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                <div className="text-xs text-blue-800 space-y-1">
                  <div><strong>Type:</strong> {controllerSelection.selectedController.type}</div>
                  <div><strong>Ports:</strong> {controllerSelection.requiredPorts} / {controllerSelection.selectedController.portCount}</div>
                  <div><strong>Data Hub Ports:</strong> {controllerSelection.dataHubPorts}</div>
                  {controllerSelection.isRedundancyMode && (
                    <div><strong>Backup Ports:</strong> {controllerSelection.backupPorts}</div>
                  )}
                  <div><strong>Pixel Capacity:</strong> {controllerSelection.selectedController.pixelCapacity.toFixed(1)}M</div>
                </div>
              </div>
            )}
            
            {/* Redundancy Toggle */}
            {onRedundancyChange && (
              <div className="mt-3 sm:mt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">Redundancy</label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={redundancyEnabled} 
                    onChange={(e) => onRedundancyChange(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs sm:text-sm text-gray-700">Enable redundancy mode</span>
                </label>
                <div className="text-xs text-gray-500 mt-1">
                  {redundancyEnabled 
                    ? 'Each data hub port will have a backup port' 
                    : 'Standard single-cable configuration'}
                </div>
              </div>
            )}
            
            {/* Mode Selector - moved below processor */}
            <div className="mt-2 sm:mt-3 lg:mt-4 mb-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">Mode</label>
              <div className="flex space-x-1 sm:space-x-2">
                <button
                  className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border font-medium transition-all text-xs sm:text-sm ${cloudSolution === 'Synchronous' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  onClick={() => isSyncAsyncSelectable && setCloudSolution('Synchronous')}
                  disabled={!isSyncAsyncSelectable}
                >
                  Synchronous
                </button>
                <button
                  className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border font-medium transition-all text-xs sm:text-sm ${cloudSolution === 'Asynchronous' ? 'bg-black text-white border-black' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'}`}
                  onClick={() => isSyncAsyncSelectable && setCloudSolution('Asynchronous')}
                  disabled={!isSyncAsyncSelectable}
                >
                  Asynchronous
                </button>
              </div>
              {!isSyncAsyncSelectable && (
                <div className="text-xs text-gray-500 mt-1">Only Synchronous mode is supported for this processor.</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Get a Quote Button */}
      <div className="p-2 sm:p-3 lg:p-4 border-t border-gray-200">
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-2">Configure your display and click "Get a Quote" in the main panel</p>
        </div>
      </div>
    </div>
  );
};