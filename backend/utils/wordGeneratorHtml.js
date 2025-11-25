import { asBlob } from 'html-docx-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getProcessorPrice } from './processorPrices.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root (one level up from backend)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
// NOTE: Pages-to-JPG folder is no longer used
// Pages are now extracted from DOCX template: dist/assets/docs/ADA Project Bellatrix P4 6.3 x 3.15ft - Copy (1).docx
const TEMPLATE_DOCX_PATH = path.join(PROJECT_ROOT, 'dist', 'assets', 'docs', 'ADA Project Bellatrix P4 6.3 x 3.15ft - Copy (1).docx');

// Phone number mapping for sales team members
const SALES_PHONE_MAPPING = {
  'ashoo.nitin@orion-led.com': '8826888023',
  'mukund.puranik@orion-led.com': '9701797731',
  'onkar@orion-led.com': '9820318887',
  'prachi.sharma@orion-led.com': '8826888050',
  'rajneesh.rawat@orion-led.com': '9839177000',
  'sales@orion-led.com': '98391 77083',
  'vivekanand@orion-led.com': '9810163963',
  'khushi.jafri@orion-led.com': '8588882820',
  'ashwani.yadav@orion-led.com': '98391 77083',
  'anshika.trivedi@orion-led.com': '9140526027',
  'madhur@orion-led.com': '98391 77046',
  'amisha@orion-led.com': '98391 77083',
};

const DEFAULT_PHONE_NUMBER = '98391 77083';

const getSalesPhoneNumber = (salesUser) => {
  if (!salesUser) return DEFAULT_PHONE_NUMBER;
  const mappedPhone = SALES_PHONE_MAPPING[salesUser.email?.toLowerCase()];
  return mappedPhone || salesUser.contactNumber || DEFAULT_PHONE_NUMBER;
};

// Format Indian number with commas
const formatIndianNumber = (x) => {
  const rounded = Math.round(x);
  const s = rounded.toString();
  if (s.length > 3) {
    const lastThree = s.slice(-3);
    const remaining = s.slice(0, s.length - 3);
    const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
    return formatted;
  }
  return s;
};

// Convert meters to display unit
const toDisplayUnit = (mm, unit) => {
  const METERS_TO_FEET = 3.2808399;
  const meters = mm / 1000;
  if (unit === 'ft') {
    return (meters * METERS_TO_FEET).toFixed(2);
  }
  return meters.toFixed(2);
};

// Get product unit price
const getProductPriceForWord = (product, userType = 'End User') => {
  if (product.category?.toLowerCase().includes('rental') && product.prices) {
    if (userType === 'Reseller') {
      return product.prices.cabinet.reseller;
    } else if (userType === 'Channel') {
      return product.prices.cabinet.siChannel;
    } else {
      return product.prices.cabinet.endCustomer;
    }
  }
  
  if (userType === 'Reseller' && typeof product.resellerPrice === 'number') {
    return product.resellerPrice;
  } else if (userType === 'Channel' && typeof product.siChannelPrice === 'number') {
    return product.siChannelPrice;
  } else if (typeof product.price === 'number') {
    return product.price;
  } else if (typeof product.price === 'string') {
    const parsedPrice = parseFloat(product.price);
    return isNaN(parsedPrice) ? 5300 : parsedPrice;
  }
  
  return 5300;
};

// Calculate quantity
const calculateQuantity = (product, cabinetGrid, config) => {
  const METERS_TO_FEET = 3.2808399;
  
  if (product.category?.toLowerCase().includes('rental')) {
    return cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
  }
  
  const isJumboSeries = product.category?.toLowerCase().includes('jumbo') || 
                        product.id?.toLowerCase().startsWith('jumbo-') ||
                        product.name?.toLowerCase().includes('jumbo series');
  
  if (isJumboSeries) {
    const pixelPitch = product.pixelPitch;
    if (pixelPitch === 4 || pixelPitch === 2.5) {
      return 34.64;
    } else if (pixelPitch === 3 || pixelPitch === 6) {
      return 34.88;
    }
  }
  
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const quantity = widthInFeet * heightInFeet;
  
  return Math.round(quantity * 100) / 100;
};

// Convert image to base64 data URL
const imageToBase64 = (imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      console.error(`Image not found: ${imagePath}`);
      return null;
    }
    const imageBuffer = fs.readFileSync(imagePath);
    const base64 = imageBuffer.toString('base64');
    // Determine MIME type from file extension
    const ext = path.extname(imagePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    console.error(`Error converting image to base64 ${imagePath}:`, error);
    return null;
  }
};

