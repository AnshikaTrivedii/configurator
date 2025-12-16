# Partner Dashboard Setup - Complete Guide

## ✅ Partner Users Created in Database

### Partner 1: Anushka
- **Email**: `trivedianushka48@gmail.com`
- **Name**: Anushka
- **Role**: `partner`
- **Allowed Customer Types**: `['endUser']`
- **Password**: `Orion@123` (must change on first login)
- **Status**: ✅ Created/Updated in database

### Partner 2: Aman
- **Email**: `amanabcd@gmail.com`
- **Name**: Aman
- **Role**: `partner`
- **Allowed Customer Types**: `['reseller']`
- **Password**: `Orion@123` (must change on first login)
- **Status**: ✅ Created/Updated in database

---

## 📊 Dashboard Integration

### Backend Changes
1. **Dashboard Query** (`GET /api/sales/dashboard`):
   - ✅ Queries all `SalesUser` documents (includes partners)
   - ✅ Includes `allowedCustomerTypes` field in response
   - ✅ Counts quotations by `salesUserId` (works for partners too)
   - ✅ Calculates revenue for each user (including partners)

2. **Quotation Attribution**:
   - ✅ When partners create quotations, `salesUserId` is set to partner's ID
   - ✅ Quotations are counted under the partner in the dashboard
   - ✅ Revenue is attributed to the partner

### Frontend Changes
1. **SuperUserDashboard**:
   - ✅ Displays partners in the dashboard table
   - ✅ Shows "Partner" badge for partner users
   - ✅ Table header updated to "Sales Team & Partners"
   - ✅ Includes `allowedCustomerTypes` in interface

---

## 🧪 Testing Partner Dashboard

### Test 1: Partner Creates Quotation
1. Login as Anushka (`trivedianushka48@gmail.com`)
2. Create a quotation (select product, fill form, submit)
3. **Expected**: Quotation saved with `salesUserId = Anushka's ID`
4. **Expected**: Quotation appears in Super User Dashboard under Anushka

### Test 2: View Partner in Dashboard
1. Login as Super User
2. Open Super User Dashboard
3. **Expected**: See Anushka and Aman in the list
4. **Expected**: See "Partner" badge next to their names
5. **Expected**: See their quotation count and revenue

### Test 3: Partner Quotation Details
1. In Super User Dashboard, click on Anushka's name
2. **Expected**: See all quotations created by Anushka
3. **Expected**: See correct pricing (End User pricing for Anushka)
4. **Expected**: See correct customer type in quotation details

---

## 🔍 Verification Queries

### Check Partners in Database
```javascript
// In MongoDB shell or Compass
db.salesusers.find({ role: 'partner' })

// Should return:
// - Anushka (trivedianushka48@gmail.com) with allowedCustomerTypes: ['endUser']
// - Aman (amanabcd@gmail.com) with allowedCustomerTypes: ['reseller']
```

### Check Partner Quotations
```javascript
// Find quotations created by a specific partner
db.quotations.find({ 
  salesUserId: ObjectId("anushka-user-id-here") 
})

// Should return all quotations where salesUserId matches Anushka's ID
```

### Check Dashboard Query
```javascript
// The dashboard query should return partners
// GET /api/sales/dashboard should include:
// - All users with role: 'sales', 'partner', 'super', 'super_admin'
// - Quotation counts for each user
// - Revenue for each user
```

---

## 📝 Key Points

1. **Partners are included in dashboard**:
   - Dashboard query doesn't filter by role, so partners are included
   - Partners appear alongside sales users in the table

2. **Quotation Attribution**:
   - When partners create quotations, `salesUserId` = partner's ID
   - Dashboard counts quotations by `salesUserId`, so partner quotations are included

3. **Visual Indicators**:
   - Partners have a purple "Partner" badge in the dashboard
   - Table header shows "Sales Team & Partners"

4. **Pricing**:
   - Anushka's quotations use End User pricing
   - Aman's quotations use Reseller pricing
   - Pricing is determined by the user type selected in the form (which is filtered for partners)

---

## 🚀 Next Steps

1. **Test the complete flow**:
   - Partner login → Create quotation → Check dashboard
   - Verify quotation appears under partner's name
   - Verify correct pricing is used

2. **Monitor Dashboard**:
   - Check that partner quotations are counted correctly
   - Verify revenue calculations for partners

3. **Add More Partners** (if needed):
   - Use `backend/scripts/createPartners.js` to add more partners
   - Update the `PARTNER_USERS` array in the script

---

## 📞 Support

If partners don't appear in the dashboard:
1. Check database: `db.salesusers.find({ role: 'partner' })`
2. Check backend logs for dashboard query
3. Verify `allowedCustomerTypes` field is included in query
4. Check that quotations have correct `salesUserId`

