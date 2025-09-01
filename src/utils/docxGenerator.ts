import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun } from 'docx';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import { QuoteRequest } from '../api/quote';

// Function to load image as ArrayBuffer
const loadImage = async (imagePath: string): Promise<ArrayBuffer> => {
  const response = await fetch(imagePath);
  return await response.arrayBuffer();
};

export const generateConfigurationDocx = async (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  mode?: string,
  userInfo?: UserInfo,
  salesUser?: { email: string; name: string } | null
): Promise<Blob> => {
  // Calculate display area
  const METERS_TO_FEET = 3.2808399;
  const toDisplayUnit = (mm: number, unit: string) => {
    const meters = mm / 1000;
    if (unit === 'ft') {
      return (meters * METERS_TO_FEET).toFixed(2);
    }
    return meters.toFixed(2);
  };

  const displayedWidth = parseFloat(toDisplayUnit(config.width, config.unit));
  const displayedHeight = parseFloat(toDisplayUnit(config.height, config.unit));
  const displayAreaFeet = displayedWidth * displayedHeight;
  const displayArea = (config.width * config.height) / 1000000; // mm² to m²
  const displayAreaInDisplayUnit = config.unit === 'ft' ? displayAreaFeet : displayArea;

  // Calculate power consumption
  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7;
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3);
  const avgPower = (avgPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);
  const maxPower = (maxPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);

  // Calculate total pixels
  const totalPixels = selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows;

  // Calculate pricing based on actual product data and user type
  const getProductPrice = (product: Product, userType: 'End User' | 'Reseller' | 'Channel'): number => {
    // Handle different product types
    if (product.category?.toLowerCase().includes('rental') && product.prices) {
      // For rental products, use cabinet pricing based on user type
      if (userType === 'Reseller') {
        return product.prices.cabinet.reseller;
      } else if (userType === 'Channel') {
        return product.prices.cabinet.siChannel;
      } else {
        return product.prices.cabinet.endCustomer;
      }
    }
    
    // For regular products, use the appropriate price field based on user type
    if (userType === 'Reseller' && typeof product.resellerPrice === 'number') {
      return product.resellerPrice;
    } else if (userType === 'Channel' && typeof product.siChannelPrice === 'number') {
      return product.siChannelPrice;
    } else if (typeof product.price === 'number') {
      return product.price;
    }
    
    // Fallback to default pricing if no price available
    return 5300;
  };

  const unitPrice = getProductPrice(selectedProduct, userInfo?.userType || 'End User');
  
  // Always calculate quantity in square feet, regardless of selected display unit
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const quantity = widthInFeet * heightInFeet;
  
  // Ensure quantity is a reasonable number and handle edge cases
  const safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  const subtotal = unitPrice * safeQuantity;
  const gstProduct = subtotal * 0.28;
  const totalProduct = subtotal + gstProduct;
  
  // Controller pricing - use actual controller price if available
  const controllerPrice = 35000; // Default controller price
  const gstController = controllerPrice * 0.18;
  const totalController = controllerPrice + gstController;
  const grandTotal = totalProduct + totalController;

  // Helper function to format price or show NA
  const formatPrice = (price: number | undefined | string | null): string => {
    if (price === undefined || price === null || price === "NA" || price === "na") {
      return "NA";
    }
    if (typeof price === 'number') {
      // Round to whole numbers for currency
      const roundedPrice = Math.round(price);
      return `₹${roundedPrice.toLocaleString()}`;
    }
    return "NA";
  };

  // Load images
  const imagePaths = [
    '/Pages to JPG/Indian Industries Association_page-0001.jpg',
    '/Pages to JPG/Indian Industries Association_page-0002.jpg',
    '/Pages to JPG/Indian Industries Association_page-0003.jpg',
    '/Pages to JPG/Indian Industries Association_page-0004.jpg',
    '/Pages to JPG/Indian Industries Association_page-0005.jpg',
    '/Pages to JPG/Indian Industries Association_page-0007.jpg',
    '/Pages to JPG/Indian Industries Association_page-0008.jpg',
    '/Pages to JPG/Indian Industries Association_page-0009.jpg',
    '/Pages to JPG/Indian Industries Association_page-0010.jpg'
  ];

  const images = await Promise.all(
    imagePaths.map(async (path) => {
      try {
        const arrayBuffer = await loadImage(path);
        return new ImageRun({
          data: arrayBuffer,
          transformation: {
            width: 600,
            height: 800,
          },
        });
      } catch (error) {
        console.error(`Failed to load image: ${path}`, error);
        return null;
      }
    })
  );

  // Create document with proper page breaks and layout
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: 720, // 0.5 inch
            right: 720,
            bottom: 720,
            left: 720,
          },
        },
      },
      children: [
        // First 5 images as full pages with page breaks
        ...images.slice(0, 5).filter(Boolean).map((image, index) => 
          new Paragraph({
            children: [image!],
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            pageBreakBefore: index === 0 ? false : true,
          })
        ),

        // Configuration page with page break
        new Paragraph({
          children: [],
          pageBreakBefore: true,
        }),

        // Company header section - compact
        new Paragraph({
          children: [
            new TextRun({
              text: "ATENTI ORIGINS",
              bold: true,
              size: 24,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "ATENTI ORIGINS PHOTOELECTRICITY CONSORT PVT.LTD.",
              size: 18,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Reg. Office: 504, 5th Floor ABW Elegance Tower, Jasola District Centre, Jasola, New Delhi 110025",
              size: 14,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 50 }
        }),

        new Paragraph({
          children: [
            new TextRun({
              text: "Factory: B-10, Sector-88, Noida - 201301",
              size: 14,
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),

        // Quotation title - compact
        new Paragraph({
          children: [
            new TextRun({
              text: "QUOTATION",
              bold: true,
              size: 28,
              color: "FFFFFF",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 150, after: 150 },
          shading: {
            fill: "2C3E50",
          },
        }),

        // Quotation details table - compact
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          margins: { top: 200, bottom: 200, left: 100, right: 100 },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Quotation #:",
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 50 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "ORION/2025/07/Prachi/0193",
                          size: 16,
                        }),
                      ],
                      spacing: { before: 50, after: 100 }
                    }),
                  ],
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                  margins: { top: 400, bottom: 400, left: 400, right: 400 },
                  shading: { fill: "F8F9FA" },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                  },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "Date:",
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 200, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: new Date().toLocaleDateString('en-GB'),
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 200 }
                    }),
                  ],
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                  margins: { top: 400, bottom: 400, left: 400, right: 400 },
                  shading: { fill: "F8F9FA" },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                  },
                }),
              ],
            }),
          ],
        }),

        // Client information if available
        ...(userInfo ? [
          new Paragraph({
            children: [
              new TextRun({
                text: "CLIENT INFORMATION",
                bold: true,
                size: 22,
              }),
            ],
            spacing: { before: 200, after: 150 }
          }),

          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE,
            },
            margins: { top: 200, bottom: 200, left: 100, right: 100 },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                                                  new TextRun({
                          text: "CLIENT DETAILS",
                          bold: true,
                          size: 18,
                        }),
                        ],
                        spacing: { before: 200, after: 200 }
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Name:`,
                            bold: true,
                            size: 18,
                          }),
                          new TextRun({
                            text: ` ${userInfo.fullName}`,
                            size: 18,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                        line: 360
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Email:`,
                            bold: true,
                            size: 18,
                          }),
                          new TextRun({
                            text: ` ${userInfo.email}`,
                            size: 18,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                        line: 360
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Phone:`,
                            bold: true,
                            size: 18,
                          }),
                          new TextRun({
                            text: ` ${userInfo.phoneNumber}`,
                            size: 18,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                        line: 360
                      }),
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    },
                    margins: { top: 400, bottom: 400, left: 400, right: 400 },
                    shading: { fill: "F8F9FA" },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    },
                  }),
                  new TableCell({
                    children: [
                      new Paragraph({
                        children: [
                                                  new TextRun({
                          text: "ORION SALES TEAM",
                          bold: true,
                          size: 18,
                        }),
                        ],
                        spacing: { before: 200, after: 200 }
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Location:`,
                            bold: true,
                            size: 18,
                          }),
                          new TextRun({
                            text: ` Delhi`,
                            size: 18,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                        line: 360
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Sales Person:`,
                            bold: true,
                            size: 18,
                          }),
                          new TextRun({
                            text: ` ${salesUser ? salesUser.name : 'Ashwani Yadav'}`,
                            size: 18,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                        line: 360
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Contact:`,
                            bold: true,
                            size: 18,
                          }),
                          new TextRun({
                            text: ` 98391 77083`,
                            size: 18,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                        line: 360
                      }),
                      new Paragraph({
                        children: [
                          new TextRun({
                            text: `Email:`,
                            bold: true,
                            size: 18,
                          }),
                          new TextRun({
                            text: ` ${salesUser ? salesUser.email : 'ashwani.yadav@orion-led.com'}`,
                            size: 18,
                          }),
                        ],
                        spacing: { before: 100, after: 100 },
                        line: 360
                      }),
                    ],
                    width: {
                      size: 50,
                      type: WidthType.PERCENTAGE,
                    },
                    margins: { top: 400, bottom: 400, left: 400, right: 400 },
                    shading: { fill: "F8F9FA" },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    },
                  }),
                ],
              }),
            ],
          }),
        ] : []),

        // Section A: Product Description
        new Paragraph({
          children: [
            new TextRun({
              text: "A. PRODUCT DESCRIPTION",
              bold: true,
              size: 22,
            }),
          ],
          spacing: { before: 200, after: 150 }
        }),

        // Product specifications and pricing in two-column layout with exact HTML styling
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          margins: { top: 400, bottom: 400, left: 200, right: 200 },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "PRODUCT SPECIFICATIONS",
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 200, after: 200 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Series/Environment:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 200, after: 200 },
                      line: 360
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Pixel Pitch:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` P${selectedProduct.pixelPitch}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Module Dimension:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height} mm`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Display Size (m):`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Display Size (ft):`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Resolution:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Matrix:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${cabinetGrid.columns} x ${cabinetGrid.rows}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                  ],
                  width: {
                    size: 60,
                    type: WidthType.PERCENTAGE,
                  },
                  shading: {
                    fill: "F8F9FA",
                  },
                                       borders: {
                       top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                       bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                       left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                       right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                     },
                  margins: { top: 400, bottom: 400, left: 400, right: 400 },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "PRICING DETAILS",
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 300, after: 300 },
                      line: 360
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Unit Price:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(unitPrice)}`,
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Quantity:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${Math.round(safeQuantity * 100) / 100} Ft²`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Subtotal:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(subtotal)}`,
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `GST (28%):`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(gstProduct)}`,
                          bold: true,
                          size: 18,
                          color: "DC3545",
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `TOTAL:`,
                          bold: true,
                          size: 20,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(totalProduct)}`,
                          bold: true,
                          size: 20,
                        }),
                      ],
                      spacing: { before: 100, after: 100 }
                    }),
                  ],
                                      width: {
                      size: 40,
                      type: WidthType.PERCENTAGE,
                    },
                    shading: {
                      fill: "F8F9FA",
                    },
                    borders: {
                      top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                      right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    },
                    margins: { top: 400, bottom: 400, left: 400, right: 400 },
                }),
              ],
            }),
          ],
        }),

        // TOTAL A section - compact
        new Paragraph({
          children: [
            new TextRun({
              text: `TOTAL A: ${formatPrice(totalProduct)}`,
              bold: true,
              size: 20,
              color: "FFFFFF",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 150, after: 150 },
          shading: {
            fill: "2C3E50",
          },
        }),

        // Section B: Control System - compact
        new Paragraph({
          children: [
            new TextRun({
              text: "B. CONTROL SYSTEM & ACCESSORIES",
              bold: true,
              size: 22,
            }),
          ],
          spacing: { before: 200, after: 150 }
        }),

        // Controller details table with improved styling
        new Table({
          width: {
            size: 100,
            type: WidthType.PERCENTAGE,
          },
          margins: { top: 400, bottom: 400, left: 200, right: 200 },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "CONTROLLER DETAILS",
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 200, after: 200 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Controller Model:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${processor || "Nova TB2"}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 },
                      line: 360
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Quantity:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` 1`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 },
                      line: 360
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `UOM:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` Nos.`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 },
                      line: 360
                    }),
                  ],
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                  margins: { top: 400, bottom: 400, left: 400, right: 400 },
                  shading: { fill: "F8F9FA" },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                  },
                }),
                new TableCell({
                  children: [
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: "CONTROLLER PRICING",
                          bold: true,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 200, after: 200 }
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `Unit Price:`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(controllerPrice)}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 },
                      line: 360
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `GST (18%):`,
                          bold: true,
                          size: 18,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(gstController)}`,
                          size: 18,
                        }),
                      ],
                      spacing: { before: 100, after: 100 },
                      line: 360
                    }),
                    new Paragraph({
                      children: [
                        new TextRun({
                          text: `TOTAL B:`,
                          bold: true,
                          size: 20,
                        }),
                        new TextRun({
                          text: ` ${formatPrice(controllerPrice + gstController)}`,
                          bold: true,
                          size: 20,
                        }),
                      ],
                      spacing: { before: 100, after: 100 },
                      line: 360
                    }),
                  ],
                  width: {
                    size: 50,
                    type: WidthType.PERCENTAGE,
                  },
                  margins: { top: 400, bottom: 400, left: 400, right: 400 },
                  shading: { fill: "F8F9FA" },
                  borders: {
                    top: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    bottom: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    left: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                    right: { style: BorderStyle.SINGLE, size: 0.5, color: "E9ECEF" },
                  },
                }),
              ],
            }),
          ],
        }),

        // Grand Total - compact
        new Paragraph({
          children: [
            new TextRun({
              text: `GRAND TOTAL: ${formatPrice((subtotal + gstProduct) + (controllerPrice + gstController))}`,
              bold: true,
              size: 24,
              color: "FFFFFF",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 200 },
          shading: {
            fill: "2C3E50",
          },
        }),

        // Add remaining images with page breaks
        ...images.slice(5).filter(Boolean).map((image, index) => 
          new Paragraph({
            children: [image!],
            alignment: AlignmentType.CENTER,
            spacing: { after: 0 },
            pageBreakBefore: true,
          })
        ),

        // Footer - compact
        new Paragraph({
          children: [
            new TextRun({
              text: "Valid for 30 days from the date of quotation",
              size: 14,
              color: "666666",
            }),
          ],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 100 }
        }),
      ]
    }]
  });

  return await Packer.toBlob(doc);
};

interface UserInfo {
  fullName: string;
  email: string;
  phoneNumber: string;
  userType: 'End User' | 'Reseller' | 'Channel';
}

// Function to generate HTML preview of the configuration
export const generateConfigurationHtml = (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  mode?: string,
  userInfo?: UserInfo,
  salesUser?: { email: string; name: string } | null
): string => {
  // Calculate display area
  const METERS_TO_FEET = 3.2808399;
  const toDisplayUnit = (mm: number, unit: string) => {
    const meters = mm / 1000;
    if (unit === 'ft') {
      return (meters * METERS_TO_FEET).toFixed(2);
    }
    return meters.toFixed(2);
  };

  const displayedWidth = parseFloat(toDisplayUnit(config.width, config.unit));
  const displayedHeight = parseFloat(toDisplayUnit(config.height, config.unit));
  const displayAreaFeet = displayedWidth * displayedHeight;
  const displayArea = (config.width * config.height) / 1000000; // mm² to m²
  const displayAreaInDisplayUnit = config.unit === 'ft' ? displayAreaFeet : displayArea;

  // Calculate diagonal
  const diagonalMeters = Math.sqrt(Math.pow(config.width/1000, 2) + Math.pow(config.height/1000, 2));
  const diagonalInDisplayUnit = config.unit === 'ft' ? diagonalMeters * METERS_TO_FEET : diagonalMeters;
  const diagonalInches = diagonalMeters * 39.3701;
  const feet = Math.floor(diagonalInches / 12);
  const inches = Math.round((diagonalInches % 12) * 16) / 16;

  // Calculate power consumption
  const avgPowerPerCabinet = selectedProduct.avgPowerConsumption || 91.7;
  const maxPowerPerCabinet = selectedProduct.maxPowerConsumption || (avgPowerPerCabinet * 3);
  const avgPower = (avgPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);
  const maxPower = (maxPowerPerCabinet * cabinetGrid.columns * cabinetGrid.rows).toFixed(2);

  // Calculate total pixels
  const totalPixels = selectedProduct.resolution.width * cabinetGrid.columns * selectedProduct.resolution.height * cabinetGrid.rows;

  // Calculate pricing based on actual product data and user type
  const getProductPrice = (product: Product, userType: 'End User' | 'Reseller' | 'Channel'): number => {
    // Handle different product types
    if (product.category?.toLowerCase().includes('rental') && product.prices) {
      // For rental products, use cabinet pricing based on user type
      if (userType === 'Reseller') {
        return product.prices.cabinet.reseller;
      } else if (userType === 'Channel') {
        return product.prices.cabinet.siChannel;
      } else {
        return product.prices.cabinet.endCustomer;
      }
    }
    
    // For regular products, use the appropriate price field based on user type
    if (userType === 'Reseller' && typeof product.resellerPrice === 'number') {
      return product.resellerPrice;
    } else if (userType === 'Channel' && typeof product.siChannelPrice === 'number') {
      return product.siChannelPrice;
    } else if (typeof product.price === 'number') {
      return product.price;
    }
    
    // Fallback to default pricing if no price available
    return 5300;
  };

  const unitPrice = getProductPrice(selectedProduct, userInfo?.userType || 'End User');
  
  // Always calculate quantity in square feet, regardless of selected display unit
  const widthInMeters = config.width / 1000;
  const heightInMeters = config.height / 1000;
  const widthInFeet = widthInMeters * METERS_TO_FEET;
  const heightInFeet = heightInMeters * METERS_TO_FEET;
  const quantity = widthInFeet * heightInFeet;
  
  // Ensure quantity is a reasonable number and handle edge cases
  const safeQuantity = isNaN(quantity) || quantity <= 0 ? 1 : Math.max(0.01, Math.min(quantity, 10000));
  const subtotal = unitPrice * safeQuantity;
  const gstProduct = subtotal * 0.28;
  const totalProduct = subtotal + gstProduct;
  
  // Controller pricing - use actual controller price if available
  const controllerPrice = 35000; // Default controller price
  const gstController = controllerPrice * 0.18;
  const totalController = controllerPrice + gstController;
  const grandTotal = totalProduct + totalController;

  // Format Indian number with clean formatting
  const formatIndianNumber = (x: number): string => {
    // Round to whole numbers for cleaner display
    const rounded = Math.round(x);
    
    // Convert to string
    const s = rounded.toString();
    
    // Format with Indian numbering system (commas for thousands)
    if (s.length > 3) {
      const lastThree = s.slice(-3);
      const remaining = s.slice(0, s.length - 3);
      const formatted = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + lastThree;
      return formatted;
    }
    return s;
  };

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ORION LED - Configuration Report</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                line-height: 1.6;
                color: #333;
                margin: 0;
                padding: 0;
                background-color: #f8f9fa;
            }
            .page {
                width: 180mm;
                min-height: 250mm;
                margin: 15px auto;
                background: white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                justify-content: center;
                page-break-after: always;
                overflow: hidden;
            }
            .page img {
                max-width: 95%;
                max-height: 95%;
                object-fit: contain;
            }
            .page:last-child {
                page-break-after: auto;
            }
            @media print {
                .page {
                    margin: 0;
                    box-shadow: none;
                    page-break-after: always;
                }
            }
        </style>
    </head>
    <body>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0001.jpg" alt="Page 1" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0002.jpg" alt="Page 2" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0003.jpg" alt="Page 3" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0004.jpg" alt="Page 4" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0005.jpg" alt="Page 5" />
        </div>
        <div class="page" style="padding: 15px; padding-bottom: 40px; display: block; text-align: left; font-size: 0.8em; line-height: 1.4; background: #ffffff; min-height: 100vh; overflow-y: auto;">
            <!-- Clean Header with Company Info -->
            <div style="background: #f8f9fa; color: #333; padding: 15px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #e9ecef;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <!-- Left Side - Logo Area -->
                    <div style="flex-shrink: 0;">
                        <div style="background: white; width: 60px; height: 60px; border-radius: 8px; display: flex; align-items: center; justify-content: center; border: 1px solid #e9ecef;">
                            <img src="https://orion-led.com/wp-content/uploads/2025/06/logo-white-1.png" alt="ORION LED Logo" style="width: 50px; height: 50px; object-fit: contain;">
                        </div>
                    </div>
                    
                    <!-- Right Side - Company Info -->
                    <div style="flex: 1;">
                        <h2 style="color: #333; font-size: 1.1em; margin: 0 0 4px 0; font-weight: bold;">ATENTI ORIGINS</h2>
                        <p style="color: #666; font-size: 0.8em; margin: 1px 0; font-weight: 500;">
                            ATENTI ORIGINS PHOTOELECTRICITY CONSORT PVT.LTD.
                        </p>
                        <p style="color: #666; font-size: 0.7em; margin: 1px 0;">
                            Reg. Office: 504, 5th Floor ABW Elegance Tower, Jasola District Centre, Jasola, New Delhi 110025
                        </p>
                        <p style="color: #666; font-size: 0.7em; margin: 1px 0;">
                            Factory: B-10, Sector-88, Noida - 201301
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- Clean QUOTATION title -->
            <div style="background: #333; color: white; padding: 12px; text-align: center; margin: 20px 0; border-radius: 8px;">
                <h1 style="margin: 0; font-size: 1.3em; font-weight: bold;">QUOTATION</h1>
            </div>
            
            <!-- Quotation Details -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="flex: 1;">
                        <p style="margin: 5px 0; font-size: 0.9em; color: #333;"><strong>Quotation #:</strong> <span style="color: #333; font-weight: bold;">ORION/2025/07/Prachi/0193</span></p>
                        <p style="margin: 5px 0; font-size: 0.9em; color: #333;"><strong>Date:</strong> <span style="color: #333; font-weight: bold;">${new Date().toLocaleDateString('en-GB')}</span></p>
                    </div>
                </div>
            </div>
              
              ${userInfo ? `
              <!-- Clean Client Information Section -->
              <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e9ecef;">
                  <h3 style="color: #333; margin: 0 0 12px 0; font-size: 1em; border-bottom: 2px solid #333; padding-bottom: 6px;">
                      CLIENT INFORMATION
                  </h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                      <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef;">
                          <h4 style="margin: 0 0 8px 0; color: #333; font-size: 0.9em; font-weight: bold;">CLIENT DETAILS</h4>
                          <p style="margin: 4px 0; font-weight: bold; color: #333;">Name: ${userInfo.fullName}</p>
                          <p style="margin: 4px 0; color: #666;">Email: ${userInfo.email}</p>
                          <p style="margin: 4px 0; color: #666;">Phone: ${userInfo.phoneNumber}</p>
                      </div>
                      <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e9ecef;">
                          <h4 style="margin: 0 0 8px 0; color: #333; font-size: 0.9em; font-weight: bold;">ORION SALES TEAM</h4>
                          <p style="margin: 4px 0; color: #666;">Location: Delhi</p>
                          <p style="margin: 4px 0; color: #666;">Sales Person: ${salesUser ? salesUser.name : 'Ashwani Yadav'}</p>
                          <p style="margin: 4px 0; color: #666;">Contact: 98391 77083</p>
                          <p style="margin: 4px 0; color: #666;">Email: ${salesUser ? salesUser.email : 'ashwani.yadav@orion-led.com'}</p>
                      </div>
                  </div>
              </div>
              ` : ''}
              
              <!-- Section A: Product Description - Clean Layout -->
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
                <h2 style="color: #333; margin: 0 0 15px 0; font-size: 1.1em; border-bottom: 2px solid #333; padding-bottom: 8px;">
                    A. PRODUCT DESCRIPTION
                </h2>
                
                <div style="display: grid; grid-template-columns: 1.4fr 0.8fr; gap: 25px; margin: 15px 0;">
                    <!-- Left Column - Specifications -->
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; border: 1px solid #e9ecef;">
                        <h4 style="margin: 0 0 15px 0; color: #333; font-size: 1.1em; font-weight: bold;">PRODUCT SPECIFICATIONS</h4>
                        <div style="space-y: 10px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Series/Environment:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">${selectedProduct.category}, ${selectedProduct.environment.charAt(0).toUpperCase() + selectedProduct.environment.slice(1)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Pixel Pitch:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">P${selectedProduct.pixelPitch}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Module Dimension:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">${selectedProduct.cabinetDimensions.width} x ${selectedProduct.cabinetDimensions.height} mm</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Display Size (m):</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">${toDisplayUnit(config.width, 'm')} x ${toDisplayUnit(config.height, 'm')}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Display Size (ft):</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">${toDisplayUnit(config.width, 'ft')} x ${toDisplayUnit(config.height, 'ft')}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Resolution:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">${selectedProduct.resolution.width * cabinetGrid.columns} x ${selectedProduct.resolution.height * cabinetGrid.rows}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Matrix:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">${cabinetGrid.columns} x ${cabinetGrid.rows}</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column - Pricing -->
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 8px; border: 1px solid #e9ecef;">
                        <h4 style="margin: 0 0 8px 0; color: #333; font-size: 0.9em; font-weight: bold;">PRICING DETAILS</h4>
                        <div style="space-y: 4px;">
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.8em;">Unit Price:</span>
                                <span style="color: #333; font-weight: 700; font-size: 0.8em;">₹${formatIndianNumber(unitPrice)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.8em;">Quantity:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.8em;">${Math.round(safeQuantity * 100) / 100} Ft²</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.8em;">Subtotal:</span>
                                <span style="color: #333; font-weight: 700; font-size: 0.8em;">₹${formatIndianNumber(subtotal)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.8em;">GST (28%):</span>
                                <span style="color: #dc3545; font-weight: 700; font-size: 0.8em;">₹${formatIndianNumber(gstProduct)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; background: white; margin: 0 -8px; padding: 6px 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                                <span style="font-weight: 700; color: #333; font-size: 0.85em;">TOTAL:</span>
                                <span style="color: #333; font-weight: 700; font-size: 0.85em;">₹${formatIndianNumber(totalProduct)}</span>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div style="background: #333; color: white; padding: 12px; border-radius: 6px; margin-top: 15px; text-align: center;">
                    <p style="margin: 0; font-size: 1em; font-weight: bold;">TOTAL A: ₹${formatIndianNumber(totalProduct)}</p>
                </div>
            </div>
            
            <!-- Section B: Control System - Clean Layout -->
            <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e9ecef;">
                <h2 style="color: #333; margin: 0 0 15px 0; font-size: 1.1em; border-bottom: 2px solid #333; padding-bottom: 8px;">
                    B. CONTROL SYSTEM & ACCESSORIES
                </h2>
                
                <div style="display: grid; grid-template-columns: 1.4fr 0.8fr; gap: 25px; margin: 15px 0;">
                    <!-- Left Column - Controller Details -->
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 15px; border: 1px solid #e9ecef;">
                        <h4 style="margin: 0 0 15px 0; color: #333; font-size: 1.1em; font-weight: bold;">CONTROLLER DETAILS</h4>
                        <div style="space-y: 10px;">
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Controller Model:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">${processor || "Nova TB2"}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">Quantity:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">1</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
                                <span style="font-weight: 600; color: #333; font-size: 0.95em;">UOM:</span>
                                <span style="color: #333; font-weight: 600; font-size: 0.95em;">Nos.</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Right Column - Controller Pricing -->
                    <div style="background: #f8f9fa; border-radius: 8px; padding: 8px; border: 1px solid #e9ecef;">
                        <h4 style="margin: 0 0 8px 0; color: #333; font-size: 0.9em; font-weight: bold;">CONTROLLER PRICING</h4>
                        <div style="space-y: 4px;">
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.75em;">Unit Price:</span>
                                <span style="color: #333; font-weight: 700; font-size: 0.75em;">₹${formatIndianNumber(controllerPrice)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #e9ecef;">
                                <span style="font-weight: 600; color: #333; font-size: 0.75em;">GST (18%):</span>
                                <span style="color: #dc3545; font-weight: 700; font-size: 0.75em;">₹${formatIndianNumber(gstController)}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; padding: 4px 0; background: white; margin: 0 -8px; padding: 6px 8px; border-radius: 4px; border: 1px solid #e9ecef;">
                                <span style="font-weight: 700; color: #333; font-size: 0.85em;">TOTAL:</span>
                                <span style="color: #333; font-weight: 700; font-size: 0.85em;">₹${formatIndianNumber(totalController)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Grand Total - Clean Design -->
            <div style="background: #333; color: white; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center;">
                <h2 style="margin: 0 0 8px 0; font-size: 1.2em; font-weight: bold;">GRAND TOTAL</h2>
                <p style="margin: 0; font-size: 1.8em; font-weight: bold;">₹${formatIndianNumber(grandTotal)}</p>
                <p style="margin: 4px 0 0 0; font-size: 0.8em; opacity: 0.9;">(A + B)</p>
            </div>
            
            <!-- Bottom Spacer to prevent cropping -->
            <div style="height: 30px; width: 100%;"></div>
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0007.jpg" alt="Page 7" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0008.jpg" alt="Page 8" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0009.jpg" alt="Page 9" />
        </div>
        <div class="page">
            <img src="/Pages to JPG/Indian Industries Association_page-0010.jpg" alt="Page 10" />
        </div>
    </body>
    </html>
  `;

  return html;
};