// Generate HTML for Word document with all pages
const generateWordHtml = (data) => {
  const {
    config,
    selectedProduct,
    cabinetGrid,
    processor,
    userInfo,
    salesUser,
    quotationId,
    customPricing
  } = data;

  // Calculate pricing
  const userType = userInfo?.userType || 'End User';
  const unitPrice = getProductPriceForWord(selectedProduct, userType);
  const quantity = calculateQuantity(selectedProduct, cabinetGrid, config);
  const safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  
  const subtotal = Math.round((unitPrice * safeQuantity) * 100) / 100;
  const gstProduct = Math.round((subtotal * 0.18) * 100) / 100;
  const totalProduct = Math.round((subtotal + gstProduct) * 100) / 100;
  
  const isJumboSeries = selectedProduct.category?.toLowerCase().includes('jumbo') || 
                        selectedProduct.id?.toLowerCase().startsWith('jumbo-') ||
                        selectedProduct.name?.toLowerCase().includes('jumbo series');
  
  let controllerPrice = 0;
  if (processor && !isJumboSeries) {
    controllerPrice = getProcessorPrice(processor, userType);
  }
  const gstController = Math.round((controllerPrice * 0.18) * 100) / 100;
  const totalController = Math.round((controllerPrice + gstController) * 100) / 100;
  
  // Structure and Installation pricing
  const METERS_TO_FEET = 3.2808399;
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const screenAreaSqFt = Math.round((widthInFeet * heightInFeet) * 100) / 100;
  
  let structureBasePrice, installationBasePrice;
  if (customPricing?.enabled && customPricing.structurePrice !== null && customPricing.installationPrice !== null) {
    structureBasePrice = customPricing.structurePrice;
    installationBasePrice = customPricing.installationPrice;
  } else {
    structureBasePrice = screenAreaSqFt * 2500;
    installationBasePrice = screenAreaSqFt * 500;
  }
  
  const structureGST = Math.round((structureBasePrice * 0.18) * 100) / 100;
  const totalStructure = Math.round((structureBasePrice + structureGST) * 100) / 100;
  const installationGST = Math.round((installationBasePrice * 0.18) * 100) / 100;
  const totalInstallation = Math.round((installationBasePrice + installationGST) * 100) / 100;
  
  const combinedStructureInstallationBase = structureBasePrice + installationBasePrice;
  const combinedStructureInstallationGST = structureGST + installationGST;
  const combinedStructureInstallationTotal = totalStructure + totalInstallation;
  
  const grandTotal = Math.round(totalProduct + totalController + totalStructure + totalInstallation);

  // Extract pages from DOCX template and convert to base64
  // TODO: Implement DOCX page extraction and conversion to base64 images
  // Template Page 1 → Final Page 1, Template Page 2 → Final Page 2, etc.
  // Template Page 6 is SKIPPED (use dynamic quotation for Final Page 6)
  const pageImages = {};
  
  // Pages 1-5: Extract from DOCX template (indices 0-4)
  for (let i = 1; i <= 5; i++) {
    // TODO: Extract page i from DOCX template and convert to base64
    // const base64 = await extractPageFromDocxAsBase64(i);
    // pageImages[i] = base64;
    console.warn(`⚠️ Page ${i} extraction from DOCX template needs implementation`);
  }
  
  // Page 6: Dynamically generated quotation (NO background from template)
  // Template Page 6 is SKIPPED
  
  // Pages 7+: Extract from DOCX template (indices 6+)
  // TODO: Implement extraction for pages 7+
  console.warn('⚠️ Pages 7+ extraction from DOCX template needs implementation');

  // Generate HTML with all pages
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      margin: 0;
      padding: 0;
      font-family: Arial, sans-serif;
      background: white;
    }
    .page {
      width: 210mm;
      height: 297mm;
      min-width: 210mm;
      max-width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      page-break-after: always;
      position: relative;
      margin: 0 auto;
      padding: 0;
      overflow: hidden;
      background: white;
    }
    .page-bg {
      position: absolute;
      top: 0;
      left: 0;
      width: 210mm;
      height: 297mm;
      min-width: 210mm;
      max-width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      z-index: 0;
      object-fit: fill;
      object-position: top left;
    }
    .page-content {
      position: relative;
      z-index: 1;
      padding: 55mm 12mm 25mm 12mm;
      box-sizing: border-box;
      width: 100%;
      height: 100%;
    }
    .quotation-section {
      margin-bottom: 4px;
      background: rgba(255, 255, 255, 0.95);
      padding: 5px 6px;
      border-radius: 3px;
      border: 1px solid rgba(233, 236, 239, 0.8);
      width: 100%;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      table-layout: fixed;
    }
    td {
      padding: 4px 8px;
      border: 1px solid rgba(233, 236, 239, 0.7);
      vertical-align: top;
      word-wrap: break-word;
    }
    .quotation-table {
      width: 100%;
      border-collapse: collapse;
    }
    .quotation-table td {
      padding: 4px 2px;
      border-bottom: 1px solid rgba(233, 236, 239, 0.7);
      font-size: 11px;
    }
    .quotation-label {
      font-weight: 600;
      color: #333;
      font-size: 11px;
      text-align: left;
    }
    .quotation-value {
      color: #333;
      font-weight: 600;
      font-size: 11px;
      text-align: right;
    }
    h2 {
      color: #2563eb;
      font-size: 14px;
      border-bottom: 2px solid #2563eb;
      padding-bottom: 3px;
      margin: 0 0 4px 0;
    }
    h3 {
      color: #333;
      font-size: 13px;
      border-bottom: 2px solid #333;
      padding-bottom: 3px;
      margin: 0 0 4px 0;
    }
    h4 {
      color: #333;
      font-size: 12px;
      border-bottom: 1px solid rgba(233, 236, 239, 0.8);
      padding-bottom: 3px;
      margin: 0 0 4px 0;
    }
  </style>
