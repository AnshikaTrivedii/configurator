/** Dimensions are stored in millimetres. Display formatting must not change that value on an edit round-trip. */
export function formatDimensionInput(mm: number, unit: 'm' | 'ft'): string {
  const converted = unit === 'ft' ? mm / 304.8 : mm / 1000;
  return Number(converted.toFixed(6)).toString();
}

export function parseDimensionInput(value: number, unit: 'm' | 'ft'): number {
  const mm = unit === 'ft' ? value * 304.8 : value * 1000;
  return Math.round(mm * 1000) / 1000;
}

export function displayAreaSqFt(widthMm: number, heightMm: number): number {
  return (widthMm / 304.8) * (heightMm / 304.8);
}

export function billableAreaSqFt(widthMm: number, heightMm: number): number {
  return Math.round(displayAreaSqFt(widthMm, heightMm) * 100) / 100;
}

export function cabinetCountForTarget(targetMm: number, cabinetMm: number): number {
  if (!Number.isFinite(targetMm) || !Number.isFinite(cabinetMm) || cabinetMm <= 0) return 1;
  return Math.max(1, Math.floor(targetMm / cabinetMm + 1e-8));
}
