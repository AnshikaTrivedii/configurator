/**
 * Display power calculation.
 * - Jumbo Series: Max = (modules/8)*350, Avg = (modules/8)*175.
 * - Module/ Grid Series: P1.8 → avg=(modules/8)*225, max=(modules/8)*650;
 *   P2.5 → avg=(modules/8)*350, max=(modules/8)*650; P4 → avg=(modules/8)*400, max=(modules/8)*700.
 * - All other series: product per-cabinet values × cabinet count.
 */

import { Product } from '../types';

export interface DisplayPowerResult {
  avgPower: number;
  maxPower: number;
  avgPowerPerCabinet: number;
  maxPowerPerCabinet: number;
}

/**
 * Returns total and per-unit power for display.
 * Module/ Grid: Power = (No. of modules / 8) × 350.
 */
export function getDisplayPower(
  product: Product | undefined,
  cabinetGrid: { columns: number; rows: number }
): DisplayPowerResult {
  const modules = cabinetGrid.columns * cabinetGrid.rows;
  const isJumbo =
    product?.category?.toLowerCase().includes('jumbo') ??
    (product as any)?.dimensionConstraints?.series === 'Jumbo';
  const isModuleGridSeries = product?.category === 'Module/ Grid Series';

  if (isJumbo && product) {
    const maxPower = Math.round((modules / 8) * 350);
    const avgPower = Math.round((modules / 8) * 175);
    const maxPerUnit = modules > 0 ? maxPower / modules : 0;
    const avgPerUnit = modules > 0 ? avgPower / modules : 0;
    return {
      avgPower,
      maxPower,
      avgPowerPerCabinet: Math.round(avgPerUnit * 100) / 100,
      maxPowerPerCabinet: Math.round(maxPerUnit * 100) / 100
    };
  }

  if (isModuleGridSeries && product) {
    // Module/ Grid Series: per-pitch formulas — power = (modules/8) × W
    const factor = modules / 8;
    const moduleGridPower: Record<string, { avgW: number; maxW: number }> = {
      'orion-module-grid-p18': { avgW: 225, maxW: 650 },
      'orion-module-grid-p25': { avgW: 350, maxW: 650 },
      'orion-module-grid-p4': { avgW: 400, maxW: 700 }
    };
    const { avgW, maxW } = moduleGridPower[product.id ?? ''] ?? { avgW: 350, maxW: 650 };
    const avgPower = Math.round(factor * avgW * 100) / 100;
    const maxPower = Math.round(factor * maxW * 100) / 100;
    const avgPerUnit = modules > 0 ? avgPower / modules : 0;
    const maxPerUnit = modules > 0 ? maxPower / modules : 0;
    return {
      avgPower,
      maxPower,
      avgPowerPerCabinet: Math.round(avgPerUnit * 100) / 100,
      maxPowerPerCabinet: Math.round(maxPerUnit * 100) / 100
    };
  }

  const avgPerCabinet = product?.avgPowerConsumption ?? 91.7;
  const maxPerCabinet = product?.maxPowerConsumption ?? avgPerCabinet * 3;
  return {
    avgPower: Math.round(avgPerCabinet * modules * 100) / 100,
    maxPower: Math.round(maxPerCabinet * modules * 100) / 100,
    avgPowerPerCabinet: avgPerCabinet,
    maxPowerPerCabinet: maxPerCabinet
  };
}
