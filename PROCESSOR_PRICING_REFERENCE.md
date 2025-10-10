# 🎛️ Processor Pricing Reference

## ✅ Official Processor Prices (Corrected)

All processor prices across the application should use these values:

### Asynchronous Controllers (TB Series)

| Processor | End User | Reseller | Channel (SI Channel) |
|-----------|----------|----------|----------------------|
| **TB2**   | ₹15,000  | ₹12,000  | ₹10,000             |
| **TB40**  | ₹25,000  | ₹20,000  | ₹17,000             |
| **TB60**  | ₹35,000  | ₹28,000  | ₹24,000             |

### Synchronous Controllers (VX Series)

| Processor      | End User  | Reseller | Channel (SI Channel) |
|----------------|-----------|----------|----------------------|
| **VX1**        | ₹20,000   | ₹16,000  | ₹14,000             |
| **VX400**      | ₹30,000   | ₹24,000  | ₹21,000             |
| **VX400 Pro**  | ₹35,000   | ₹28,000  | ₹24,000             |
| **VX600**      | ₹45,000   | ₹36,000  | ₹31,000             |
| **VX600 Pro**  | ₹50,000   | ₹40,000  | ₹34,000             |
| **VX1000**     | ₹65,000   | ₹52,000  | ₹44,000             |
| **VX1000 Pro** | ₹70,000   | ₹56,000  | ₹48,000             |

### Premium Controllers

| Processor    | End User   | Reseller  | Channel (SI Channel) |
|--------------|------------|-----------|----------------------|
| **4K PRIME** | ₹1,00,000  | ₹80,000   | ₹68,000             |

---

## 🐛 Bug Fixed

**Issue**: TB40 processor price was incorrectly set to ₹35,000 instead of ₹25,000 in `backend/fix-existing-quotations.cjs`

**Impact**: This would cause price mismatches when recalculating old quotations

**Fixed**: Updated TB40 pricing to:
- End User: ₹25,000 ✅
- Reseller: ₹20,000 ✅
- Channel: ₹17,000 ✅

---

## 📍 Where Processor Prices Are Defined

### Frontend
1. **`src/components/QuoteModal.tsx`** (line ~94-106)
2. **`src/components/PdfViewModal.tsx`** (line ~45-57, ~86-98)
3. **`src/utils/docxGenerator.ts`** (line ~136-147, ~1051-1062)

### Backend
1. **`backend/routes/sales.js`** (line ~178-233)
2. **`backend/fix-existing-quotations.cjs`** (line ~33-45) - **FIXED** ✅

---

## 💡 Usage Examples

### For End User (Regular Customer)
```typescript
// TB40 Example
const processorPrice = 25000;
const gst = processorPrice * 0.18;  // ₹4,500
const total = processorPrice + gst;  // ₹29,500
```

### For Reseller
```typescript
// TB40 Example
const processorPrice = 20000;
const gst = processorPrice * 0.18;  // ₹3,600
const total = processorPrice + gst;  // ₹23,600
```

### For Channel (SI Channel)
```typescript
// TB40 Example
const processorPrice = 17000;
const gst = processorPrice * 0.18;  // ₹3,060
const total = processorPrice + gst;  // ₹20,060
```

---

## 🔍 How to Verify Correct Pricing

### Test with TB40 (End User):
1. Create a new quotation
2. Select any LED product
3. Choose TB40 processor
4. Select "End User" type
5. **Expected Processor Price: ₹25,000** (before GST)
6. **Expected Processor Total: ₹29,500** (with 18% GST)

### Test with TB40 (Reseller):
1. Create a new quotation
2. Select any LED product
3. Choose TB40 processor
4. Select "Reseller" type
5. **Expected Processor Price: ₹20,000** (before GST)
6. **Expected Processor Total: ₹23,600** (with 18% GST)

---

## ⚠️ Important Notes

1. **GST is always 18%** on processor prices
2. **Processor price is added to product price** to get grand total
3. **User type determines the processor price tier**:
   - End User → Highest price
   - Reseller → Mid price
   - Channel → Lowest price
4. **All prices include GST in the final quotation**

---

## 📊 Price Tier Explanation

| User Type  | Description                          | Pricing Tier |
|------------|--------------------------------------|--------------|
| End User   | Direct customers, retail buyers      | Full price   |
| Reseller   | Authorized dealers, distributors     | ~80% of End User |
| Channel    | System Integrators, bulk buyers      | ~68% of End User |

---

## ✅ Verification Status

- [x] Frontend processor prices correct
- [x] Backend processor prices correct
- [x] PDF generation processor prices correct
- [x] fix-existing-quotations.cjs processor prices corrected
- [x] All files use consistent pricing
- [x] TB40 bug fixed (was 35000, now 25000)

---

**Status**: ✅ All processor prices are now consistent across the application

**Last Updated**: January 10, 2025  
**Version**: v2.1.1 (Processor pricing fix)

