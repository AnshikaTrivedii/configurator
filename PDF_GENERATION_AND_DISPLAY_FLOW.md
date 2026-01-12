# PDF Generation and Display Flow

This document explains how sales persons generate PDFs and how they are displayed on both the sales person dashboard and admin dashboard.

## Overview

The system uses a client-side PDF generation approach where:
1. **PDF Generation**: Happens in the browser using HTML → Canvas → PDF conversion
2. **PDF Storage**: The HTML content (not the PDF file) is stored in the database
3. **PDF Display**: The stored HTML is regenerated and displayed in a modal when viewing quotations

---

## 1. PDF Generation Flow (Sales Person)

### Step 1: User Creates Configuration
- Sales person configures a display using the `DisplayConfigurator` component
- They select product, dimensions, processor, mode, etc.
- They fill in customer information via `UserInfoForm`

### Step 2: PDF Preview Modal Opens
- When user clicks "View PDF" or "Generate PDF", the `PdfViewModal` component opens
- Location: `src/components/PdfViewModal.tsx`

### Step 3: HTML Generation
The PDF is generated in multiple steps:

**a) HTML Content Generation**
- Function: `generateConfigurationHtml()` in `src/utils/docxGenerator.ts`
- This creates a multi-page HTML document with:
  - Product specifications
  - Technical details
  - Wiring diagrams
  - Quotation page (Page 6) with pricing breakdown
- The HTML includes all styling and layout for A4 pages

**b) PDF Blob Creation**
- Function: `generateConfigurationPdf()` in `src/utils/docxGenerator.ts`
- Process:
  1. Creates an offscreen HTML container
  2. Injects the generated HTML
  3. Waits for images to load
  4. Uses `html2canvas` to convert each page to a canvas
  5. Uses `jsPDF` to combine canvases into a PDF blob
  6. Returns the PDF as a Blob for download

### Step 4: Saving Quotation to Database

When the sales person clicks "Save Quotation" in `PdfViewModal`:

**Frontend (PdfViewModal.tsx, lines 844-936):**
```typescript
const exactQuotationData = {
  quotationId: finalQuotationId,
  customerName: userInfo.fullName.trim(),
  customerEmail: userInfo.email.trim(),
  customerPhone: userInfo.phoneNumber.trim(),
  productName: selectedProduct.name,
  totalPrice: finalTotalPrice,  // Grand Total with GST
  pdfPage6HTML: finalHtmlContent,  // CRITICAL: Full HTML stored
  salesUserId: finalSalesUserId,  // For attribution
  salesUserName: finalSalesUserName,
  exactPricingBreakdown: { ... },  // Exact pricing as shown
  exactProductSpecs: { ... },  // Exact specs as shown
  productDetails: comprehensiveProductDetails,
  quotationData: { ... }
};

await salesAPI.saveQuotation(exactQuotationData);
```

**Backend (backend/routes/sales.js, lines 747-1018):**
- Endpoint: `POST /api/sales/quotation`
- Saves to MongoDB using the `Quotation` model
- **Critical Fields Stored:**
  - `pdfPage6HTML`: The complete HTML content of the PDF (as string)
  - `exactPricingBreakdown`: Exact pricing values (unit price, quantity, GST, total)
  - `exactProductSpecs`: Exact product specifications
  - `quotationData`: Complete configuration data for regeneration
  - `totalPrice`: Final price (matches PDF exactly)

**Database Schema (backend/models/Quotation.js):**
```javascript
{
  quotationId: String,
  salesUserId: ObjectId,  // Links to SalesUser
  salesUserName: String,
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  productName: String,
  totalPrice: Number,
  pdfPage6HTML: String,  // Full HTML stored here
  exactPricingBreakdown: Mixed,  // Exact pricing
  exactProductSpecs: Mixed,  // Exact specs
  quotationData: Mixed  // Complete config
}
```

### Step 5: Automatic PDF Download
- After successful save, the PDF is automatically downloaded to the user's computer
- The PDF file is NOT stored on the server - only the HTML is stored

---

## 2. PDF Display on Sales Person Dashboard

### Location
- Component: `src/components/SalesDashboard.tsx`
- Route: Accessed when sales person logs in and views their dashboard

### Flow

**Step 1: Fetch Quotations**
- API Call: `GET /api/sales/my-dashboard`
- Returns all quotations for the logged-in sales person
- Each quotation includes:
  - `pdfPage6HTML`: Stored HTML (if available)
  - `exactPricingBreakdown`: Exact pricing
  - `exactProductSpecs`: Exact specs
  - `quotationData`: Complete config

**Step 2: View PDF Button**
- Each quotation has a "View PDF" button (line 428 in SalesDashboard.tsx)
- Clicking triggers `handleViewPdf()` function (line 126)

**Step 3: PDF Display Logic (handleViewPdf, lines 126-218)**

Two scenarios:

**Scenario A: PDF HTML is Stored**
```typescript
if (quotation.pdfPage6HTML) {
  setPdfHtmlContent(quotation.pdfPage6HTML);
  setIsPdfModalOpen(true);
  return;
}
```
- If `pdfPage6HTML` exists, use it directly
- Display in `PdfViewModal` component

