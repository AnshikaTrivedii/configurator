import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { Product } from '../types';

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
  
  const filteredProducts = selectedCategory === 'All' 
    ? products 
    : products.filter(p => p.category === selectedCategory);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-900">Select Product</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Category filter */}
        <div className="p-6 border-b bg-gray-50">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`px-4 py-2 rounded-lg border transition-all ${
                selectedCategory === 'All'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
              }`}
            >
              All Products
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg border transition-all ${
                  selectedCategory === category
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products grid */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.map((product: ProductWithOptionalSize) => (
              <div
                key={product.id}
                className={`relative bg-white border-2 rounded-xl overflow-hidden cursor-pointer transition-all hover:shadow-lg ${
                  selectedProduct?.id === product.id
                    ? 'border-blue-500 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => onSelectProduct(product)}
              >
                {/* Selection indicator */}
                {selectedProduct?.id === product.id && (
                  <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full p-1 z-10">
                    <Check size={16} />
                  </div>
                )}

                {/* Product image */}
                <div className="h-48 bg-gray-100 overflow-hidden">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Product info */}
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 text-lg mb-2">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{product.category}</p>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                    <div>
                      <p className="text-gray-500">Resolution</p>
                      <p className="font-medium text-gray-800">
                        {product.resolution.width} × {product.resolution.height} px
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Pixel Pitch</p>
                      <p className="font-medium text-gray-800">{product.pixelPitch} mm</p>
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};