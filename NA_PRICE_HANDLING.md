# NA Price Handling Implementation

## Overview
Implemented logic to handle products with "Not Available" (NA) pricing for Betelgeuse Series Indoor SMD P1.25 and P1.5.

## Products Affected
- **Betelgeuse Series Indoor SMD P1.25** (`betel-indoor-smd-p1.25`)
  - End User Price: NA
  - Channel Price: NA
  - Reseller Price: NA

- **Betelgeuse Series Indoor SMD P1.5** (`betel-indoor-smd-p1.5`)
  - End User Price: NA
  - Channel Price: NA
  - Reseller Price: NA

## Implementation Details

### 1. Centralized Pricing Function (`src/utils/centralizedPricing.ts`)

#### Changes Made:
- **`getProductUnitPrice()` function**:
  - Returns `null` when price is NA
  - Checks for 'NA', 'N/A', `null`, or `undefined` values
  - Works for both rental and regular products

- **`PricingCalculationResult` interface**:
  - Added `isAvailable: boolean` field
  - `false` when price is NA, `true` when price is available

- **`calculateCentralizedPricing()` function**:
  - Early return with `isAvailable: false` when price is NA
  - Returns zeros for all price fields when not available
  - Logs warning message: "⚠️ PRICE NOT AVAILABLE"

### 2. Quote Modal (`src/components/QuoteModal.tsx`)

#### Changes Made:
- Added price availability check before submission
- Shows alert if price is not available:
  ```
  "❌ Price is not available for this product configuration. 
   Please contact sales for pricing information."
  ```
- Prevents quotation submission for NA prices

### 3. PDF View Modal (`src/components/PdfViewModal.tsx`)

#### Changes Made:
- Updated `calculateCorrectTotalPrice()` to return `number | null`
- Returns `null` when price is not available
- Added price availability check before saving quotation
- Shows same alert message as Quote Modal
- Prevents PDF generation/quotation saving for NA prices

## User Experience

### When User Selects NA-Priced Product:

1. **Configuration Phase**:
   - User can configure the product normally
   - No pricing information is displayed

2. **Quote Request Phase**:
   - When clicking "Get a Quote" or "Save to Database"
   - System checks if price is available
   - If price is NA:
     - Alert message displayed: "❌ Price is not available for this product configuration. Please contact sales for pricing information."
     - Quotation is NOT created
     - Database is NOT updated
     - User must contact sales for pricing

3. **PDF Generation Phase**:
   - Same behavior as quote request
   - PDF generation is blocked for NA-priced products
   - User is prompted to contact sales

## Technical Flow

```
1. User selects product (Betel P1.25 or P1.5)
2. User configures display
3. User clicks "Get a Quote" or "Save"
4. System calls calculateCentralizedPricing()
5. calculateCentralizedPricing() checks getProductUnitPrice()
6. getProductUnitPrice() returns null (price is NA)
7. calculateCentralizedPricing() returns { isAvailable: false, ... }
8. QuoteModal/PdfViewModal checks pricingResult.isAvailable
9. If false: Show alert and return (don't submit)
10. If true: Continue with normal flow
```

## Benefits

1. **Prevents Invalid Data**:
   - No quotations with zero/invalid prices in database
   - No PDFs generated with incorrect pricing

2. **Clear Communication**:
   - User immediately knows pricing is not available
   - Directed to contact sales

3. **Centralized Logic**:
   - Single source of truth for price availability
   - Consistent behavior across all components

4. **Future-Proof**:
   - Easy to add more NA-priced products
   - Just set price to "NA" in `products.ts`

## Database Impact

- **No database entries** are created for NA-priced products
- Existing quotations are not affected
- System gracefully handles NA prices without errors

## Testing

### To Test NA Price Handling:

1. Select "Betelgeuse Series Indoor SMD P1.25"
2. Configure the display
3. Select any user type (End User/Channel/Reseller)
4. Click "Get a Quote"
5. **Expected**: Alert message appears, no quotation created

### To Test Normal Pricing:

1. Select any other product (e.g., "Orion P3 Outdoor")
2. Configure the display
3. Click "Get a Quote"
4. **Expected**: Normal flow, quotation created successfully

## Future Enhancements

If needed, you can:

1. **Show "Not Available" in UI**:
   - Display "Price: Not Available" in product details
   - Show contact sales button instead of price

2. **Allow Quotation Requests**:
   - Create quotations with price = 0 and flag "pricing_required"
   - Sales team can add pricing later

3. **Partial Pricing**:
   - Support cases where some user types have prices, others don't
   - E.g., End User = NA, but Reseller = ₹10,000

## Maintenance

### Adding New NA-Priced Products:

1. Open `src/data/products.ts`
2. Find the product
3. Set prices to NA:
   ```typescript
   price: NA,
   siChannelPrice: NA,
   resellerPrice: NA,
   ```
4. Done! System will automatically handle it.

### Making NA Price Available:

1. Open `src/data/products.ts`
2. Find the product
3. Update prices to numbers:
   ```typescript
   price: 25000,
   siChannelPrice: 22500,
   resellerPrice: 21250,
   ```
4. Done! System will automatically use the new prices.

## Related Files

- `src/utils/centralizedPricing.ts` - Core price calculation logic
- `src/components/QuoteModal.tsx` - Quote submission handling
- `src/components/PdfViewModal.tsx` - PDF generation handling
- `src/data/products.ts` - Product definitions with pricing
- `RENTAL_PRICE_BUG_FIX.md` - Previous price synchronization fix
- `PRICE_MISMATCH_ROOT_CAUSE.md` - Price mismatch investigation

## Summary

The system now properly handles products with NA pricing by:
- ✅ Detecting NA prices at calculation time
- ✅ Preventing invalid quotations from being created
- ✅ Showing clear error messages to users
- ✅ Maintaining data integrity in the database
- ✅ Using centralized logic for consistency

Users attempting to get quotes for Betel P1.25 or P1.5 will be prompted to contact sales for pricing information.
