/**
 * Display power calculation.
 * - Jumbo Series: Max = (modules/8)*350, Avg = (modules/8)*175.
 * - Digital Standee: uses product spec values (avg/max) in Power Consumption Details;
 *   P1.8 & P2.5 → <120 W avg, <400 W max; P4 → <400 W avg, <750 W max.
 * - Module/ Grid Series & Flexible Series: power = (modules/8) × (avg/max spec W).
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

  const isDigitalStandee = product?.category?.toLowerCase().includes('digital standee');
  if (isDigitalStandee && product) {
    // Digital Standee: show product spec values in Power Consumption Details (same as product spec)
    const avgW = product.avgPowerConsumption ?? 120;
    const maxW = product.maxPowerConsumption ?? 400;
    return {
      avgPower: avgW,
      maxPower: maxW,
      avgPowerPerCabinet: avgW,
      maxPowerPerCabinet: maxW
    };
  }

  const isFlexibleSeries = product?.category?.toLowerCase().includes('flexible');
  if ((isModuleGridSeries || isFlexibleSeries) && product) {
    // Module/ Grid Series & Flexible Series: power = (modules/8) × (avg/max spec W)
    const factor = modules / 8;
    const avgW = product.avgPowerConsumption ?? 350;
    const maxW = product.maxPowerConsumption ?? 650;
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
