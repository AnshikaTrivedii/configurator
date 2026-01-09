# Sales Person Dashboard Analysis

## Executive Summary

**Is there a dashboard per sales person?**  
**YES** - Each sales person has access to their own dashboard view, but it's implemented as a **filtered shared dashboard component** (not separate components per user).

---

## 1. Dashboard Implementation Type

### Answer: **Filtered Shared Dashboard**

The system uses a **single shared dashboard component** (`SalesDashboard.tsx`) that is automatically filtered by the logged-in sales person's `salesUserId` extracted from their JWT authentication token.

**Key Point:** Every sales person sees the same UI component, but the data is automatically scoped to their own quotations and revenue based on their authentication.

---

## 2. Component & API Details

### Frontend Component
- **File:** `src/components/SalesDashboard.tsx`
- **Component Name:** `SalesDashboard`
- **Status:** ✅ Component exists and is fully implemented
- **Usage Status:** ❌ **NOT currently rendered in the application**

### Backend API Endpoint
- **Endpoint:** `GET /api/sales/my-dashboard`
- **File:** `backend/routes/sales.js` (lines 1235-1313)
- **Authentication:** Required (JWT token via `authenticateToken` middleware)
- **Role Restriction:** Only users with role `'sales'` can access (line 1239)

---

## 3. Data Filtering Mechanism

### How Data is Scoped to Each Sales Person

1. **JWT Token Extraction:**
   - Location: `backend/middleware/auth.js`
   - The `authenticateToken` middleware extracts user information from JWT token
   - User ID is stored in `req.user._id` (line 34, 88 in auth.js)

2. **Database Query Filtering:**
   ```javascript
   // Line 1246 in backend/routes/sales.js
   const userId = req.user._id || req.user.id;
   
   // Line 1249 - Queries filtered by salesUserId
   const quotations = await Quotation.find({ salesUserId: userId })
     .sort({ createdAt: -1 })
     .lean();
   ```

3. **Automatic Scoping:**
   - The dashboard **automatically** shows only quotations where `quotation.salesUserId === req.user._id`
   - No manual filtering needed - it's built into the API endpoint
   - Each sales person only sees their own data

---

## 4. Dashboard Data Displayed

For a logged-in sales person, the dashboard shows:

### Statistics Cards:
- **Total Quotations** - Count of quotations where `salesUserId` matches logged-in user
- **Total Customers** - Unique customers from those quotations
- **Total Revenue** - Sum of `totalPrice` from those quotations
- **User Info** - Sales person's name

### Detailed View:
- **Customers List** - Grouped by customer email+name
  - Each customer shows:
    - Customer name, email, phone
    - User type (End User, Reseller, SI/Channel Partner)
    - All quotations for that customer
      - Quotation ID
      - Product name
      - Total price
      - Creation date
      - Message (if any)

### Data Aggregation:
- **Line 1256-1286:** Quotations are grouped by customer using a Map
- **Line 1274:** Revenue is calculated by summing `totalPrice` from filtered quotations
- **Line 1301-1303:** Returns aggregated stats (totalQuotations, totalCustomers, totalRevenue)

---

## 5. Role-Based Access Control

### Sales Person Dashboard (`/api/sales/my-dashboard`)
- **Allowed Roles:** `'sales'` only
- **Restriction:** Line 1239 in `backend/routes/sales.js`
  ```javascript
  if (req.user.role !== 'sales') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Sales role required.'
    });
  }
  ```

### Super Admin Dashboard (`/api/sales/dashboard`)
- **Allowed Roles:** `'super'` or `'super_admin'` only
- **Shows:** All sales persons with their quotation counts and revenue
- **File:** `backend/routes/sales.js` (lines 1050-1233)

---

## 6. Current Application Status

### Component Availability
- ✅ **Component exists:** `src/components/SalesDashboard.tsx` (308 lines)
- ✅ **API endpoint exists:** `GET /api/sales/my-dashboard`
- ✅ **Frontend API method exists:** `salesAPI.getMyDashboard()` in `src/api/sales.ts` (line 373)

