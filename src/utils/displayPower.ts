/**
 * Display power calculation.
 * - Jumbo Series: Max = (modules/8)*350, Avg = (modules/8)*175.
 * - Module/ Grid Series: Power = (modules/8)*350 (used for both avg and max).
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
    // Module/ Grid Series: Power consumption = (No. of modules / 8) × 350
    const totalPower = Math.round((modules / 8) * 350);
    const perUnit = modules > 0 ? totalPower / modules : 0;
    return {
      avgPower: totalPower,
      maxPower: totalPower,
      avgPowerPerCabinet: Math.round(perUnit * 100) / 100,
      maxPowerPerCabinet: Math.round(perUnit * 100) / 100
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