</head>
<body>
  ${[1, 2, 3, 4, 5].map(i => `
    <div class="page">
      ${pageImages[i] ? `<img src="${pageImages[i]}" class="page-bg" alt="Page ${i}" />` : ''}
    </div>
  `).join('')}
  
  <!-- Page 6: Quotation -->
  <div class="page">
    ${pageImages[6] ? `<img src="${pageImages[6]}" class="page-bg" alt="Page 6" />` : ''}
    <div class="page-content">
      <div class="quotation-section">
        <p><strong>Quotation #:</strong> ${quotationId || 'ORION/2025/07/Prachi/0193'}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB')}</p>
      </div>
      
      ${userInfo ? `
      <div class="quotation-section">
        <h3>CLIENT INFORMATION</h3>
        <table>
          <tr>
            <td style="width: 50%;">
              <h4>CLIENT DETAILS</h4>
              <p><strong>Name:</strong> ${userInfo.fullName}</p>
              <p><strong>Email:</strong> ${userInfo.email}</p>
              <p><strong>Phone:</strong> ${userInfo.phoneNumber}</p>
              ${userInfo.projectTitle ? `<p><strong>Project Title:</strong> ${userInfo.projectTitle}</p>` : ''}
              ${userInfo.address ? `<p><strong>Address:</strong> ${userInfo.address}</p>` : ''}
            </td>
            <td style="width: 50%;">
              <h4>ORION SALES TEAM</h4>
              <p><strong>Location:</strong> ${salesUser?.location || 'Delhi'}</p>
              <p><strong>Sales Person:</strong> ${salesUser?.name || 'Ashwani Yadav'}</p>
              <p><strong>Contact:</strong> ${getSalesPhoneNumber(salesUser)}</p>
              <p><strong>Email:</strong> ${salesUser?.email || 'ashwani.yadav@orion-led.com'}</p>
            </td>
          </tr>
        </table>
      </div>
      ` : ''}
      
      <div class="quotation-section">
        <h2>A. PRODUCT DESCRIPTION</h2>
        <table>
          <tr>
            <td style="width: 50%;">
              <h4>PRODUCT SPECIFICATIONS</h4>
              <p><strong>Series/Environment:</strong> ${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}</p>
              <p><strong>Pixel Pitch:</strong> P${selectedProduct.pixelPitch}</p>
              <p><strong>Module Dimension:</strong> ${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height} mm</p>
              <p><strong>Display Size (m):</strong> ${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}</p>
              <p><strong>Display Size (ft):</strong> ${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}</p>
              <p><strong>Resolution:</strong> ${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}</p>
              <p><strong>Matrix:</strong> ${cabinetGrid.columns} x ${cabinetGrid.rows}</p>
            </td>
            <td style="width: 50%;">
              <h4>PRICING DETAILS</h4>
              <p><strong>Unit Price:</strong> ₹${formatIndianNumber(unitPrice)}</p>
              <p><strong>Quantity:</strong> ${selectedProduct.category?.toLowerCase().includes('rental') ? Math.round(safeQuantity) + ' Cabinets' : Math.round(safeQuantity * 100) / 100 + ' Ft²'}</p>
              <p><strong>Subtotal:</strong> ₹${formatIndianNumber(subtotal)}</p>
              <p><strong>GST (18%):</strong> ₹${formatIndianNumber(gstProduct)}</p>
              <p><strong>TOTAL:</strong> ₹${formatIndianNumber(totalProduct)}</p>
            </td>
          </tr>
        </table>
      </div>
      
      ${!isJumboSeries && processor ? `
      <div class="quotation-section">
        <h2>B. CONTROL SYSTEM & ACCESSORIES</h2>
        <table>
          <tr>
            <td style="width: 50%;">
              <h4>CONTROLLER DETAILS</h4>
              <p><strong>Controller Model:</strong> ${processor}</p>
              <p><strong>Quantity:</strong> 1</p>
              <p><strong>UOM:</strong> Nos.</p>
            </td>
            <td style="width: 50%;">
              <h4>CONTROLLER PRICING</h4>
              <p><strong>Unit Price:</strong> ₹${formatIndianNumber(controllerPrice)}</p>
              <p><strong>GST (18%):</strong> ₹${formatIndianNumber(gstController)}</p>
              <p><strong>TOTAL:</strong> ₹${formatIndianNumber(totalController)}</p>
            </td>
          </tr>
        </table>
      </div>
      ` : ''}
      
      <div class="quotation-section">
        <h2>C. STRUCTURE AND INSTALLATION PRICE</h2>
        <table>
          <tr>
            <td>
              <h4>STRUCTURE + INSTALLATION TOTAL</h4>
              <p><strong>Total Area:</strong> ${screenAreaSqFt.toFixed(2)} Ft²</p>
              <p><strong>Combined Base Cost:</strong> ₹${formatIndianNumber(combinedStructureInstallationBase)}</p>
              <p><strong>Combined GST (18%):</strong> ₹${formatIndianNumber(combinedStructureInstallationGST)}</p>
              <p><strong>TOTAL:</strong> ₹${formatIndianNumber(combinedStructureInstallationTotal)}</p>
            </td>
          </tr>
        </table>
      </div>
      
      <div class="quotation-section" style="background: rgba(51, 51, 51, 0.95); color: white; text-align: center;">
        <h2 style="color: white; border-bottom: none;">GRAND TOTAL</h2>
        <p style="font-size: 16px; font-weight: bold;">₹${formatIndianNumber(grandTotal)}</p>
        <p style="font-size: 9px;">${isJumboSeries ? '(A + C)' : '(A + B + C)'}</p>
      </div>
    </div>
  </div>
  
  ${[7, 9, 10].map(i => `
    <div class="page">
      ${pageImages[i] ? `<img src="${pageImages[i]}" class="page-bg" alt="Page ${i}" />` : ''}
    </div>
  `).join('')}
