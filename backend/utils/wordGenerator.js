import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, SectionType, Header, HeaderType, Footer, FooterType } from 'docx';
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

// Normalize user type coming from UI/legacy flows to the values expected by pricing helpers
const normalizeLegacyUserType = (userType) => {
  if (userType === 'SI/Channel Partner' || userType === 'Channel') {
    return 'Channel';
  }
  if (userType === 'Reseller') {
    return 'Reseller';
  }
  return 'End User';
};

// Get product unit price
const getProductPriceForWord = (product, userType = 'End User') => {
  const normalizedUserType = normalizeLegacyUserType(userType);
  if (product.category?.toLowerCase().includes('rental') && product.prices) {
    if (normalizedUserType === 'Reseller') {
      return product.prices.cabinet.reseller;
    } else if (normalizedUserType === 'Channel') {
      return product.prices.cabinet.siChannel;
    } else {
      return product.prices.cabinet.endCustomer;
    }
  }
  
  if (normalizedUserType === 'Reseller' && typeof product.resellerPrice === 'number') {
    return product.resellerPrice;
  } else if (normalizedUserType === 'Channel' && typeof product.siChannelPrice === 'number') {
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
      return 34.64; // Fixed area
    } else if (pixelPitch === 3 || pixelPitch === 6) {
      return 34.88; // Fixed area
    }
  }
  
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const quantity = widthInFeet * heightInFeet;
  
  return Math.round(quantity * 100) / 100;
};

// Load image file and convert to buffer
const loadImageAsBuffer = (imagePath) => {
  try {
    if (!fs.existsSync(imagePath)) {
      console.error(`Image not found: ${imagePath}`);
      return null;
    }
    const buffer = fs.readFileSync(imagePath);
    
    // Validate buffer is not empty
    if (!buffer || buffer.length === 0) {
      console.error(`Image buffer is empty: ${imagePath}`);
      return null;
    }
    
    // Validate PNG signature (first 8 bytes: 89 50 4E 47 0D 0A 1A 0A)
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    const isValidPng = buffer.slice(0, 8).equals(pngSignature);
    
    if (!isValidPng) {
      console.warn(`Image may not be valid PNG: ${imagePath}`);
    }
    
    return buffer;
  } catch (error) {
    console.error(`Error loading image ${imagePath}:`, error);
    return null;
  }
};

// Create header content with company information
const createHeader = () => {
  return new Header({
    children: [
      new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'ORION',
                        bold: true,
                        size: 24,
                      }),
                    ],
                    spacing: { after: 0, before: 0 },
                  }),
                ],
                width: { size: 20, type: WidthType.PERCENTAGE },
                margins: {
                  top: 200,
                  right: 200,
                  bottom: 200,
                  left: 200,
                },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '📧 sales@orion-led.com',
                        size: 18,
                      }),
                    ],
                    spacing: { after: 0, before: 0 },
                  }),
                ],
                width: { size: 30, type: WidthType.PERCENTAGE },
                margins: {
                  top: 200,
                  right: 200,
                  bottom: 200,
                  left: 200,
                },
              }),
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'in ORION LED | @OrionLedDisplay | @orion_led_ | ► @OrionLED',
                        size: 16,
                      }),
                    ],
                    spacing: { after: 0, before: 0 },
                    alignment: AlignmentType.RIGHT,
                  }),
                ],
                width: { size: 50, type: WidthType.PERCENTAGE },
                margins: {
                  top: 200,
                  right: 200,
                  bottom: 200,
                  left: 200,
                },
              }),
            ],
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      }),
    ],
  });
};

// Create footer content with page numbers
const createFooter = () => {
  return new Footer({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: 'ORION LED Display Solutions',
            size: 18,
            color: '666666',
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 0, before: 0 },
      }),
    ],
  });
};

