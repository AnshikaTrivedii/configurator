# 🎯 Super Admin Dashboard Pricing Logic

## 📋 **Overview**

The Super Admin dashboard pricing logic is designed to display the **exact same price** that appears in the generated PDF quotation. This ensures perfect consistency between the PDF document and the dashboard display.

## 🔍 **Core Principle: Database-First Pricing**

### **Key Concept:**
```typescript
// CRITICAL: Use the exact stored price from the database
// This price was calculated using the same logic as the PDF when saved
// Do NOT recalculate - always display the stored value to match PDF
const actualPrice = quotation.totalPrice || 0;
```

**The Super Admin dashboard does NOT calculate prices. It only displays the price that was saved in the database when the quotation was originally created.**

## 🏗️ **Data Flow Architecture**

```
1. Sales User Creates Quotation
   ↓
2. QuoteModal calculates price using calculateCorrectTotalPrice()
   ↓
3. Price is saved to database as quotation.totalPrice
   ↓
4. PDF is generated using same calculation logic
   ↓
5. Super Admin Dashboard fetches and displays stored price
```

## 💰 **Price Calculation Logic (Used When Saving Quotations)**

### **Step 1: Product Pricing**
```typescript
// User-specific pricing based on user type
if (userType === 'reseller') {
  unitPrice = product.resellerPrice;  // e.g., ₹23,120
} else if (userType === 'siChannel') {
  unitPrice = product.siChannelPrice; // e.g., ₹24,480
} else {
  unitPrice = product.price;          // e.g., ₹27,200 (End User)
}
```

### **Step 2: Quantity Calculation**
```typescript
// For regular products, calculate quantity in square feet
const widthInMeters = config.width / 1000;      // e.g., 2400mm → 2.4m
const heightInMeters = config.height / 1000;    // e.g., 1010mm → 1.01m
const widthInFeet = widthInMeters * METERS_TO_FEET;  // 2.4m → 7.87ft
const heightInFeet = heightInMeters * METERS_TO_FEET; // 1.01m → 3.31ft
quantity = widthInFeet * heightInFeet;         // 7.87 × 3.31 = 26.05 sq.ft
```

### **Step 3: Product Subtotal**
```typescript
const subtotal = unitPrice * quantity;  // ₹27,200 × 26.05 = ₹7,08,560
```

### **Step 4: GST Calculation (18%)**
```typescript
// Product GST
const gstProduct = subtotal * 0.18;     // ₹7,08,560 × 0.18 = ₹1,27,541
const totalProduct = subtotal + gstProduct; // ₹7,08,560 + ₹1,27,541 = ₹8,36,101
```

### **Step 5: Processor Pricing**
```typescript
// User-specific processor pricing
const processorPrices = {
  'TB60': { endUser: 35000, reseller: 28000, channel: 24000 }
};

if (userType === 'reseller') {
  processorPrice = processorPrices['TB60'].reseller;  // ₹28,000
} else if (userType === 'siChannel') {
  processorPrice = processorPrices['TB60'].channel;   // ₹24,000
} else {
  processorPrice = processorPrices['TB60'].endUser;   // ₹35,000
}
```

### **Step 6: Processor GST (18%)**
```typescript
const gstProcessor = processorPrice * 0.18;    // ₹35,000 × 0.18 = ₹6,300
const totalProcessor = processorPrice + gstProcessor; // ₹35,000 + ₹6,300 = ₹41,300
```

### **Step 7: Grand Total**
```typescript
const grandTotal = totalProduct + totalProcessor; // ₹8,36,101 + ₹41,300 = ₹8,77,401
```

## 🎯 **Super Admin Dashboard Display Logic**

### **Data Fetching:**
```typescript
// Fetch quotations from database
const response = await salesAPI.getSalesPersonDetails(salesPersonId);
const quotations = response.customers[].quotations[];
```

### **Price Display:**
```typescript
// Display the exact price stored in database
const actualPrice = quotation.totalPrice || 0;

return (
  <div>
    <span className="font-semibold text-green-600 text-lg">
      ₹{actualPrice.toLocaleString('en-IN')}
    </span>
    <div className="text-xs text-blue-600">
      {userTypeDisplayName} Pricing
    </div>
    <div className="text-xs text-gray-500">
      (Incl. 18% GST - From DB)
    </div>
    <div className="text-xs font-medium text-green-600">
      ✓ Matches PDF Grand Total
    </div>
  </div>
);
```

## 📊 **Example Calculation**

### **Bellatrix Indoor COB P1.25 - End User - 3×4 Grid:**

| **Component** | **Calculation** | **Amount** |
|---------------|-----------------|------------|
| **Product Price** | ₹27,200 per sq.ft | - |
| **Quantity** | 3×4 = 12 cabinets = 1.8×1.35m = 26.05 sq.ft | - |
| **Product Subtotal** | ₹27,200 × 26.05 | ₹7,08,560 |
| **Product GST (18%)** | ₹7,08,560 × 0.18 | ₹1,27,541 |
| **Product Total (A)** | ₹7,08,560 + ₹1,27,541 | ₹8,36,101 |
| **Processor TB60** | End User price | ₹35,000 |
| **Processor GST (18%)** | ₹35,000 × 0.18 | ₹6,300 |
| **Processor Total (B)** | ₹35,000 + ₹6,300 | ₹41,300 |
| **GRAND TOTAL (A+B)** | ₹8,36,101 + ₹41,300 | **₹8,77,401** |

## 🔧 **User Type Pricing Matrix**

### **Bellatrix Indoor COB P1.25:**
| **User Type** | **Price per sq.ft** | **TB60 Processor** |
|---------------|---------------------|-------------------|
| **End User** | ₹27,200 | ₹35,000 |
| **Reseller** | ₹23,120 | ₹28,000 |
| **SI/Channel** | ₹24,480 | ₹24,000 |

## 🎯 **Key Features**

### **✅ Price Consistency**
- **Dashboard price = PDF price = Database price**
- **No recalculation** in dashboard
- **Single source of truth** (database)

### **✅ User-Specific Pricing**
- **End User:** Highest prices
- **Reseller:** 15% discount
- **SI/Channel:** 10% discount

### **✅ GST Inclusion**
- **18% GST** included in all prices
- **Consistent across** PDF and dashboard
- **Transparent labeling** "(Incl. 18% GST - From DB)"

### **✅ Real-Time Display**
- **Fetches latest data** from database
- **Cache-busting** with timestamp
- **Live updates** when quotations change

## 🚨 **Important Notes**

### **❌ Dashboard Does NOT:**
- Recalculate prices
- Apply additional discounts
- Modify stored values
- Use hardcoded prices

### **✅ Dashboard DOES:**
- Display exact database values
- Show user type context
- Indicate GST inclusion
- Confirm PDF consistency

## 🔍 **Debugging & Verification**

### **Console Logs:**
```typescript
console.log('💰 Displaying price for quotation:', {
  storedPrice: actualPrice,
  formatted: actualPrice.toLocaleString('en-IN'),
  userType: userTypeDisplayName,
  source: 'database (matches PDF)'
});
```

### **Database Verification:**
```typescript
// Check if quotation exists with correct price
const quotation = await Quotation.findOne({ quotationId });
console.log('Database price:', quotation.totalPrice);
```

---

**🎯 SUMMARY: The Super Admin dashboard pricing logic is designed for perfect consistency - it displays the exact price that was calculated and saved when the quotation was created, ensuring the dashboard always matches the PDF.**
