# Partner Login System - Implementation Guide

## Overview
The Partner Login system allows different partners to see different customer types when creating quotations, while sales users continue to see all options.

## Features
- **Partner Role**: New user role `'partner'` added to the system
- **Permission-Based Visibility**: Partners can only see customer types they're allowed to access
- **Sales Users**: Continue to see all 3 customer types (End User, Reseller, SI/Channel)
- **Super Users**: Continue to see all 3 customer types

## Customer Types
1. **End User** (`endUser`) - End Customer
2. **Reseller** (`reseller`) - Reseller / Lowest Price to Channel
3. **SI/Channel** (`siChannel`) - SI / Channel Partner

## Database Schema Changes

### SalesUser Model
Added two fields:
```javascript
role: {
  type: String,
  enum: ['sales', 'super', 'super_admin', 'partner'],
  default: 'sales'
},
allowedCustomerTypes: {
  type: [String],
  enum: ['endUser', 'reseller', 'siChannel'],
  default: []
}
```

## Creating a Partner User

### Example: Partner A (End User only)
```javascript
{
  email: 'partnerA@example.com',
  name: 'Partner A',
  location: 'Mumbai',
  contactNumber: '1234567890',
  role: 'partner',
  allowedCustomerTypes: ['endUser']
}
```

### Example: Partner B (Reseller only)
```javascript
{
  email: 'partnerB@example.com',
  name: 'Partner B',
  location: 'Delhi',
  contactNumber: '1234567890',
  role: 'partner',
  allowedCustomerTypes: ['reseller']
}
```

### Example: Partner C (Channel only)
```javascript
{
  email: 'partnerC@example.com',
  name: 'Partner C',
  location: 'Bangalore',
  contactNumber: '1234567890',
  role: 'partner',
  allowedCustomerTypes: ['siChannel']
}
```

### Example: Partner D (End User + Channel)
```javascript
{
  email: 'partnerD@example.com',
  name: 'Partner D',
  location: 'Chennai',
  contactNumber: '1234567890',
  role: 'partner',
  allowedCustomerTypes: ['endUser', 'siChannel']
}
```

## How It Works

### Backend
1. **Login Endpoint** (`POST /api/sales/login`):
   - Returns `allowedCustomerTypes` array for partners
   - Includes permissions in JWT token
   - Sales/super users get empty array (shows all types)

2. **Authentication Middleware**:
   - Extracts `allowedCustomerTypes` from token
   - Makes permissions available in `req.user.allowedCustomerTypes`

### Frontend
1. **UserTypeModal** (`src/components/UserTypeModal.tsx`):
   - Accepts `allowedCustomerTypes` prop
   - Filters options based on permissions
   - Partners see only allowed types
   - Sales/super users see all types

2. **QuoteModal** (`src/components/QuoteModal.tsx`):
   - Reads `allowedCustomerTypes` from `salesUser` prop
   - Filters dropdown options dynamically
   - Automatically adjusts selected type if current selection becomes invalid

3. **App.tsx**:
   - Handles `'partner'` role same as `'sales'` role
   - Partners go directly to configurator (like sales users)
   - Permissions are passed through `salesUser` object

## Usage Examples

### Creating a Partner via MongoDB
```javascript
const partner = new SalesUser({
  email: 'partner@example.com',
  name: 'Partner Name',
  location: 'Location',
  contactNumber: '1234567890',
  passwordHash: bcrypt.hashSync('password', 12),
  role: 'partner',
  allowedCustomerTypes: ['endUser', 'reseller'] // Can see End User and Reseller
});
await partner.save();
```

### Creating a Partner via API (requires super admin)
You'll need to create an admin endpoint or use MongoDB directly.

## Testing

### Test Case 1: Partner A (End User only)
1. Login as Partner A
2. Create quotation
3. **Expected**: Only "End User" option visible in dropdown
4. **Expected**: Cannot see "Reseller" or "SI/Channel Partner" options

### Test Case 2: Partner D (End User + Channel)
1. Login as Partner D
2. Create quotation
3. **Expected**: "End User" and "SI/Channel Partner" options visible
4. **Expected**: Cannot see "Reseller" option

### Test Case 3: Sales User
1. Login as Sales User
2. Create quotation
3. **Expected**: All 3 options visible (End User, Reseller, SI/Channel Partner)

### Test Case 4: Super User
1. Login as Super User
2. Create quotation
3. **Expected**: All 3 options visible (End User, Reseller, SI/Channel Partner)

## Files Modified

### Backend
- `backend/models/SalesUser.js` - Added `partner` role and `allowedCustomerTypes` field
- `backend/routes/sales.js` - Updated login to return permissions
- `backend/middleware/auth.js` - Updated to include permissions in token

### Frontend
- `src/api/sales.ts` - Updated `SalesUser` interface
- `src/types/index.ts` - Updated `SalesUser` interface
- `src/components/UserTypeModal.tsx` - Added permission filtering
- `src/components/QuoteModal.tsx` - Added permission filtering for dropdown
- `src/App.tsx` - Added partner role handling
- `src/components/DisplayConfigurator.tsx` - Updated to accept partner role

## Migration Notes

### Existing Users
- Existing users with `role: 'sales'` will continue to work
- They will see all customer types (backward compatible)
- No migration needed for existing users

### New Partner Users
- Must be created with `role: 'partner'`
- Must specify `allowedCustomerTypes` array
- Empty array means no customer types (shouldn't happen in practice)

## Security Considerations
1. **Backend Validation**: Backend validates `allowedCustomerTypes` against enum values
2. **Frontend Filtering**: Frontend filters options but backend should also validate
3. **Token Security**: Permissions are stored in JWT token (consider refresh strategy)
4. **Default Behavior**: If permissions missing, defaults to showing all types (sales user behavior)

## Future Enhancements
1. Admin UI to manage partner permissions
2. API endpoint to update partner permissions
3. Audit log for permission changes
4. Bulk permission updates