// Create a page section with background image using a full-page table
// This ensures the image covers the entire page and content can be added on top
const createPageSection = (pageNumber, imageBuffer, contentChildren = []) => {
  // A4 dimensions in EMU (English Metric Units)
  // A4: 210mm x 297mm = 8.2677" x 11.6929"
  // 1 inch = 914400 EMU
  const A4_WIDTH_EMU = Math.round((210 / 25.4) * 914400);
  const A4_HEIGHT_EMU = Math.round((297 / 25.4) * 914400);
  
  // A4 dimensions in twips (1 inch = 1440 twips)
  const A4_WIDTH_TWIPS = Math.round((210 / 25.4) * 1440);
  const A4_HEIGHT_TWIPS = Math.round((297 / 25.4) * 1440);

  const children = [];

  if (imageBuffer) {
    try {
      // Convert Buffer to Uint8Array for docx library compatibility
      const uint8Array = new Uint8Array(imageBuffer);

      const imageRun = new ImageRun({
        data: uint8Array,
        transformation: {
          width: A4_WIDTH_EMU,
          height: A4_HEIGHT_EMU,
        },
      });

      // Create a full-page table with the background image
      // The image will be in the first cell, and content (if any) will be added after
      const backgroundTable = new Table({
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  // Background image paragraph
                  new Paragraph({
                    children: [imageRun],
                    spacing: { after: 0, before: 0 },
                    alignment: AlignmentType.CENTER,
                  }),
                  // Add content on top of the image (if provided)
                  ...contentChildren,
                ],
                width: { size: 100, type: WidthType.PERCENTAGE },
                margins: {
                  top: 0,
                  right: 0,
                  bottom: 0,
                  left: 0,
                },
                verticalAlign: 'top',
              }),
            ],
            height: {
              value: A4_HEIGHT_TWIPS,
              rule: 'exact',
            },
          }),
        ],
        width: { size: 100, type: WidthType.PERCENTAGE },
      });

      children.push(backgroundTable);

    } catch (error) {
      console.error(`❌ Error creating ImageRun for page ${pageNumber}:`, error);
      console.error(`❌ Error stack:`, error.stack);
      children.push(
        new Paragraph({
          children: [new TextRun(`[Page ${pageNumber} - Error: ${error.message}]`)],
          spacing: { after: 0, before: 0 },
        })
      );
    }
  } else {
    console.warn(`⚠️ No image buffer for page ${pageNumber}, creating page with content only`);
    if (contentChildren.length > 0) {
      children.push(...contentChildren);
    } else {
      children.push(
        new Paragraph({
          children: [new TextRun(`[Page ${pageNumber} - Image not found]`)],
          spacing: { after: 0, before: 0 },
        })
      );
    }
  }

  // Create header and footer for this section
  const header = createHeader();
  const footer = createFooter();

  return {
    properties: {
      page: {
        size: {
          width: A4_WIDTH_TWIPS,
          height: A4_HEIGHT_TWIPS,
        },
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
      },
      headers: {
        default: header,
      },
      footers: {
        default: footer,
      },
      sectionType: SectionType.NEXT_PAGE,
    },
    children: children,
  };
};

