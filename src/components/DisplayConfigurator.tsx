import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { useDisplayCalculations } from '../hooks/useDisplayCalculations';
import { DimensionControls } from './DimensionControls';
import { AspectRatioSelector } from './AspectRatioSelector';
import { DisplayPreview } from './DisplayPreview';
import { ProductSelector } from './ProductSelector';
import { Product } from '../types';

export const DisplayConfigurator: React.FC = () => {
  const {
    config,
    aspectRatios,
    updateWidth,
    updateHeight,
    updateAspectRatio,
    displayDimensions,
    calculateCabinetGrid
  } = useDisplayCalculations();

  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();

  const cabinetGrid = calculateCabinetGrid(selectedProduct);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    // Update display dimensions to match cabinet grid
    const { totalWidth, totalHeight } = calculateCabinetGrid(product);
    updateWidth(totalWidth);
    updateHeight(totalHeight);
  };

  // Update display when product changes
  useEffect(() => {
    if (selectedProduct) {
      const grid = calculateCabinetGrid(selectedProduct);
      updateWidth(grid.totalWidth);
      updateHeight(grid.totalHeight);
    }
  }, [selectedProduct]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Setup Display Dimensions</h1>
          <p className="text-gray-600 mt-2">Configure your digital signage display using modular cabinets</p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Controls */}
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="space-y-6">
              <DimensionControls
                config={config}
                onWidthChange={updateWidth}
                onHeightChange={updateHeight}
              />
              
              <AspectRatioSelector
                aspectRatios={aspectRatios}
                selectedRatio={config.aspectRatio}
                onRatioChange={updateAspectRatio}
              />
            </div>
          </div>

          {/* Preview */}
          <div className="bg-white rounded-xl shadow-sm border">
            <DisplayPreview
              config={config}
              displayDimensions={displayDimensions}
              selectedProduct={selectedProduct}
              cabinetGrid={cabinetGrid}
            />
          </div>

          {/* Product Selection */}
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Package className="text-blue-500" size={24} />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Selected Cabinet Product</h3>
                  <p className="text-gray-600">
                    {selectedProduct ? selectedProduct.name : 'No cabinet product selected'}
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setIsProductSelectorOpen(true)}
                className="bg-gray-900 text-white px-8 py-3 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
              >
                <Package size={20} />
                <span>Select Cabinet</span>
              </button>
            </div>

            {selectedProduct && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900">Category</h4>
                    <p className="text-gray-600">{selectedProduct.category}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Cabinet Size</h4>
                    <p className="text-gray-600">
                      {selectedProduct.cabinetDimensions.width} × {selectedProduct.cabinetDimensions.height} mm
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Resolution</h4>
                    <p className="text-gray-600">
                      {selectedProduct.resolution.width} × {selectedProduct.resolution.height}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Price per Cabinet</h4>
                    <p className="text-gray-600">
                      {selectedProduct.price ? `$${selectedProduct.price}` : 'Contact for pricing'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Total Cabinets</h4>
                    <p className="text-gray-600">{cabinetGrid.columns * cabinetGrid.rows} units</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl shadow-sm border p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Target Size</h4>
                <p className="text-blue-700">
                  {config.width} × {config.height} {config.unit}
                </p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900">Actual Size</h4>
                <p className="text-green-700">
                  {cabinetGrid.totalWidth} × {cabinetGrid.totalHeight} {config.unit}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900">Cabinet Grid</h4>
                <p className="text-purple-700">
                  {cabinetGrid.columns} × {cabinetGrid.rows} ({cabinetGrid.columns * cabinetGrid.rows} total)
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-orange-900">Total Cost</h4>
                <p className="text-orange-700">
                  {selectedProduct?.price 
                    ? `$${(selectedProduct.price * cabinetGrid.columns * cabinetGrid.rows).toLocaleString()}`
                    : 'Select cabinet for pricing'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Selector Modal */}
      <ProductSelector
        isOpen={isProductSelectorOpen}
        onClose={() => setIsProductSelectorOpen(false)}
        onSelectProduct={handleProductSelect}
        selectedProduct={selectedProduct}
      />
    </div>
  );
};