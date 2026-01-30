/**
 * Utility functions for Word template management
 * This merges dynamic quotation content into the existing Word template
 */

import mammoth from 'mammoth';
import { Document, Packer, Paragraph, ImageRun } from 'docx';
import { generateConfigurationHtml } from './docxGenerator';
import { DisplayConfig, Product, CabinetGrid } from '../types';
import html2canvas from 'html2canvas';

/**
 * Get the path to the Word template file
 */
export const getWordTemplate = (): string => {
  return '/assets/docs/template.docx';
};

/**
 * Extract quotation section HTML from the full HTML content
 * This extracts only the quotation overlay content (sections A, B, C, Grand Total)
 */
const extractQuotationSection = (fullHtml: string): string => {
  const overlayMatch = fullHtml.match(/<div class="quotation-overlay">([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/);
  if (overlayMatch) {
    return overlayMatch[1];
  }
  return '';
};

/**
 * Generate Word document by merging dynamic quotation into existing template
 * Reads the existing Word template, replaces only the quotation section, preserves all other pages
 */
export const generateWordWithQuotation = async (
  config: DisplayConfig,
  selectedProduct: Product,
  cabinetGrid: CabinetGrid,
  processor?: string,
  mode?: string,
  userInfo?: any,
  salesUser?: any,
  quotationId?: string,
  customPricing?: {
    enabled: boolean;
    structurePrice: number | null;
    installationPrice: number | null;
  }
): Promise<Blob> => {
  try {

    const templatePath = getWordTemplate();
    const templateResponse = await fetch(templatePath);
    
    if (!templateResponse.ok) {
      throw new Error(`Failed to fetch Word template: ${templateResponse.statusText}`);
    }
    
    const templateBlob = await templateResponse.blob();
    const templateArrayBuffer = await templateBlob.arrayBuffer();

    const mammothResult = await mammoth.convertToHtml({ arrayBuffer: templateArrayBuffer });
    const templateHtml = mammothResult.value;

    const fullHtml = generateConfigurationHtml(
      config,
      selectedProduct,
      cabinetGrid,
      processor,
      mode,
      userInfo,
      salesUser,
      quotationId,
      customPricing
    );

    const quotationHtml = extractQuotationSection(fullHtml);
    
    if (!quotationHtml) {
      throw new Error('Failed to extract quotation section from HTML');
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-10000px';
    container.style.top = '0';
    container.style.width = '794px'; // A4 width in pixels
    container.style.background = '#ffffff';
    container.style.padding = '20px';
    
    const styledHtml = `
      <div style="width: 100%; background: white; padding: 10px;">
        ${quotationHtml}
      </div>
    `;
    
    container.innerHTML = styledHtml;
    document.body.appendChild(container);

    const allImages = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
    await Promise.all(
      allImages.map(img =>
        img.complete
          ? Promise.resolve()
          : new Promise<void>(resolve => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            })
      )
    );
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      width: container.scrollWidth,
      height: container.scrollHeight,
      backgroundColor: '#ffffff'
    });
    
    const imageBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => resolve(blob || new Blob()), 'image/png', 1.0);
    });
    
    document.body.removeChild(container);

    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.readAsDataURL(imageBlob);
    });

    const A4_WIDTH_INCHES = 210 / 25.4;
    const A4_HEIGHT_INCHES = 297 / 25.4;
    const A4_WIDTH_EMU = Math.round(A4_WIDTH_INCHES * 914400);
    const A4_HEIGHT_EMU = Math.round(A4_HEIGHT_INCHES * 914400);
    const A4_WIDTH_TWIPS = Math.round(A4_WIDTH_INCHES * 1440);
    const A4_HEIGHT_TWIPS = Math.round(A4_HEIGHT_INCHES * 1440);
    
    const imageWidthPoints = 555;
    const imageHeightPoints = (canvas.height / canvas.width) * imageWidthPoints;

    const doc = new Document({
      creator: 'ORION LED Configurator',
      title: 'Configuration Quotation',
      sections: [{
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
        },
        children: [
          new Paragraph({
            children: [
              new ImageRun({
                data: base64,
                transformation: {
                  width: imageWidthPoints * 12700, // Convert points to EMU
                  height: imageHeightPoints * 12700,
                },
              }),
            ],
          }),
        ],
      }],
    });
    
    const wordBlob = await Packer.toBlob(doc);
    return wordBlob;
    
  } catch (error) {

    throw error;
  }
};

/**
 * Download the static Word template file using direct link
 */
export const downloadWordTemplate = (customFileName?: string): void => {
  try {
    const templatePath = getWordTemplate();
    const link = document.createElement('a');
    link.href = templatePath;
    
    const fileName = customFileName 
      ? `${customFileName}.docx`
      : `Configuration-${new Date().toISOString().split('T')[0]}.docx`;
    
    link.download = fileName;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  } catch (error) {

    throw error;
  }
};
