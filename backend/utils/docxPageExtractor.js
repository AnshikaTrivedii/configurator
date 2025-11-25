/**
 * Utility to extract pages from DOCX template and convert them to images
 * This replaces the Pages-to-JPG folder approach for backend
 * 
 * Note: This requires a headless browser or image conversion library
 * For now, this is a placeholder that will need implementation based on
 * available Node.js libraries (e.g., puppeteer, playwright, or LibreOffice headless)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mammoth from 'mammoth';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the project root (one level up from backend)
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const TEMPLATE_DOCX_PATH = path.join(PROJECT_ROOT, 'dist', 'assets', 'docs', 'ADA Project Bellatrix P4 6.3 x 3.15ft - Copy (1).docx');

/**
 * Extract all pages from the DOCX template
 * Returns an array of page HTML content (one per page)
 * 
 * Note: This extracts HTML representation of pages.
 * For image conversion, you would need to:
 * 1. Use a headless browser (puppeteer/playwright) to render HTML to images, OR
 * 2. Use LibreOffice in headless mode to convert DOCX pages to images
 */
export const extractDocxPagesAsHtml = async () => {
  try {
    // Check if template file exists
    if (!fs.existsSync(TEMPLATE_DOCX_PATH)) {
      throw new Error(`DOCX template not found at: ${TEMPLATE_DOCX_PATH}`);
    }
    
    // Read the DOCX file
    const docxBuffer = fs.readFileSync(TEMPLATE_DOCX_PATH);
    
    // Convert DOCX to HTML using mammoth
    const result = await mammoth.convertToHtml(
      { arrayBuffer: docxBuffer.buffer },
      {
        styleMap: [
          "p[style-name='Page Break'] => p.page-break",
          "br[type='page'] => br.page-break"
        ]
      }
    );
    
    const html = result.value;
    
    // Split HTML by page breaks
    // Page breaks in mammoth output are typically:
    // - <p style="page-break-before: always;"> or
    // - <br style="page-break-before: always;" />
    const pageBreaks = /<p[^>]*style[^>]*page-break[^>]*>|<br[^>]*page-break[^>]*\/>/gi;
    const pages = html.split(pageBreaks).filter(page => page.trim().length > 0);
    
    // If no page breaks found, treat entire document as one page
    const pageContents = pages.length > 0 ? pages : [html];
    
    console.log(`📄 Extracted ${pageContents.length} pages from DOCX template`);
    
    return pageContents;
    
  } catch (error) {
    console.error('Error extracting DOCX pages:', error);
    throw new Error(`Failed to extract pages from DOCX template: ${error.message}`);
  }
};

/**
 * Get the template DOCX path
 */
export const getTemplateDocxPath = () => {
  return TEMPLATE_DOCX_PATH;
};