</body>
</html>
  `;

  return html;
};

// Main function to generate Word document using HTML approach
export const generateWordDocument = async (data) => {
  try {
    console.log('📄 Generating Word document using HTML approach...');
    console.log('📁 Template DOCX path:', TEMPLATE_DOCX_PATH);
    console.log('📁 Template exists:', fs.existsSync(TEMPLATE_DOCX_PATH));
    
    // NOTE: This file needs to be updated to extract pages from DOCX template
    // instead of using Pages-to-JPG folder

    // Generate HTML content
    const htmlContent = generateWordHtml(data);
    
    console.log('📄 HTML content generated, length:', htmlContent.length);
    
    // Convert HTML to DOCX using html-docx-js
    const docxBlob = await asBlob(htmlContent);
    
    // Convert blob to buffer
    const buffer = Buffer.from(await docxBlob.arrayBuffer());
    
    console.log('✅ Word document generated successfully, size:', buffer.length, 'bytes');
    
    // Validate DOCX signature
    const zipSignature = Buffer.from([0x50, 0x4B]);
    const isValidDocx = buffer.slice(0, 2).equals(zipSignature);
    
    if (!isValidDocx) {
      console.warn('⚠️ Generated buffer may not be a valid DOCX file (missing ZIP signature)');
    }
    
    return buffer;

  } catch (error) {
    console.error('❌ Error generating Word document:', error);
    throw error;
  }
};