// Create quotation content for page 6 with proper formatting
const createQuotationContent = (data) => {
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

  // Calculate pricing using exact PDF logic
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
    // Structure Price: Indoor = ₹4000 per cabinet, Outdoor = ₹2500 per sq.ft
    const normalizedEnv = selectedProduct.environment?.toLowerCase().trim();
    if (normalizedEnv === 'indoor') {
      // Indoor: ₹4000 per cabinet
      const numberOfCabinets = cabinetGrid.columns * cabinetGrid.rows;
      structureBasePrice = numberOfCabinets * 4000;
    } else {
      // Outdoor: ₹2500 per sq.ft
      structureBasePrice = screenAreaSqFt * 2500;
    }
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

  const children = [];

  // Quotation Header - positioned at top
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Quotation #: ${quotationId || 'ORION/2025/07/Prachi/0193'}`,
          bold: true,
          size: 22, // 11pt
        }),
      ],
      spacing: { after: 120, before: 0 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Date: ${new Date().toLocaleDateString('en-GB')}`,
          bold: true,
          size: 22,
        }),
      ],
      spacing: { after: 240, before: 0 },
    })
  );

  // Client Information Section
  if (userInfo) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'CLIENT INFORMATION',
            bold: true,
            size: 24, // 12pt
            color: '333333',
          }),
        ],
        spacing: { after: 120, before: 0 },
        border: {
          bottom: {
            color: '333333',
            size: 20,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    // Client Details Table - Two columns with equal width
    const clientTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'CLIENT DETAILS', bold: true, size: 22 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Name: ${userInfo.fullName}`, bold: true, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Email: ${userInfo.email}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Phone: ${userInfo.phoneNumber}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                ...(userInfo.projectTitle ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Project Title: ${userInfo.projectTitle}`, size: 20 }),
                    ],
                    spacing: { after: 80 },
                  })
                ] : []),
                ...(userInfo.address ? [
                  new Paragraph({
                    children: [
                      new TextRun({ text: `Address: ${userInfo.address}`, size: 20 }),
                    ],
                  })
                ] : []),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'ORION SALES TEAM', bold: true, size: 22 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Location: ${salesUser?.location || 'Delhi'}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Sales Person: ${salesUser?.name || 'Ashwani Yadav'}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Contact: ${getSalesPhoneNumber(salesUser)}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Email: ${salesUser?.email || 'ashwani.yadav@orion-led.com'}`, size: 20 }),
                  ],
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [50, 50], // Equal column widths
    });

    children.push(clientTable);
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
  }

  // Section A: Product Description
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'A. PRODUCT DESCRIPTION',
          bold: true,
          size: 28, // 14pt
          color: '2563eb',
        }),
      ],
      spacing: { after: 120, before: 0 },
      border: {
        bottom: {
          color: '2563eb',
          size: 40,
          style: BorderStyle.SINGLE,
        },
      },
    })
  );

    // Product Details Table - Two columns with equal width
    const productTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'PRODUCT SPECIFICATIONS', bold: true, size: 22 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Series/Environment: ${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Pixel Pitch: P${selectedProduct.pixelPitch}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Cabinet Dimension: ${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height} mm`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Display Size (m): ${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Display Size (ft): ${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Resolution: ${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Matrix: ${cabinetGrid.columns} x ${cabinetGrid.rows}`, size: 20 }),
                  ],
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'PRICING DETAILS', bold: true, size: 22 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Unit Price: ₹${formatIndianNumber(unitPrice)}`, bold: true, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ 
                      text: `Quantity: ${selectedProduct.category?.toLowerCase().includes('rental') ? Math.round(safeQuantity) + ' Cabinets' : Math.round(safeQuantity * 100) / 100 + ' Ft²'}`, 
                      size: 20 
                    }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Subtotal: ₹${formatIndianNumber(subtotal)}`, bold: true, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `GST (18%): ₹${formatIndianNumber(gstProduct)}`, bold: true, color: 'dc3545', size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'TOTAL:', bold: true, size: 22 }),
                    new TextRun({ text: ` ₹${formatIndianNumber(totalProduct)}`, bold: true, size: 22 }),
                  ],
                  spacing: { after: 0 },
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [50, 50], // Equal column widths
    });

  children.push(new Paragraph({ text: '', spacing: { after: 240 } }));

  // Section B: Control System (if not Jumbo Series)
  if (!isJumboSeries && processor) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'B. CONTROL SYSTEM & ACCESSORIES',
            bold: true,
            size: 26, // 13pt
            color: '2563eb',
          }),
        ],
        spacing: { after: 120, before: 0 },
        border: {
          bottom: {
            color: '2563eb',
            size: 40,
            style: BorderStyle.SINGLE,
          },
        },
      })
    );

    const controllerTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'CONTROLLER DETAILS', bold: true, size: 20 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Controller Model: ${processor || "Nova TB2"}`, size: 18 }),
                  ],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'Quantity: 1', size: 18 }),
                  ],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'UOM: Nos.', size: 18 }),
                  ],
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'CONTROLLER PRICING', bold: true, size: 20 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Unit Price: ₹${formatIndianNumber(controllerPrice)}`, bold: true, size: 18 }),
                  ],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `GST (18%): ₹${formatIndianNumber(gstController)}`, bold: true, color: 'dc3545', size: 18 }),
                  ],
                  spacing: { after: 60 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'TOTAL:', bold: true, size: 20 }),
                    new TextRun({ text: ` ₹${formatIndianNumber(totalController)}`, bold: true, size: 20 }),
                  ],
                }),
              ],
              width: { size: 50, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
      columnWidths: [50, 50], // Equal column widths
    });

    children.push(controllerTable);
    children.push(new Paragraph({ text: '', spacing: { after: 240 } }));
  }

  // Section C: Structure and Installation
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'C. STRUCTURE AND INSTALLATION PRICE',
          bold: true,
          size: 28,
          color: '2563eb',
        }),
      ],
      spacing: { after: 120, before: 0 },
      border: {
        bottom: {
          color: '2563eb',
          size: 40,
          style: BorderStyle.SINGLE,
        },
      },
    })
  );

    const structureTable = new Table({
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: 'STRUCTURE + INSTALLATION TOTAL', bold: true, size: 22 }),
                  ],
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Total Area: ${screenAreaSqFt.toFixed(2)} Ft²`, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Combined Base Cost: ₹${formatIndianNumber(combinedStructureInstallationBase)}`, bold: true, size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: `Combined GST (18%): ₹${formatIndianNumber(combinedStructureInstallationGST)}`, bold: true, color: 'dc3545', size: 20 }),
                  ],
                  spacing: { after: 80 },
                }),
                new Paragraph({
                  children: [
                    new TextRun({ text: 'TOTAL:', bold: true, size: 22 }),
                    new TextRun({ text: ` ₹${formatIndianNumber(combinedStructureInstallationTotal)}`, bold: true, size: 22 }),
                  ],
                }),
              ],
              width: { size: 100, type: WidthType.PERCENTAGE },
              margins: {
                top: 200,
                right: 200,
                bottom: 200,
                left: 200,
              },
            }),
          ],
        }),
      ],
      width: { size: 100, type: WidthType.PERCENTAGE },
    });

  children.push(structureTable);
  children.push(new Paragraph({ text: '', spacing: { after: 240 } }));

  // Grand Total
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: 'GRAND TOTAL',
          bold: true,
          size: 26,
          color: 'ffffff',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 80, before: 0 },
      shading: {
        fill: '333333',
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `₹${formatIndianNumber(grandTotal)}`,
          bold: true,
          size: 32, // 16pt
          color: 'ffffff',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40, before: 0 },
      shading: {
        fill: '333333',
      },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: isJumboSeries ? '(A + C)' : '(A + B + C)',
          size: 18,
          color: 'ffffff',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0, before: 0 },
      shading: {
        fill: '333333',
      },
    })
  );

  return children;
};

