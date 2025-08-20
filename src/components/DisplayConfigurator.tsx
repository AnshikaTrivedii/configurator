import React, { useState, useEffect } from 'react';
import { Package, Menu, X } from 'lucide-react';
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
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  
  const {
    config,
    aspectRatios,
    updateWidth,
    updateHeight,
    updateUnit,
    updateAspectRatio,
    displayDimensions,
    calculateCabinetGrid
  } = useDisplayCalculations(selectedProduct);

  const [isProductSelectorOpen, setIsProductSelectorOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('preview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

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

  // Helper to check if product is Digital Standee
  const isDigitalStandee = selectedProduct && selectedProduct.category?.toLowerCase().includes('digital standee');
  // Helper to check if product is Jumbo Series
  const isJumbo = selectedProduct && selectedProduct.category?.toLowerCase().includes('jumbo');
  // Helper to get fixed grid for Jumbo
  function getJumboFixedGrid(product) {
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

  // Override cabinetGrid for Digital Standee and Jumbo
  const fixedCabinetGrid = isDigitalStandee
    ? { ...cabinetGrid, columns: 7, rows: 5 }
    : (jumboGrid ? { ...cabinetGrid, ...jumboGrid } : cabinetGrid);

  // Prevent changing columns/rows for Digital Standee and Jumbo
  const handleColumnsChange = (columns: number) => {
    if (isDigitalStandee || jumboGrid) return;
    if (!selectedProduct) return;
    const newWidth = columns * selectedProduct.cabinetDimensions.width;
    updateWidth(newWidth);
  };

  const handleRowsChange = (rows: number) => {
    if (isDigitalStandee || jumboGrid) return;
    if (!selectedProduct) return;
    const newHeight = rows * selectedProduct.cabinetDimensions.height;
    updateHeight(newHeight);
  };

  // When a Jumbo product is selected, set the width/height to match the fixed grid
  useEffect(() => {
    if (selectedProduct) {
      if (selectedProduct.category?.toLowerCase().includes('digital standee')) {
        updateWidth(selectedProduct.cabinetDimensions.width);
        updateHeight(selectedProduct.cabinetDimensions.height);
      } else if (jumboGrid) {
        updateWidth(jumboGrid.columns * selectedProduct.cabinetDimensions.width);
        updateHeight(jumboGrid.rows * selectedProduct.cabinetDimensions.height);
      } else {
        const grid = calculateCabinetGrid(selectedProduct);
        updateWidth(grid.totalWidth);
        updateHeight(grid.totalHeight);
      }
    }
  }, [selectedProduct]);

  // Digital Standee Series price mapping by model and user type
  const digitalStandeePrices: Record<string, { endUser: number; siChannel: number; reseller: number }> = {
    'P1.8': { endUser: 110300, siChannel: 100000, reseller: 93800 },
    'P2.5': { endUser: 80900, siChannel: 73300, reseller: 68800 },
    'P4':   { endUser: 95600, siChannel: 86700, reseller: 81300 },
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg relative">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8">
          {/* Mobile Menu Button */}
          <div className="lg:hidden absolute top-3 right-3 z-20 sm:top-4 sm:right-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors bg-blue-600/20 backdrop-blur-sm"
              aria-label="Toggle sidebar menu"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            {/* Mobile indicator when sidebar is closed */}
            {!isSidebarOpen && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            )}
          </div>

          {/* Logo - Top Left */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 lg:top-6 lg:left-6">
            <img 
              src="https://orion-led.com/wp-content/uploads/2025/06/logo-white-1.png" 
              alt="Orion LED Logo" 
              className="h-8 sm:h-12 lg:h-16 w-auto"
            />
          </div>
          
          {/* Main Content - Centered */}
          <div className="text-center pt-12 sm:pt-16 lg:pt-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white mb-1 sm:mb-2 lg:mb-3 tracking-tight">
              Orion Led Configurator
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-medium max-w-2xl mx-auto leading-relaxed px-2 sm:px-4">
              Configure your digital signage display using wide range of products
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex relative">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <div className={`
          fixed lg:relative inset-y-0 left-0 z-50 lg:z-auto
          transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
          transition-transform duration-300 ease-in-out
          w-72 sm:w-80 flex-shrink-0 border-r border-gray-200 bg-white
          lg:block
        `}>
          <ProductSidebar
            selectedProduct={selectedProduct}
            cabinetGrid={fixedCabinetGrid}
            onColumnsChange={handleColumnsChange}
            onRowsChange={handleRowsChange}
            onSelectProductClick={() => {
              setIsProductSelectorOpen(true);
              setIsSidebarOpen(false); // Close sidebar on mobile when opening product selector
            }}
            // New props to get controller and mode
            onControllerChange={setSelectedController}
            onModeChange={setSelectedMode}
          />
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-auto">
          {/* Mobile Instruction Banner */}
          <div className="lg:hidden bg-blue-50 border-b border-blue-200 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs text-blue-800">Tap the menu button (☰) to access product settings</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
              >
                Open Menu
              </button>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-6 lg:py-8 space-y-3 sm:space-y-6 lg:space-y-8">

            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
              <div className="space-y-3 sm:space-y-6">
                <DimensionControls
                  config={config}
                  onWidthChange={updateWidth}
                  onHeightChange={updateHeight}
                  onUnitChange={updateUnit}
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
            <div className="mb-3 sm:mb-6 lg:mb-8">
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-2">
                {/* Always show preview tab */}
                <button
                  className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm lg:text-base ${activeTab === 'preview' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  onClick={() => setActiveTab('preview')}
                >
                  Preview
                </button>

                {/* Show other tabs only when product is selected */}
                {selectedProduct && (
                  <>
                    <button
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm lg:text-base ${activeTab === 'data' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      onClick={() => setActiveTab('data')}
                    >
                      Data Wiring
                    </button>
                    <button
                      className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm lg:text-base ${activeTab === 'power' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                      onClick={() => setActiveTab('power')}
                    >
                      Power Wiring
                    </button>
                  </>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border p-2 sm:p-4">
                {activeTab === 'preview' && (
                  <DisplayPreview
                    config={config}
                    displayDimensions={displayDimensions}
                    selectedProduct={selectedProduct}
                    cabinetGrid={fixedCabinetGrid}
                  />
                )}

                {selectedProduct && activeTab === 'data' && (
                  <DataWiringView product={selectedProduct} cabinetGrid={fixedCabinetGrid} />
                )}

                {selectedProduct && activeTab === 'power' && (
                  <PowerWiringView product={selectedProduct} cabinetGrid={fixedCabinetGrid} />
                )}
              </div>
            </div>

            {/* Product Selection */}
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <Package className="text-blue-500" size={18} />
                  <div>
                    <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900">Select Product</h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {selectedProduct ? selectedProduct.name : 'No product selected'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsProductSelectorOpen(true)}
                  className="w-full sm:w-auto bg-gray-900 text-white px-3 sm:px-6 py-2 sm:py-2.5 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 text-xs sm:text-sm lg:text-base"
                >
                  <Package size={14} />
                  <span>Change Product</span>
                </button>
              </div>

              {selectedProduct && (
                <div className="mt-3 sm:mt-6 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Category</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">{selectedProduct.category}</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Cabinet Size</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {selectedProduct.cabinetDimensions.width} × {selectedProduct.cabinetDimensions.height} mm
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Resolution</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">
                        {selectedProduct.resolution.width} × {selectedProduct.resolution.height}
                      </p>
                    </div>
                    {/* PRICING SECTION - TEMPORARILY DISABLED
                    To re-enable pricing display, uncomment the section below and remove this comment block.
                    
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
                    END PRICING SECTION */}
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs sm:text-sm lg:text-base">Total Cabinets</h4>
                      <p className="text-gray-600 text-xs sm:text-sm">{cabinetGrid.columns * cabinetGrid.rows} units</p>
                    </div>
                  </div>
                  {/* Read More Button */}
                  {selectedProduct.pdf && (
                    <div className="mt-3 sm:mt-4 flex justify-end">
                      <button
                        className="bg-blue-600 text-white px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 text-xs sm:text-sm lg:text-base"
                        onClick={() => setIsPdfModalOpen(true)}
                      >
                        Read More
                      </button>
                    </div>
                  )}
                  {/* PDF Modal */}
                  {isPdfModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-2 sm:p-4">
                      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
                        <div className="flex items-center justify-between p-3 sm:p-4 border-b">
                          <h3 className="text-base sm:text-lg lg:text-xl font-semibold">Product PDF</h3>
                          <button
                            className="text-gray-500 hover:text-gray-800 p-2"
                            onClick={() => setIsPdfModalOpen(false)}
                            aria-label="Close"
                          >
                            <X size={18} />
                          </button>
                        </div>
                        <div className="h-[70vh] overflow-auto p-2 sm:p-4">
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
                                  width={Math.min(700, window.innerWidth - 32)}
                                  renderAnnotationLayer={false}
                                  renderTextLayer={false}
                                />
                                {(numPages && index < numPages - 1) && <div className="h-4 bg-gray-200" />}
                              </React.Fragment>
                            ))}
                          </Document>
                          {pdfError && <div className="p-4 text-red-600 bg-red-100 rounded-md">{pdfError}</div>}
                          
                          <div className="mt-2 text-xs sm:text-sm text-gray-500">For full details, <a href={selectedProduct.pdf} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">open PDF in new tab</a>.</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-xl shadow-sm border p-3 sm:p-6">
              <h3 className="text-sm sm:text-base lg:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Configuration Summary</h3>
              <ConfigurationSummary
                config={config}
                cabinetGrid={fixedCabinetGrid}
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