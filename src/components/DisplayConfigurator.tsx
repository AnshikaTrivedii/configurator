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
import DataWiringView from './DataWiringView';
import PowerWiringView from './PowerWiringView';
import { UserType } from './UserTypeModal';
import { QuoteModal } from './QuoteModal';

// Configure the PDF worker from a CDN to avoid local path issues.
// See: https://github.com/wojtekmaj/react-pdf/wiki/Frequently-Asked-Questions#i-am-getting-error-warning-setting-up-fake-worker-failed-cannot-read-property-getdocument-of-undefined
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface DisplayConfiguratorProps {
  userType: UserType | null;
}

export const DisplayConfigurator: React.FC<DisplayConfiguratorProps> = ({ userType }) => {
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
  const [activeTab, setActiveTab] = useState('preview');

  // New state for processor/controller and mode
  const [selectedController, setSelectedController] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('');

  const cabinetGrid = calculateCabinetGrid(selectedProduct);

  // Helper to auto-select controller based on pixel count (same as ProductSidebar)
  function getAutoSelectedController(product: Product | undefined, cabinetGrid: { columns: number; rows: number }) {
    if (!product) return '';
    const totalPixels = product.resolution.width * cabinetGrid.columns * product.resolution.height * cabinetGrid.rows;
    const totalPixelsMillion = totalPixels / 1_000_000;
    const controllerMapping = [
      { max: 0.65, name: 'TB2' },
      { max: 1.3, name: 'TB40' },
      { max: 2.3, name: 'TB60' },
      { max: 1.3, name: 'VX1' },
      { max: 2.6, name: 'VX400' },
      { max: 2.6, name: 'VX400 Pro' },
      { max: 3.9, name: 'VX600' },
      { max: 3.9, name: 'VX600 Pro' },
      { max: 6.5, name: 'VX1000' },
      { max: 6.5, name: 'VX1000 Pro' },
      { max: 13, name: '4K PRIME' },
    ];
    let selectedController = '4K PRIME';
    for (const mapping of controllerMapping) {
      if (totalPixelsMillion <= mapping.max) {
        selectedController = mapping.name;
        break;
      }
    }
    return selectedController;
  }

  // Update selectedController when product or grid changes
  useEffect(() => {
    if (selectedProduct) {
      const grid = calculateCabinetGrid(selectedProduct);
      setSelectedController(getAutoSelectedController(selectedProduct, grid));
    }
  }, [selectedProduct, config.width, config.height]);

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    // If digital standee, set width/height to cabinet size
    if (product.category?.toLowerCase().includes('digital standee')) {
      updateWidth(product.cabinetDimensions.width);
      updateHeight(product.cabinetDimensions.height);
    } else {
      const { totalWidth, totalHeight } = calculateCabinetGrid(product);
      updateWidth(totalWidth);
      updateHeight(totalHeight);
    }
    setActiveTab('preview');
    // Auto-select controller on product select
    const grid = calculateCabinetGrid(product);
    setSelectedController(getAutoSelectedController(product, grid));
  };

  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.category?.toLowerCase().includes('digital standee')) {
        updateWidth(selectedProduct.cabinetDimensions.width);
        updateHeight(selectedProduct.cabinetDimensions.height);
      } else {
        const grid = calculateCabinetGrid(selectedProduct);
        updateWidth(grid.totalWidth);
        updateHeight(grid.totalHeight);
      }
    }
  }, [selectedProduct]);

  // Helper to check if product is Digital Standee
  const isDigitalStandee = selectedProduct && selectedProduct.category?.toLowerCase().includes('digital standee');

  // Override cabinetGrid for Digital Standee
  const fixedCabinetGrid = isDigitalStandee
    ? { ...cabinetGrid, columns: 7, rows: 5 }
    : cabinetGrid;

  // Prevent changing columns/rows for Digital Standee
  const handleColumnsChange = (columns: number) => {
    if (isDigitalStandee) return;
    if (!selectedProduct) return;
    const newWidth = columns * selectedProduct.cabinetDimensions.width;
    updateWidth(newWidth);
  };

  const handleRowsChange = (rows: number) => {
    if (isDigitalStandee) return;
    if (!selectedProduct) return;
    const newHeight = rows * selectedProduct.cabinetDimensions.height;
    updateHeight(newHeight);
  };

  // Digital Standee Series price mapping by model and user type
  const digitalStandeePrices: Record<string, { endUser: number; siChannel: number; reseller: number }> = {
    'P1.8': { endUser: 110300, siChannel: 100000, reseller: 93800 },
    'P2.5': { endUser: 80900, siChannel: 73300, reseller: 68800 },
    'P4':   { endUser: 95600, siChannel: 86700, reseller: 81300 },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto text-center px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Orion led configurator</h1>
          <p className="text-gray-600 mt-2">Configure your digital signage display using wide range of products</p>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white">
          <ProductSidebar
            selectedProduct={selectedProduct}
            cabinetGrid={fixedCabinetGrid}
            onColumnsChange={handleColumnsChange}
            onRowsChange={handleRowsChange}
            onSelectProductClick={() => setIsProductSelectorOpen(true)}
            // New props to get controller and mode
            onControllerChange={setSelectedController}
            onModeChange={setSelectedMode}
          />
        </div>

        {/* Main Content Area */}
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

            {/* Tabs Section */}
            <div className="mb-8">
              <div className="flex space-x-2 mb-2">
                {/* Always show preview tab */}
                <button
                  className={`px-4 py-2 rounded ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>

                {/* Show other tabs only when product is selected */}
                {selectedProduct && (
                  <>
                    <button
                      className={`px-4 py-2 rounded ${activeTab === 'data' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      onClick={() => setActiveTab('data')}
                    >
                      Data Wiring
                    </button>
                    <button
                      className={`px-4 py-2 rounded ${activeTab === 'power' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      onClick={() => setActiveTab('power')}
                    >
                      Power Wiring
                    </button>
                  </>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-4">
                {activeTab === 'preview' && (
                  <DisplayPreview
                    config={config}
                    displayDimensions={displayDimensions}
                    selectedProduct={selectedProduct}
                    cabinetGrid={cabinetGrid}
                  />
                )}

                {selectedProduct && activeTab === 'data' && (
                  <DataWiringView product={selectedProduct} cabinetGrid={cabinetGrid} />
                )}

                {selectedProduct && activeTab === 'power' && (
                  <PowerWiringView product={selectedProduct} cabinetGrid={cabinetGrid} />
                )}
              </div>
            </div>

            {/* Product Selection */}
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
                      <h4 className="font-medium text-gray-900">Price</h4>
                      <p className="text-gray-600">
                        {(() => {
                          if (
                            selectedProduct.category?.toLowerCase().includes('rental') &&
                            selectedProduct.rentalOption &&
                            selectedProduct.prices
                          ) {
                            // Map userType to price key
                            const userTypeToPriceKey = (type: string): 'endCustomer' | 'siChannel' | 'reseller' => {
                              if (type === 'siChannel' || type === 'reseller') return type;
                              return 'endCustomer';
                            };
                            const price = selectedProduct.prices[
                              selectedProduct.rentalOption === 'curve lock' ? 'curveLock' : 'cabinet'
                            ][userTypeToPriceKey(userType as 'endCustomer' | 'siChannel' | 'reseller')];
                            return price
                              ? `₹${price.toLocaleString('en-IN')} (${selectedProduct.rentalOption === 'curve lock' ? 'Curve Lock' : 'Cabinet'})/ft²`
                              : 'Contact for pricing';
                          }
                          let price = selectedProduct.price;
                          if (userType === 'siChannel') price = selectedProduct.siChannelPrice;
                          if (userType === 'reseller') price = selectedProduct.resellerPrice;
                          return price ? `₹${price.toLocaleString('en-IN')}` : 'Contact for pricing';
                        })()}
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
                userType={userType}
                processor={selectedController}
                mode={selectedMode}
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
      {/* Quote Modal */}
      {selectedProduct && (
        <QuoteModal
          isOpen={false} // You may need to control this with state if not already
          onClose={() => {}}
          onSubmit={() => {}}
          selectedProduct={selectedProduct}
          config={config}
          cabinetGrid={cabinetGrid}
          processor={selectedController}
          mode={selectedMode}
        />
      )}
    </div>
  );
};