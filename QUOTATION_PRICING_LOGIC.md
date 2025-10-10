# 💰 Quotation Pricing Logic - Complete Guide

## 🎯 **Overview**

The quotation pricing logic is a comprehensive system that calculates the total price for LED display configurations, including product costs, processor/controller costs, and GST. The same logic is used for both quotation creation and PDF generation to ensure perfect consistency.

## 🏗️ **Core Function: `calculateCorrectTotalPrice`**

This is the **authoritative pricing function** used throughout the system:

```typescript
function calculateCorrectTotalPrice(
  product: ProductWithPricing,
  cabinetGrid: { columns: number; rows: number } | null,
  processor: string | null,
  userType: string,
  config: { width: number; height: number; unit: string }
): number
```

## 📊 **Step-by-Step Pricing Calculation**

### **Step 1: User Type Conversion**
```typescript
// Convert internal userType to PDF format
let pdfUserType: 'End User' | 'Reseller' | 'Channel' = 'End User';
if (userType === 'reseller') {
  pdfUserType = 'Reseller';
} else if (userType === 'siChannel') {
  pdfUserType = 'Channel';
}
```

### **Step 2: Product Pricing (User-Specific)**

#### **Regular Products:**
```typescript
if (pdfUserType === 'Reseller' && typeof product.resellerPrice === 'number') {
  unitPrice = product.resellerPrice;     // 15% discount
} else if (pdfUserType === 'Channel' && typeof product.siChannelPrice === 'number') {
  unitPrice = product.siChannelPrice;   // 10% discount
} else {
  unitPrice = product.price;            // Full price (End User)
}
```

#### **Rental Products:**
```typescript
if (product.category?.toLowerCase().includes('rental') && product.prices) {
  if (pdfUserType === 'Reseller') {
    unitPrice = product.prices.cabinet.reseller;
  } else if (pdfUserType === 'Channel') {
    unitPrice = product.prices.cabinet.siChannel;
  } else {
    unitPrice = product.prices.cabinet.endCustomer;
  }
}
```

### **Step 3: Quantity Calculation**

#### **Regular Products (Area-based):**
```typescript
// Use config dimensions directly (same as PDF)
const widthInMeters = config.width / 1000;      // Convert mm to m
const heightInMeters = config.height / 1000;    // Convert mm to m
const widthInFeet = widthInMeters * METERS_TO_FEET;  // 3.2808399
const heightInFeet = heightInMeters * METERS_TO_FEET;
quantity = widthInFeet * heightInFeet;         // Square feet
```

#### **Rental Products (Cabinet-based):**
```typescript
// For rental series, calculate quantity as number of cabinets
quantity = cabinetGrid ? (cabinetGrid.columns * cabinetGrid.rows) : 1;
```

### **Step 4: Product Subtotal**
```typescript
const subtotal = unitPrice * quantity;
```

### **Step 5: Processor/Controller Pricing**

#### **Processor Price Matrix:**
```typescript
const processorPrices = {
  'TB2': { endUser: 15000, reseller: 12000, channel: 10000 },
  'TB40': { endUser: 25000, reseller: 20000, channel: 17000 },
  'TB60': { endUser: 35000, reseller: 28000, channel: 24000 },
  'VX1': { endUser: 20000, reseller: 16000, channel: 14000 },
  'VX400': { endUser: 30000, reseller: 24000, channel: 21000 },
  'VX400 Pro': { endUser: 35000, reseller: 28000, channel: 24000 },
  'VX600': { endUser: 45000, reseller: 36000, channel: 31000 },
  'VX600 Pro': { endUser: 50000, reseller: 40000, channel: 34000 },
  'VX1000': { endUser: 65000, reseller: 52000, channel: 44000 },
  'VX1000 Pro': { endUser: 70000, reseller: 56000, channel: 48000 },
  '4K PRIME': { endUser: 100000, reseller: 80000, channel: 68000 }
};
```

#### **User-Specific Processor Pricing:**
```typescript
if (pdfUserType === 'Reseller') {
  processorPrice = processorPrices[processor].reseller;
} else if (pdfUserType === 'Channel') {
  processorPrice = processorPrices[processor].channel;
} else {
  processorPrice = processorPrices[processor].endUser;
}
```

### **Step 6: GST Calculation (18%)**

#### **Product GST:**
```typescript
const gstProduct = subtotal * 0.18;
const totalProduct = subtotal + gstProduct;
```

#### **Processor GST:**
```typescript
const gstProcessor = processorPrice * 0.18;
const totalProcessor = processorPrice + gstProcessor;
```

### **Step 7: Grand Total**
```typescript
const grandTotal = totalProduct + totalProcessor;
return Math.round(grandTotal); // Round to nearest rupee
```

