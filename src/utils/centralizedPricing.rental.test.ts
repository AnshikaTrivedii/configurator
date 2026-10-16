/**
 * Rental quotations bill product + processor only.
 * Run: npx --yes tsx src/utils/centralizedPricing.rental.test.ts
 */

import { products } from '../data/products';
import { calculateCentralizedPricing } from './centralizedPricing';

let passed = 0;
let failed = 0;

function assert(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  PASS  ${name}`);
  } else {
    failed += 1;
    console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function productById(id: string) {
  const product = products.find((item) => item.id === id);
  if (!product) throw new Error(`Missing product ${id}`);
  return product;
}

console.log('Rental pricing excludes structure and installation');

{
  const bellatrix = productById('rental-outdoor-p4.8');
  const priced = calculateCentralizedPricing(
    bellatrix,
    { columns: 4, rows: 1, totalWidth: 2304, totalHeight: 576 },
    'TB40',
    'endUser',
    { width: 2304, height: 576, unit: 'mm' }
  );

  assert('outdoor Bellatrix unit price is the cabinet price', priced.unitPrice === 28125);
  assert('outdoor Bellatrix quantity is the cabinet count', priced.quantity === 4);
  assert('outdoor Bellatrix product total is cabinets × unit price', priced.productTotal === 112500);
  assert('outdoor Bellatrix keeps the processor', priced.processorTotal === 35000);
  assert('outdoor Bellatrix structure is 0', priced.structureCost === 0 && priced.structureTotal === 0);
  assert('outdoor Bellatrix installation is 0', priced.installationCost === 0 && priced.installationTotal === 0);
  assert(
    'outdoor Bellatrix grand total is product + processor',
    priced.grandTotal === 147500 && priced.grandTotal === priced.productTotal + priced.processorTotal
  );
}

{
  const bellatrix = productById('rental-indoor-p2.6');
  const priced = calculateCentralizedPricing(
    { ...bellatrix, rentalOption: 'curve lock' },
    { columns: 2, rows: 2, totalWidth: 1000, totalHeight: 1000 },
    'TB40',
    'endUser',
    { width: 1000, height: 1000, unit: 'mm' }
  );

  assert('indoor curve-lock unit price includes the curve-lock add-on', priced.unitPrice === 34375 + 1700);
  assert('indoor Bellatrix quantity is the cabinet count', priced.quantity === 4);
  assert('indoor Bellatrix structure is 0', priced.structureCost === 0);
  assert('indoor Bellatrix installation is 0', priced.installationCost === 0);
  assert(
    'indoor Bellatrix grand total is product + processor',
    priced.grandTotal === priced.productTotal + priced.processorTotal
  );
}

{
  const bellatrix = productById('rental-outdoor-p4.8');
  const priced = calculateCentralizedPricing(
    bellatrix,
    { columns: 4, rows: 1, totalWidth: 2304, totalHeight: 576 },
    'TB40',
    'endUser',
    { width: 2304, height: 576, unit: 'mm' },
    { enabled: true, structurePrice: 99999, installationPrice: 88888 }
  );

  assert('a custom structure price does not change a rental total', priced.structureCost === 0 && priced.installationCost === 0);
  assert('rental grand total stays product + processor when custom structure is set', priced.grandTotal === 147500);
}

{
  const nexa = productById('nexa-p125-108');
  const priced = calculateCentralizedPricing(
    nexa,
    { columns: 1, rows: 1, totalWidth: 2391, totalHeight: 1345 },
    'TB40',
    'endUser',
    { width: 2391, height: 1345, unit: 'mm' }
  );

  assert('Nexa quantity stays 1', priced.quantity === 1);
  assert('Nexa excludes processor, structure, and installation', priced.processorTotal === 0 && priced.structureCost === 0 && priced.installationCost === 0);
  assert('Nexa grand total is the product price', priced.grandTotal === 1670000 && priced.productTotal === 1670000);
}

{
  const rigel = productById('modular-outdoor-p3.91');
  const priced = calculateCentralizedPricing(
    rigel,
    { columns: 5, rows: 2, totalWidth: 5000, totalHeight: 2000 },
    'TB40',
    'endUser',
    { width: 5000, height: 2000, unit: 'mm' },
    undefined,
    'copper'
  );

  assert('a non-rental product still includes structure', priced.structureCost > 0);
  assert('a non-rental product still includes installation', priced.installationCost > 0);
  assert(
    'a non-rental grand total includes structure and installation',
    priced.grandTotal === priced.productTotal + priced.processorTotal + priced.structureTotal + priced.installationTotal
  );
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
