import { useState, useMemo } from 'react';
import { DisplayConfig, AspectRatio, CabinetGrid, Product } from '../types';

const aspectRatios: AspectRatio[] = [
  { label: '16:9', value: 16/9, name: '16:9' },
  { label: '21:9', value: 21/9, name: '21:9' },
  { label: '32:9', value: 32/9, name: '32:9' },
  { label: 'None', value: 0, name: 'None' }
];

export const useDisplayCalculations = (selectedProduct?: Product) => {
  // Default cabinet size (600mm x 337.5mm)
  const defaultCabinet = { width: 600, height: 337.5 };
  
  // Get current cabinet dimensions based on selected product or default
  const getCabinetDimensions = () => {
    return selectedProduct?.cabinetDimensions || defaultCabinet;
  };

  const [config, setConfig] = useState<DisplayConfig>({
    width: 1800, // 3 cabinets * 600mm
    height: 675,  // 2 cabinets * 337.5mm
    aspectRatio: 'None',
    unit: 'mm'
  });

  // Update width by adding/removing cabinets
  const updateWidth = (newWidth: number, addCabinets = 0) => {
    setConfig(prev => {
      if (addCabinets !== 0) {
        const cabinet = getCabinetDimensions();
        const currentCabinets = Math.round(prev.width / cabinet.width);
        const newCabinets = Math.max(1, currentCabinets + addCabinets);
        const width = Math.round(newCabinets * cabinet.width);
        
        // If aspect ratio is locked, update height proportionally
        if (prev.aspectRatio !== 'None') {
          const ratio = aspectRatios.find(r => r.name === prev.aspectRatio)?.value || 1;
          const height = Math.round(width / ratio);
          return { ...prev, width, height };
        }
        
        return { ...prev, width };
      }
      return { ...prev, width: newWidth };
    });
  };

  // Update height by adding/removing cabinets
  const updateHeight = (newHeight: number, addCabinets = 0) => {
    setConfig(prev => {
      if (addCabinets !== 0) {
        const cabinet = getCabinetDimensions();
        const currentCabinets = Math.round(prev.height / cabinet.height);
        const newCabinets = Math.max(1, currentCabinets + addCabinets);
        const height = Math.round(newCabinets * cabinet.height);
        
        // If aspect ratio is locked, update width proportionally
        if (prev.aspectRatio !== 'None') {
          const ratio = aspectRatios.find(r => r.name === prev.aspectRatio)?.value || 1;
          const width = Math.round(height * ratio);
          return { ...prev, width, height };
        }
        
        return { ...prev, height };
      }
      return { ...prev, height: newHeight };
    });
  };

  const updateAspectRatio = (aspectRatio: string) => {
    if (aspectRatio === 'None') {
      setConfig(prev => ({ ...prev, aspectRatio }));
    } else {
      const ratio = aspectRatios.find(r => r.name === aspectRatio)?.value || 1;
      setConfig(prev => ({
        ...prev,
        aspectRatio,
        height: prev.width / ratio
      }));
    }
  };

  const calculateCabinetGrid = (selectedProduct: Product | undefined): CabinetGrid => {
    if (!selectedProduct) {
      // Default cabinet size
      const defaultCabinet = { width: 600, height: 337 };
      const columns = Math.ceil(config.width / defaultCabinet.width);
      const rows = Math.ceil(config.height / defaultCabinet.height);
      return {
        columns,
        rows,
        totalWidth: columns * defaultCabinet.width,
        totalHeight: rows * defaultCabinet.height
      };
    }

    const { width: cabinetWidth, height: cabinetHeight } = selectedProduct.cabinetDimensions;
    const columns = Math.ceil(config.width / cabinetWidth);
    const rows = Math.ceil(config.height / cabinetHeight);
    
    return {
      columns,
      rows,
      totalWidth: columns * cabinetWidth,
      totalHeight: rows * cabinetHeight
    };
  };

  const displayDimensions = useMemo(() => {
    // Scale factor for preview (pixels per mm)
    const scaleFactor = 0.5; // 0.5 pixels per mm for reasonable preview size
    
    const displayWidth = config.width * scaleFactor;
    const displayHeight = config.height * scaleFactor;
    
    // Ensure minimum and maximum sizes for visibility
    const minSize = 150;
    const maxSize = 600;
    
    const finalWidth = Math.max(minSize, Math.min(maxSize, displayWidth));
    const finalHeight = Math.max(minSize, Math.min(maxSize, displayHeight));
    
    return {
      width: Math.round(finalWidth),
      height: Math.round(finalHeight),
      actualRatio: config.width / config.height
    };
  }, [config.width, config.height]);

  return {
    config,
    aspectRatios,
    updateWidth,
    updateHeight,
    updateAspectRatio,
    setConfig,
    displayDimensions,
    calculateCabinetGrid
  };
};