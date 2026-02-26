/**
 * Display power calculation. For Jumbo Series only:
 * - Max power = (modules/8)*350
 * - Avg power = (modules/8)*175 (half of max).
 * All other series use product per-cabinet values × cabinet count.
 */

import { Product } from '../types';

export interface DisplayPowerResult {
  avgPower: number;
  maxPower: number;
  avgPowerPerCabinet: number;
  maxPowerPerCabinet: number;
}

/**
 * Returns total and per-unit power for display. Jumbo: Power = (modules/8)*350 (rounded).
 */
export function getDisplayPower(
  product: Product | undefined,
  cabinetGrid: { columns: number; rows: number }
): DisplayPowerResult {
  const modules = cabinetGrid.columns * cabinetGrid.rows;
  const isJumbo =
    product?.category?.toLowerCase().includes('jumbo') ??
    (product as any)?.dimensionConstraints?.series === 'Jumbo';

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

  const avgPerCabinet = product?.avgPowerConsumption ?? 91.7;
  const maxPerCabinet = product?.maxPowerConsumption ?? avgPerCabinet * 3;
  return {
    avgPower: Math.round(avgPerCabinet * modules * 100) / 100,
    maxPower: Math.round(maxPerCabinet * modules * 100) / 100,
    avgPowerPerCabinet: avgPerCabinet,
    maxPowerPerCabinet: maxPerCabinet
  };
}
