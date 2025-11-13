import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { Product } from '../types';
import { getViewingDistanceRange, getViewingDistanceOptionsByUnit, getPixelPitchesForViewingDistanceRange } from '../utils/viewingDistanceRanges';

interface ProductWithOptionalSize extends Product {
  sizeInInches?: {
    width: string;
    height: string;
  };
}
import { products, categories } from '../data/products';

interface ProductSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  selectedProduct?: Product;
}

export const ProductSelector: React.FC<ProductSelectorProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  selectedProduct
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedFilter, setSelectedFilter] = useState<'All' | 'Indoor' | 'Outdoor'>('All');
  const [indoorType, setIndoorType] = useState<'All' | 'SMD' | 'COB'>('All');
  const [pendingRentalProduct, setPendingRentalProduct] = useState<ProductWithOptionalSize | null>(null);
  const [rentalOption, setRentalOption] = useState<'cabinet' | 'curve lock' | null>(null);
  
  // Viewing distance filter state
  const [viewingDistanceUnit, setViewingDistanceUnit] = useState<'meters' | 'feet'>('meters');
  const [viewingDistanceValue, setViewingDistanceValue] = useState<string>('');

  // Clear viewing distance when selected product changes
  useEffect(() => {
    setViewingDistanceValue('');
  }, [selectedProduct]);

  // Normalize environment for comparison
  const normalizeEnv = (env: string) => env.trim().toLowerCase();
  const normalizeType = (type: string | undefined) => (type || '').toLowerCase();

  // Helper to check SMD/COB type
  const getProductType = (product: Product) => {
    // Check ledType property
    if (product.ledType) {
      if (normalizeType(product.ledType).includes('cob')) return 'COB';
      if (normalizeType(product.ledType).includes('smd')) return 'SMD';
    }
    // Check pixelComposition property (for transparent series and similar)
    if (product.pixelComposition) {
      if (normalizeType(product.pixelComposition).includes('cob')) return 'COB';
      if (normalizeType(product.pixelComposition).includes('smd')) return 'SMD';
    }
    // Check product name
    if (product.name.toLowerCase().includes('cob')) return 'COB';
    if (product.name.toLowerCase().includes('smd')) return 'SMD';
    return undefined;
  };

  // Helper to check if product is rental series
  const isRentalSeries = (product: Product) =>
    product.category && product.category.toLowerCase().includes('rental');

  // Filter products based on selected filter
  let filteredProducts = products;
  
  if (selectedFilter === 'Indoor') {
    filteredProducts = filteredProducts.filter(
      (p) => normalizeEnv(p.environment) === 'indoor'
    );
  } else if (selectedFilter === 'Outdoor') {
    filteredProducts = filteredProducts.filter(
      (p) => normalizeEnv(p.environment) === 'outdoor'
    );
  }
  // If selectedFilter is 'All', show all products (no filtering needed)

  // Apply indoor type filter only when Indoor is selected
  if (selectedFilter === 'Indoor' && indoorType !== 'All') {
    filteredProducts = filteredProducts.filter(
      (p) => getProductType(p) === indoorType
    );
  }

  // Apply category filter
  filteredProducts = filteredProducts.filter(
    (p) => selectedCategory === 'All' || p.category === selectedCategory
  );

          // Apply viewing distance filter
          if (viewingDistanceValue) {
            // Get pixel pitches that match the selected viewing distance range
            const matchingPixelPitches = getPixelPitchesForViewingDistanceRange(viewingDistanceValue, viewingDistanceUnit);
            
            filteredProducts = filteredProducts.filter((p) => {
              // Check if the product's pixel pitch matches any of the matching pixel pitches
              return matchingPixelPitches.some(pitch => Math.abs(p.pixelPitch - pitch) < 0.1);
            });
          }

  // Deduplicate products by id
  filteredProducts = filteredProducts.filter((p, i, arr) => arr.findIndex(x => x.id === p.id) === i);

  // Sort products by pixel pitch in ascending order (lowest to highest)
  filteredProducts = filteredProducts.sort((a, b) => a.pixelPitch - b.pixelPitch);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl sm:max-w-5xl lg:max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 lg:p-6 border-b">
          <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Select Product</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter system */}
        <div className="p-3 sm:p-4 lg:p-6 border-b bg-gray-50">
          <div className="flex flex-col gap-2 sm:gap-3 lg:gap-4">
            {/* Main filter (All, Indoor, Outdoor) */}
            <div className="flex flex-wrap gap-1 sm:gap-2 lg:gap-4 items-center">
              <span className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base">Filter:</span>
              <button
                onClick={() => { setSelectedFilter('All'); setIndoorType('All'); }}
                className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm ${
                  selectedFilter === 'All'
                    ? 'bg-black text-white border-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setSelectedFilter('Indoor'); setIndoorType('All'); }}
                className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm ${
                  selectedFilter === 'Indoor'
                    ? 'bg-black text-white border-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                Indoor
              </button>
              <button
                onClick={() => { setSelectedFilter('Outdoor'); setIndoorType('All'); }}
                className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm ${
                  selectedFilter === 'Outdoor'
                    ? 'bg-black text-white border-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                Outdoor
              </button>
            </div>

            {/* Indoor type filter (SMD/COB) - only show when Indoor is selected */}
            {selectedFilter === 'Indoor' && (
              <div className="flex flex-wrap gap-1 sm:gap-2 lg:gap-4 items-center">
                <span className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base">Type:</span>
                <button
                  onClick={() => setIndoorType('All')}
                  className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm ${
                    indoorType === 'All'
                      ? 'bg-black text-white border-black'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setIndoorType('SMD')}
                  className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm ${
                    indoorType === 'SMD'
                      ? 'bg-black text-white border-black'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  SMD
                </button>
                <button
                  onClick={() => setIndoorType('COB')}
                  className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm ${
                    indoorType === 'COB'
                      ? 'bg-black text-white border-black'
                      : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                  }`}
                >
                  COB
                </button>
              </div>
            )}

            {/* Outdoor info message */}
            {selectedFilter === 'Outdoor' && (
              <div className="text-black font-medium text-xs sm:text-sm">
                All outdoor products are SMD.
              </div>
            )}

                      {/* Viewing Distance Filter */}
                      <div className="flex flex-wrap gap-1 sm:gap-2 lg:gap-4 items-center">
                        <span className="font-medium text-gray-700 text-xs sm:text-sm lg:text-base">Viewing Distance:</span>
                        <div className="flex items-center gap-2">
                          {/* Unit Selector */}
                          <select
                            value={viewingDistanceUnit}
                            onChange={(e) => {
                              setViewingDistanceUnit(e.target.value as 'meters' | 'feet');
                              setViewingDistanceValue(''); // Clear distance when unit changes
                            }}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="meters">Meter</option>
                            <option value="feet">Feet</option>
                          </select>
                          
                          {/* Distance Selector */}
                          <select
                            value={viewingDistanceValue}
                            onChange={(e) => setViewingDistanceValue(e.target.value)}
                            className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-48"
                          >
                            <option value="">Select distance...</option>
                            {getViewingDistanceOptionsByUnit(viewingDistanceUnit).map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          
                          {(viewingDistanceValue || viewingDistanceUnit !== 'meters') && (
                            <button
                              onClick={() => {
                                setViewingDistanceValue('');
                                setViewingDistanceUnit('meters');
                              }}
                              className="px-2 py-1.5 text-xs sm:text-sm text-gray-500 hover:text-gray-700 transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        {viewingDistanceValue && (
                          <div className="text-xs text-gray-600 mt-1">
                            Filtering products for {viewingDistanceValue}{viewingDistanceUnit === 'meters' ? 'm' : 'ft'} viewing distance range
                          </div>
                        )}
                      </div>
          </div>
        </div>

        {/* Category filter */}
        <div className="p-3 sm:p-4 lg:p-6 border-b bg-gray-50">
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm ${
                selectedCategory === 'All'
                  ? 'bg-black text-white border-black'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg border transition-all text-xs sm:text-sm ${
                  selectedCategory === category
                    ? 'bg-black text-white border-black'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="p-3 sm:p-4 lg:p-6">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500 text-lg font-medium mb-2">
                No products available for this viewing distance
              </div>
              <div className="text-gray-400 text-sm">
                Try adjusting your viewing distance or other filters
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
              {filteredProducts.map((product: ProductWithOptionalSize) => (
              <div
                key={product.id}
                className={`relative bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  selectedProduct?.id === product.id
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  if (isRentalSeries(product)) {
                    setPendingRentalProduct(product);
                  } else {
                    onSelectProduct(product);
                  }
                }}
              >
                {/* Selection indicator */}
                {selectedProduct?.id === product.id && (
                  <div className="absolute top-2 sm:top-3 right-2 sm:right-3 bg-blue-500 text-white rounded-full p-1 z-10">
                    <Check size={12} />
                  </div>
                )}

                {/* Product image */}
                <div className="h-24 sm:h-32 lg:h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product info */}
                <div className="p-2 sm:p-3 lg:p-4">
                  <h3 className="font-semibold text-gray-900 text-xs sm:text-sm lg:text-lg mb-1 sm:mb-2">{product.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 mb-2 sm:mb-3">{product.category}</p>

                  <div className="grid grid-cols-2 gap-x-1 sm:gap-x-2 lg:gap-x-4 gap-y-1 sm:gap-y-2 lg:gap-y-3 text-xs sm:text-sm">
                    <div>
                      <p className="text-gray-500">Resolution</p>
                      <p className="font-medium text-gray-800">
                        {product.resolution.width} × {product.resolution.height} px
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pixel Pitch</p>
                      <p className="font-medium text-gray-800">{product.pixelPitch} mm</p>
                      {(() => {
                        const range = getViewingDistanceRange(product.pixelPitch);
                        return range ? (
                          <p className="text-xs text-gray-500 mt-1">
                            Viewing: {range.minMeters}-{range.maxMeters}m ({range.minFeet}-{range.maxFeet}ft)
                          </p>
                        ) : null;
                      })()}
                    </div>
                    <div>
                      <p className="text-gray-500">Brightness</p>
                      <p className="font-medium text-gray-800">{product.brightness} nits</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Refresh Rate</p>
                      <p className="font-medium text-gray-800">{product.refreshRate} Hz</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500">Cabinet Size (W × H)</p>
                      <p className="font-medium text-gray-800">
                        {product.cabinetDimensions.width} × {product.cabinetDimensions.height} mm
                      </p>
                      {product.sizeInInches && (
                        <p className="text-gray-500 text-xs mt-1">
                          {product.sizeInInches.width} × {product.sizeInInches.height} (in)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              ))}
            </div>
          )}
        </div>
        {/* Rental option modal */}
        {pendingRentalProduct && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-40 p-3 sm:p-4">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 lg:p-8 flex flex-col items-center max-w-xs sm:max-w-sm w-full">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold mb-3 sm:mb-4 text-center">Select Rental Option</h3>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-6 w-full">
                <button
                  className={`px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg border-2 text-xs sm:text-sm lg:text-lg font-medium transition-all w-full ${rentalOption === 'cabinet' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 bg-white hover:bg-blue-50'}`}
                  onClick={() => setRentalOption('cabinet')}
                >
                  Cabinet
                </button>
                <button
                  className={`px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3 rounded-lg border-2 text-xs sm:text-sm lg:text-lg font-medium transition-all w-full ${rentalOption === 'curve lock' ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 bg-white hover:bg-blue-50'}`}
                  onClick={() => setRentalOption('curve lock')}
                >
                  Curve Lock
                </button>
              </div>
              <div className="flex gap-2 sm:gap-3 lg:gap-4 w-full">
                <button
                  className="flex-1 px-3 sm:px-4 lg:px-6 py-2 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium text-xs sm:text-sm lg:text-base"
                  onClick={() => {
                    setPendingRentalProduct(null);
                    setRentalOption(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 px-3 sm:px-4 lg:px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-medium disabled:opacity-50 text-xs sm:text-sm lg:text-base"
                  disabled={!rentalOption}
                  onClick={() => {
                    if (pendingRentalProduct && rentalOption) {
                      // Optionally, you can pass the rental option as a property or handle it in parent
                      onSelectProduct({ ...pendingRentalProduct, rentalOption });
                      setPendingRentalProduct(null);
                      setRentalOption(null);
                    }
                  }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Footer */}
        <div className="p-2 sm:p-3 lg:p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 sm:px-4 lg:px-6 py-1.5 sm:py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-xs sm:text-sm lg:text-base"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};