### Integration Status
- ❌ **NOT imported in App.tsx**
- ❌ **NOT rendered anywhere in the application**
- ❌ **Sales users currently see:** `DisplayConfigurator` component only (line 308-327 in App.tsx)

### Current User Flow
Based on `src/App.tsx`:
- **Super Admin users** → See `SuperUserDashboard` (admin view of all sales persons)
- **Sales/Partner users** → See `DisplayConfigurator` (product configurator tool)
- **Sales Dashboard** → Exists but is not accessible in the current UI

---

## 7. Code References

### Frontend Files
1. **Component:** `src/components/SalesDashboard.tsx`
   - Line 44: Component definition
   - Line 79: Calls `salesAPI.getMyDashboard()`
   - Line 86-90: Sets state with filtered data

2. **API Client:** `src/api/sales.ts`
   - Line 373-393: `getMyDashboard()` method
   - Line 381: Fetches from `/sales/my-dashboard`
   - Line 383: Includes JWT token in headers via `getAuthHeaders()`

### Backend Files
1. **Route Handler:** `backend/routes/sales.js`
   - Line 1235-1313: `/my-dashboard` endpoint
   - Line 1239: Role check (sales only)
   - Line 1246: Extracts `userId` from `req.user._id`
   - Line 1249: Filters quotations by `salesUserId: userId`
   - Line 1290-1304: Returns scoped data

2. **Authentication:** `backend/middleware/auth.js`
   - Line 4-117: `authenticateToken` middleware
   - Line 16: Verifies JWT token
   - Line 34, 88: Sets `req.user._id` from token
   - Line 123: JWT includes `id: user._id` in token payload

3. **Model:** `backend/models/Quotation.js`
   - Contains `salesUserId` field used for filtering

---

## 8. Key Technical Details

### Authentication Flow
1. User logs in → JWT token created with `id: user._id`
2. Token stored in localStorage as `salesToken`
3. API calls include token in `Authorization: Bearer <token>` header
4. Middleware extracts `req.user._id` from token
5. Database query filters by `salesUserId: req.user._id`

### Data Isolation
- **Automatic:** No manual filtering needed in frontend
- **Secure:** Backend enforces data scoping via `salesUserId` field
- **Per-User:** Each sales person only sees their own quotations

### Quotation Attribution
- Quotations are attributed to sales persons via `salesUserId` field
- When a quotation is saved, it includes `salesUserId` (line 748+ in sales.js)
- Dashboard counts quotations where `quotation.salesUserId === loggedInUser._id`

---

## 9. Summary

| Question | Answer |
|----------|--------|
| **Does each sales person have their own dashboard?** | YES |
| **Implementation type?** | Filtered shared dashboard (same component, filtered data) |
| **Is data automatically scoped?** | YES - via `salesUserId` from JWT token |
| **Is it currently accessible?** | NO - Component exists but not rendered in UI |
| **Backend API ready?** | YES - Fully functional endpoint |
| **Frontend component ready?** | YES - Fully implemented component |
| **Role restrictions?** | YES - Only `'sales'` role can access |

---

## 10. Conclusion

**YES, each sales person effectively has their own dashboard**, implemented as a filtered shared dashboard component. The system:

1. ✅ Uses the same `SalesDashboard` component for all sales persons
2. ✅ Automatically filters data by `salesUserId` extracted from JWT token
3. ✅ Shows only quotations where `quotation.salesUserId === loggedInUser._id`
4. ✅ Calculates revenue and statistics scoped to that user
5. ✅ Has role-based access control (sales role only)

**However**, the dashboard is **not currently accessible** in the application UI. Sales users are routed to the `DisplayConfigurator` instead. The dashboard functionality exists and is fully implemented, but needs to be integrated into the application routing/navigation.

