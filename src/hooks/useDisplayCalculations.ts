import { useState, useMemo } from 'react';
import { DisplayConfig, AspectRatio, CabinetGrid, Product } from '../types';

// Predefined aspect ratios
const aspectRatios: AspectRatio[] = [
  { label: '16:9', value: 16 / 9, name: '16:9' },
  { label: '21:9', value: 21 / 9, name: '21:9' },
  { label: '32:9', value: 32 / 9, name: '32:9' },
  { label: 'None', value: 0, name: 'None' }
];

export const useDisplayCalculations = (selectedProduct?: Product) => {
  const defaultCabinet = { width: 600, height: 337.5 };

  const getCabinetDimensions = () => {
    return selectedProduct?.cabinetDimensions || defaultCabinet;
  };

  const [config, setConfig] = useState<DisplayConfig>({
    width: 1800,
    height: 675,
    aspectRatio: 'None',
    unit: 'mm'
  });

  const updateWidth = (newWidth: number, addCabinets = 0) => {
    setConfig(prev => {
      const cabinet = getCabinetDimensions();
      let width = newWidth;

      if (addCabinets !== 0) {
        const currentCabinets = Math.round(prev.width / cabinet.width);
        const newCabinets = Math.max(1, currentCabinets + addCabinets);
        width = Math.round(newCabinets * cabinet.width);
      }

      if (prev.aspectRatio !== 'None') {
        const ratio = aspectRatios.find(r => r.name === prev.aspectRatio)?.value || 1;
        const height = Math.round(width / ratio);
        return { ...prev, width, height };
      }

      return { ...prev, width };
    });
  };

  const updateHeight = (newHeight: number, addCabinets = 0) => {
    setConfig(prev => {
      const cabinet = getCabinetDimensions();
      let height = newHeight;

      if (addCabinets !== 0) {
        const currentCabinets = Math.round(prev.height / cabinet.height);
        const newCabinets = Math.max(1, currentCabinets + addCabinets);
        height = Math.round(newCabinets * cabinet.height);
      }

      if (prev.aspectRatio !== 'None') {
        const ratio = aspectRatios.find(r => r.name === prev.aspectRatio)?.value || 1;
        const width = Math.round(height * ratio);
        return { ...prev, width, height };
      }

      return { ...prev, height };
    });
  };

  const updateAspectRatio = (aspectRatio: string) => {
    if (aspectRatio === 'None') {
      setConfig(prev => ({ ...prev, aspectRatio }));
      return;
    }
  
    const ratio = aspectRatios.find(r => r.name === aspectRatio)?.value || 1;
    const cabinet = getCabinetDimensions();
  
    // Choose a base: fix rows (can change this to fix columns if you prefer)
    const rows = Math.max(1, Math.round(config.height / cabinet.height)); // ensure minimum 1 row
    const height = rows * cabinet.height;
  
    // Calculate required columns to achieve selected aspect ratio
    const columns = Math.max(1, Math.round((ratio * height) / cabinet.width));
    const width = columns * cabinet.width;
  
    setConfig({
      width,
      height,
      aspectRatio,
      unit: config.unit
    });
  };
  

  const calculateCabinetGrid = (selectedProduct: Product | undefined): CabinetGrid => {
    const cabinet = selectedProduct?.cabinetDimensions || defaultCabinet;

    const columns = Math.ceil(config.width / cabinet.width);
    const rows = Math.ceil(config.height / cabinet.height);

    return {
      columns,
      rows,
      totalWidth: columns * cabinet.width,
      totalHeight: rows * cabinet.height
    };
  };

  // Dynamically scale dimensions while keeping aspect ratio accurate
  const displayDimensions = useMemo(() => {
    const maxSize = 600;
    const minSize = 150;

    const widthRatio = config.width / config.height;

    let previewHeight = maxSize;
    let previewWidth = previewHeight * widthRatio;

    if (previewWidth > maxSize) {
      previewWidth = maxSize;
      previewHeight = previewWidth / widthRatio;
    }

    const finalWidth = Math.max(minSize, Math.round(previewWidth));
    const finalHeight = Math.max(minSize, Math.round(previewHeight));

    return {
      width: finalWidth,
      height: finalHeight,
      actualRatio: widthRatio
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