// Main function to generate Word document
export const generateWordDocument = async (data) => {
  try {
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

    // NOTE: This file needs to be updated to extract pages from DOCX template
    // instead of using Pages-to-JPG folder
    // For now, we'll use placeholder logic

    // A4 dimensions in twips (1 inch = 1440 twips)
    // A4: 210mm x 297mm = 8.2677" x 11.6929"
    const A4_WIDTH_TWIPS = Math.round((210 / 25.4) * 1440);
    const A4_HEIGHT_TWIPS = Math.round((297 / 25.4) * 1440);

    const sections = [];

    // Pages 1-5: Extract from DOCX template
    // TODO: Implement DOCX page extraction and conversion to images
    // For now, using placeholder - pages will be extracted from DOCX template
    // Template Page 1 → Final Page 1, Template Page 2 → Final Page 2, etc.
    for (let i = 1; i <= 5; i++) {
      // TODO: Extract page i from DOCX template and convert to image buffer
      // const pageImageBuffer = await extractPageFromDocx(i);
      const imageBuffer = null; // Placeholder - needs implementation
      
      if (!imageBuffer) {
        console.warn(`⚠️ Page ${i} image not yet extracted from DOCX template (needs implementation)`);
      }
      
      const section = createPageSection(i, imageBuffer, []);
      sections.push(section);

    }

    // Page 6: Dynamically generated quotation (NO background from template)
    // Template Page 6 is SKIPPED - we use dynamic quotation content
    const page6ImageBuffer = null; // No background from template for page 6
    
    const quotationContent = createQuotationContent({
      config,
      selectedProduct,
      cabinetGrid,
      processor,
      userInfo,
      salesUser,
      quotationId,
      customPricing
    });

    // For page 6, create section with background image and quotation content
    // The content will be added on top of the background image in the same table cell
    const page6Section = createPageSection(6, page6ImageBuffer, quotationContent);
    sections.push(page6Section);

    // Pages 7+: Extract from DOCX template (skip template page 6)
    // Template Page 7 → Final Page 7, Template Page 8 → Final Page 8, etc.
    // TODO: Implement DOCX page extraction for pages 7+
    // For now, this is a placeholder
    // Note: Template page 6 is skipped as it's replaced by dynamic quotation

    // Validate we have sections
    if (sections.length === 0) {
      throw new Error('No sections created for Word document');
    }

    // Create document with proper structure
    // Each section already has SectionType.NEXT_PAGE in its properties
    const doc = new Document({
      creator: 'ORION LED Configurator',
      title: 'Configuration Quotation',
      description: 'LED Display Configuration Quotation',
      sections: sections,
    });

    // Generate buffer with error handling
    let buffer;
    try {
      buffer = await Packer.toBuffer(doc);
    } catch (error) {
      console.error('❌ Error packing document to buffer:', error);
      throw new Error(`Failed to pack document: ${error.message}`);
    }
    
    // Validate buffer
    if (!buffer || buffer.length === 0) {
      throw new Error('Generated buffer is empty');
    }
    
    // Validate DOCX signature (ZIP file signature: PK)
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
