# Partner Users Created

## Summary
Two partner users have been successfully created in the database with default password `Orion@123`. Both users must change their password on first login.

---

## Partner Users

### 1. Anushka
- **Email**: `trivedianushka48@gmail.com`
- **Name**: Anushka
- **Role**: `partner`
- **Allowed Customer Types**: `endUser` (End User only)
- **Default Password**: `Orion@123`
- **Must Change Password**: Yes (on first login)

**Access**: Can only see "End User" option when creating quotations.

---

### 2. Aman
- **Email**: `amanabcd@gmail.com`
- **Name**: Aman
- **Role**: `partner`
- **Allowed Customer Types**: `reseller` (Reseller only)
- **Default Password**: `Orion@123`
- **Must Change Password**: Yes (on first login)

**Access**: Can only see "Reseller" option when creating quotations.

---

## Login Instructions

### For Partners:
1. Go to the landing page: `http://localhost:5173`
2. Click **"Partner Login"** button (purple button)
3. Enter email and password: `Orion@123`
4. On first login, you'll be prompted to change your password
5. After password change, you'll be redirected to the configurator

### Testing:
- **Anushka** should only see "End User" in the quotation form
- **Aman** should only see "Reseller" in the quotation form

---

## Script Used
Created and executed: `backend/scripts/createPartners.js`

To recreate or update partners, run:
```bash
cd backend
node scripts/createPartners.js
```

---

## Notes
- Both users have `mustChangePassword: true` - they must change password on first login
- Location and contact number are set to default values (can be updated later)
- The script will update existing users if they already exist (useful for password resets)