## 📋 **Product Pricing Matrix**

### **Bellatrix Series Indoor COB:**
| **Model** | **End User** | **SI/Channel** | **Reseller** |
|-----------|--------------|----------------|--------------|
| **P0.9** | ₹49,300 | ₹44,370 | ₹41,905 |
| **P1.25** | ₹27,200 | ₹24,480 | ₹23,120 |
| **P1.5** | ₹24,300 | ₹21,870 | ₹20,655 |

### **Bellatrix Series Indoor SMD:**
| **Model** | **End User** | **SI/Channel** | **Reseller** |
|-----------|--------------|----------------|--------------|
| **P1.25** | ₹21,300 | ₹19,170 | ₹18,105 |
| **P1.5** | ₹16,900 | ₹15,210 | ₹14,365 |

## 🧮 **Complete Example Calculation**

### **Bellatrix Indoor COB P1.25 - End User - 3×4 Grid - TB60 Processor:**

#### **Step 1: Product Pricing**
- **User Type:** End User
- **Unit Price:** ₹27,200 per sq.ft

#### **Step 2: Quantity Calculation**
- **Config Dimensions:** 2400×1010mm
- **In Meters:** 2.4×1.01m
- **In Feet:** 7.87×3.31ft
- **Quantity:** 7.87 × 3.31 = **26.05 sq.ft**

#### **Step 3: Product Subtotal**
- **Subtotal:** ₹27,200 × 26.05 = **₹7,08,560**

#### **Step 4: Product GST (18%)**
- **GST:** ₹7,08,560 × 0.18 = **₹1,27,541**
- **Product Total (A):** ₹7,08,560 + ₹1,27,541 = **₹8,36,101**

#### **Step 5: Processor Pricing**
- **Processor:** TB60 (End User)
- **Price:** **₹35,000**

#### **Step 6: Processor GST (18%)**
- **GST:** ₹35,000 × 0.18 = **₹6,300**
- **Processor Total (B):** ₹35,000 + ₹6,300 = **₹41,300**

#### **Step 7: Grand Total**
- **GRAND TOTAL (A+B):** ₹8,36,101 + ₹41,300 = **₹8,77,401**

## 🔄 **Consistency Across System**

### **Same Logic Used In:**
1. **Quotation Creation** (`QuoteModal.tsx`)
2. **PDF Generation** (`docxGenerator.ts`)
3. **Database Storage** (saved as `totalPrice`)

### **Key Consistency Features:**
- **Same quantity calculation** (config dimensions)
- **Same user-specific pricing**
- **Same GST calculation** (18%)
- **Same processor pricing matrix**
- **Same rounding logic** (nearest rupee)

## 🎯 **User Type Discounts**

### **End User:**
- **Product:** Full price
- **Processor:** Full price
- **Example:** TB60 = ₹35,000

### **Reseller:**
- **Product:** ~15% discount
- **Processor:** ~20% discount
- **Example:** TB60 = ₹28,000

### **SI/Channel:**
- **Product:** ~10% discount
- **Processor:** ~31% discount
- **Example:** TB60 = ₹24,000

## 🔍 **Debugging & Logging**

### **Console Logs:**
```typescript
console.log('💰 Price Calculation (WITH GST - matches PDF exactly):', {
  product: product.name,
  userType: pdfUserType,
  unitPrice,
  quantity,
  subtotal,
  gstProduct,
  totalProduct,
  processorPrice,
  gstProcessor,
  totalProcessor,
  grandTotal: Math.round(grandTotal),
  breakdown: {
    'Unit Price (per sq.ft)': unitPrice,
    'Quantity (sq.ft)': quantity,
    'Product Subtotal': subtotal,
    'Product GST (18%)': gstProduct,
    'Product Total (A)': totalProduct,
    'Processor Price': processorPrice,
    'Processor GST (18%)': gstProcessor,
    'Processor Total (B)': totalProcessor,
    'GRAND TOTAL (A+B) with GST': Math.round(grandTotal)
  }
});
```

## 🚨 **Important Notes**

### **✅ Always Includes:**
- **18% GST** on both product and processor
- **User-specific pricing** based on customer type
- **Exact quantity calculation** using config dimensions
- **Rounding to nearest rupee**

### **❌ Never Includes:**
- Additional discounts beyond user type
- Hidden fees or surcharges
- Dynamic pricing based on volume
- Currency conversion

### **🎯 Result:**
The final price is the **exact amount** that appears in the PDF quotation and is stored in the database for dashboard display.

---

**🎯 SUMMARY: The quotation pricing logic ensures perfect consistency across quotation creation, PDF generation, and dashboard display by using the same calculation function with user-specific pricing, GST inclusion, and precise quantity calculations.**