**Scenario B: Regenerate from Stored Data**
```typescript
if (quotation.exactPricingBreakdown && quotation.exactProductSpecs) {
  // Reconstruct config, product, cabinetGrid, processor, mode
  // Regenerate HTML using generateConfigurationHtml()
  // Pass exactPricingBreakdown to ensure exact match
  const htmlContent = generateConfigurationHtml(
    config,
    product,
    cabinetGrid,
    processor,
    mode,
    userInfo,
    salesPerson,
    quotation.quotationId,
    undefined,
    quotation.exactPricingBreakdown  // CRITICAL: Exact pricing
  );
  setPdfHtmlContent(htmlContent);
  setIsPdfModalOpen(true);
}
```

**Step 4: Display in Modal**
- `PdfViewModal` component displays the HTML content
- User can:
  - View the PDF-like HTML
  - Download as PDF (converts HTML to PDF again)
  - Close the modal

---

## 3. PDF Display on Admin Dashboard

### Location
- Component: `src/components/SuperUserDashboard.tsx`
- Component: `src/components/SalesPersonDetailsModal.tsx` (detailed view)

### Flow

**Step 1: Admin Views Sales Persons**
- Admin opens Super User Dashboard
- Sees list of all sales persons with statistics
- Clicking a sales person name opens `SalesPersonDetailsModal`

**Step 2: View Sales Person Details**
- `SalesPersonDetailsModal` shows:
  - Sales person information
  - All customers and quotations for that sales person
  - Quotation details (product, price, specs, etc.)

**Step 3: PDF Viewing (Current Implementation)**
- **IMPORTANT**: The admin dashboard (`SalesPersonDetailsModal`) currently does NOT have a "View PDF" button
- It only displays:
  - Quotation details in a formatted card
  - Exact pricing breakdown (if available)
  - Exact product specs (if available)
  - Product specifications grid
  - Technical specifications

**Step 4: Adding PDF View to Admin Dashboard (If Needed)**
To add PDF viewing capability to the admin dashboard, you would:

1. Add a "View PDF" button in `SalesPersonDetailsModal.tsx` (similar to SalesDashboard)
2. Implement `handleViewPdf` function (similar to SalesDashboard)
3. Use the same logic:
   - Check for `quotation.pdfPage6HTML` first
   - If not available, regenerate using `exactPricingBreakdown` and `exactProductSpecs`
   - Display in `PdfViewModal` component

**Example Implementation:**
```typescript
// In SalesPersonDetailsModal.tsx
const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
const [pdfHtmlContent, setPdfHtmlContent] = useState<string>('');
const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);

const handleViewPdf = async (quotation: Quotation) => {
  // Same logic as SalesDashboard.handleViewPdf
  // Use quotation.pdfPage6HTML or regenerate from exactPricingBreakdown
};

// Add button in quotation card:
<button onClick={() => handleViewPdf(quotation)}>
  View PDF
</button>

// Add PdfViewModal at bottom:
{selectedQuotation && (
  <PdfViewModal
    isOpen={isPdfModalOpen}
    onClose={() => setIsPdfModalOpen(false)}
    htmlContent={pdfHtmlContent}
    // ... other props
  />
)}
```

---

## Key Technical Details

### 1. PDF Storage Strategy
- **NOT stored**: The actual PDF file (binary blob)
- **IS stored**: The HTML content (`pdfPage6HTML`) as a string
- **Why?**: 
  - Smaller database size
  - Can regenerate PDF anytime
  - Can modify/update HTML if needed
  - Easier to debug and maintain

### 2. Exact Pricing Matching
- `exactPricingBreakdown` ensures prices match exactly between:
  - Original PDF generation
  - Database storage
  - Dashboard display
  - Regenerated PDFs
- This prevents rounding errors or calculation mismatches

### 3. PDF Regeneration
- If `pdfPage6HTML` is missing, the system regenerates it using:
  - `exactPricingBreakdown`: Exact pricing values
  - `exactProductSpecs`: Exact product specifications
  - `quotationData`: Complete configuration
- This ensures backward compatibility with older quotations

### 4. User Attribution
- `salesUserId` determines which sales person "owns" the quotation
- Used for:
  - Dashboard filtering (sales person sees only their quotations)
  - Admin dashboard statistics
  - Revenue attribution

### 5. PDF Generation Libraries
- **html2canvas**: Converts HTML/CSS to canvas
- **jsPDF**: Creates PDF from canvas/images
- Both run client-side (in browser)

---

## File Locations

### Frontend
- `src/components/PdfViewModal.tsx` - PDF preview and save modal
- `src/components/SalesDashboard.tsx` - Sales person dashboard with PDF viewing
- `src/components/SuperUserDashboard.tsx` - Admin dashboard
- `src/components/SalesPersonDetailsModal.tsx` - Admin view of sales person details
- `src/utils/docxGenerator.ts` - PDF/HTML generation utilities
- `src/api/sales.ts` - API client for sales endpoints

### Backend
- `backend/routes/sales.js` - Sales API routes (save quotation, get dashboard)
- `backend/models/Quotation.js` - Quotation database model
- `backend/models/SalesUser.js` - Sales user database model

---

## Summary

1. **Generation**: Sales person creates config → PDF generated client-side → HTML stored in DB
2. **Sales Dashboard**: Fetches quotations → Displays list → "View PDF" → Shows stored/regenerated HTML
3. **Admin Dashboard**: Views sales persons → Clicks person → Sees quotations (currently no PDF view, but can be added)

The system is designed to be flexible - PDFs can be regenerated from stored data, ensuring consistency and allowing for future updates to the PDF template without losing historical data.
