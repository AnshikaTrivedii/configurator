/**
 * Utility to extract pages from DOCX template and convert them to images
 * This replaces the Pages-to-JPG folder approach
 */

import mammoth from 'mammoth';
import html2canvas from 'html2canvas';

// Template DOCX file path (relative to public/dist folder when served)
// Actual file location: dist/assets/docs/ADA Project Bellatrix P4 6.3 x 3.15ft - Copy (1).docx
const TEMPLATE_DOCX_PATH = '/assets/docs/ADA Project Bellatrix P4 6.3 x 3.15ft - Copy (1).docx';

/**
 * Extract all pages from the DOCX template and convert them to image data URLs
 * Returns an array of image data URLs, one per page
 */
export const extractDocxPagesAsImages = async (): Promise<string[]> => {
  try {
    console.log('📄 Starting DOCX page extraction from:', TEMPLATE_DOCX_PATH);
    
    // Fetch the DOCX template
    const response = await fetch(TEMPLATE_DOCX_PATH);
    if (!response.ok) {
      console.error('❌ Failed to fetch DOCX template:', response.status, response.statusText);
      throw new Error(`Failed to fetch DOCX template: ${response.status} ${response.statusText}`);
    }
    
    console.log('✅ DOCX template fetched successfully');
    const arrayBuffer = await response.arrayBuffer();
    console.log('📦 DOCX file size:', arrayBuffer.byteLength, 'bytes');
    
    // Convert DOCX to HTML using mammoth
    // mammoth preserves page breaks as <p style="page-break-before: always;">
    console.log('🔄 Converting DOCX to HTML...');
    const result = await mammoth.convertToHtml(
      { arrayBuffer },
      {
        styleMap: [
          "p[style-name='Page Break'] => p.page-break",
          "br[type='page'] => br.page-break"
        ]
      }
    );
    
    const html = result.value;
    console.log('✅ DOCX converted to HTML, length:', html.length);
    
    // Split HTML by page breaks
    // Page breaks in mammoth output are typically:
    // - <p style="page-break-before: always;"> or
    // - <br style="page-break-before: always;" />
    // Also check for section breaks and manual page breaks
    const pageBreakPatterns = [
      /<p[^>]*style[^>]*page-break[^>]*>/gi,
      /<br[^>]*page-break[^>]*\/>/gi,
      /<div[^>]*style[^>]*page-break[^>]*>/gi,
      /<w:br[^>]*w:type="page"[^>]*>/gi, // Word page breaks in HTML
    ];
    
    let pages: string[] = [html];
    for (const pattern of pageBreakPatterns) {
      const matches = html.match(pattern);
      if (matches && matches.length > 0) {
        console.log(`📄 Found ${matches.length} page breaks using pattern`);
        pages = html.split(pattern).filter(page => page.trim().length > 0);
        break;
      }
    }
    
    // If still no page breaks found, try splitting by large content blocks
    // or use a fixed approach: assume 10 pages and split content evenly
    if (pages.length === 1) {
      console.log('⚠️ No page breaks detected, attempting to split content...');
      // For now, return empty array and let the calling code handle it
      // This is a fallback - we'll need a better page detection method
      pages = [html]; // Keep as single page for now
    }
    
    const pageContents = pages.length > 0 ? pages : [html];
    console.log(`📄 Extracted ${pageContents.length} pages from DOCX template`);
    
    // Convert each page to an image
    const pageImages: string[] = [];
    
    for (let i = 0; i < pageContents.length; i++) {
      const pageHtml = pageContents[i];
      
      // Create a container for this page
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '-10000px';
      container.style.top = '0';
      container.style.width = '210mm';
      container.style.minHeight = '297mm';
      container.style.background = '#ffffff';
      container.style.padding = '0';
      container.style.margin = '0';
      container.style.boxSizing = 'border-box';
      
      // Wrap page content in proper HTML structure
      const styledHtml = `
        <div style="
          width: 210mm;
          min-height: 297mm;
          background: white;
          padding: 0;
          margin: 0;
          box-sizing: border-box;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        ">
          ${pageHtml}
        </div>
      `;
      
      container.innerHTML = styledHtml;
      document.body.appendChild(container);
      
      // Wait for any images in the page to load
      const images = Array.from(container.querySelectorAll('img')) as HTMLImageElement[];
      await Promise.all(
        images.map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(resolve => {
                img.onload = () => resolve();
                img.onerror = () => resolve();
              })
        )
      );
      
      // Wait a bit for layout to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Convert to canvas
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        width: container.scrollWidth,
        height: container.scrollHeight,
        backgroundColor: '#ffffff',
        windowWidth: 794, // A4 width in pixels at 96 DPI
        windowHeight: 1123, // A4 height in pixels at 96 DPI
      });
      
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      pageImages.push(dataUrl);
      
      // Clean up
      document.body.removeChild(container);
      
      console.log(`✅ Converted page ${i + 1} to image (${canvas.width}x${canvas.height})`);
    }
    
    return pageImages;
    
  } catch (error) {
    console.error('❌ Error extracting DOCX pages:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    // Return empty array - the calling code will handle fallback to PNG images
    console.warn('⚠️ Returning empty array - fallback to PNG images will be used');
    return [];
  }
};

/**
 * Get a specific page image by index (1-based)
 * Returns null if page doesn't exist
 */
export const getDocxPageImage = async (pageNumber: number): Promise<string | null> => {
  const allPages = await extractDocxPagesAsImages();
  const index = pageNumber - 1; // Convert to 0-based index
  
  if (index >= 0 && index < allPages.length) {
    return allPages[index];
  }
  
  return null;
};

/**
 * Get the template DOCX path
 */
export const getTemplateDocxPath = (): string => {
  return TEMPLATE_DOCX_PATH;
};

