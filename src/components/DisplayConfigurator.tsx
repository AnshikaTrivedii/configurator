import React, { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { useDisplayCalculations } from '../hooks/useDisplayCalculations';
import { DimensionControls } from './DimensionControls';
import { AspectRatioSelector } from './AspectRatioSelector';
import { DisplayPreview } from './DisplayPreview';
import { ProductSelector } from './ProductSelector';
import { ConfigurationSummary } from './ConfigurationSummary';
import { ProductSidebar } from './ProductSidebar';
import { Product } from '../types';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configure the PDF worker from a CDN to avoid local path issues.
// See: https://github.com/wojtekmaj/react-pdf/wiki/Frequently-Asked-Questions#i-am-getting-error-warning-setting-up-fake-worker-failed-cannot-read-property-getdocument-of-undefined
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

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
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
    const [pdfError, setPdfError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

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

  // Handle column and row changes
  const handleColumnsChange = (columns: number) => {
    if (!selectedProduct) return;
    const newWidth = columns * selectedProduct.cabinetDimensions.width;
    updateWidth(newWidth);
  };

  const handleRowsChange = (rows: number) => {
    if (!selectedProduct) return;
    const newHeight = rows * selectedProduct.cabinetDimensions.height;
    updateHeight(newHeight);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">LED Configurator</h1>
          <p className="text-gray-600 mt-2">Configure your digital signage display using wide range of products</p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white">
          <ProductSidebar
            selectedProduct={selectedProduct}
            cabinetGrid={cabinetGrid}
            onColumnsChange={handleColumnsChange}
            onRowsChange={handleRowsChange}
            onSelectProductClick={() => setIsProductSelectorOpen(true)}
          />
        </div>

        {/* Main content area */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="space-y-6">
                <DimensionControls
                  config={config}
                  onWidthChange={updateWidth}
                  onHeightChange={updateHeight}
                  selectedProduct={selectedProduct}
                />
                
                <AspectRatioSelector
                  aspectRatios={aspectRatios}
                  selectedRatio={config.aspectRatio}
                  onRatioChange={updateAspectRatio}
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
              <DisplayPreview
                config={config}
                displayDimensions={displayDimensions}
                selectedProduct={selectedProduct}
                cabinetGrid={cabinetGrid}
              />
            </div>

            {/* Product Selection Button */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <Package className="text-blue-500" size={24} />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Select Product</h3>
                    <p className="text-gray-600">
                      {selectedProduct ? selectedProduct.name : 'No product selected'}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setIsProductSelectorOpen(true)}
                  className="w-full sm:w-auto bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2"
                >
                  <Package size={18} />
                  <span>Change Product</span>
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
    {/* Read More Button */}
    {selectedProduct.pdf && (
      <div className="mt-4 flex justify-end">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          onClick={() => setIsPdfModalOpen(true)}
        >
          Read More
        </button>
      </div>
    )}
    {/* PDF Modal */}
    {isPdfModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg shadow-lg max-w-3xl w-full p-6 relative">
          <button
            className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
            onClick={() => setIsPdfModalOpen(false)}
            aria-label="Close"
          >
            ×
          </button>
          <h3 className="text-xl font-semibold mb-4">Product PDF</h3>
          <div className="h-[70vh] overflow-auto border rounded">
            {/* PDF Viewer */}
                        <Document 
              file={selectedProduct.pdf} 
              onLoadSuccess={({ numPages }) => {
                setNumPages(numPages);
                setPdfError(null);
              }}
              onLoadError={(error) => {
                console.error('PDF load error:', error.message);
                setPdfError('Failed to load PDF. Please check the browser console for more details.');
              }}
              loading={<div className="text-center py-6">Loading PDF...</div>}
            >
                            {Array.from(new Array(numPages || 0), (_, index) => (
                <React.Fragment key={`page_${index + 1}`}>
                  <Page
                    pageNumber={index + 1}
                    width={700}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                  {(numPages && index < numPages - 1) && <div className="h-4 bg-gray-200" />}
                </React.Fragment>
              ))}
            </Document>
            {pdfError && <div className="p-4 text-red-600 bg-red-100 rounded-md">{pdfError}</div>}
              
            <div className="mt-2 text-sm text-gray-500">For full details, <a href={selectedProduct.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">open PDF in new tab</a>.</div>
          </div>
        </div>
      </div>
    )}
  </div>
)}

            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration Summary</h3>
              <ConfigurationSummary 
                config={config} 
                cabinetGrid={cabinetGrid} 
                selectedProduct={selectedProduct} 
              />
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