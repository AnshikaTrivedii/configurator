# Deploy Partner Users to Production

## Issue
Partner users (`anushka48@gmail.com` and `amanabcd@gmail.com`) don't exist in the deployed database, causing "Invalid email or password" errors.

## Solution: Run the Partner Creation Script

### Option 1: Using npm script (Recommended)

```bash
cd backend
npm run create-partners
```

### Option 2: Direct node command

```bash
cd backend
node scripts/createPartners.js
```

## Partner Users Created

1. **Anushka**
   - Email: `anushka48@gmail.com`
   - Password: `Orion@123` (must change on first login)
   - Role: `partner`
   - Allowed Customer Types: `['endUser']`

2. **Aman**
   - Email: `amanabcd@gmail.com`
   - Password: `Orion@123` (must change on first login)
   - Role: `partner`
   - Allowed Customer Types: `['reseller']`

## Important Notes

- The script will **create** new users if they don't exist
- The script will **update** existing users if they already exist (resets password to `Orion@123`)
- Default password for all partners: `Orion@123`
- Partners **must** change their password on first login
- Make sure your `.env` file has the correct `MONGODB_URI` pointing to your deployed database

## Verification

After running the script, you should see output like:

```
✅ Created partner user: anushka48@gmail.com
   Name: Anushka
   Role: partner
   Allowed Customer Types: endUser
   Password: Orion@123 (must change on first login)

✅ Created partner user: amanabcd@gmail.com
   Name: Aman
   Role: partner
   Allowed Customer Types: reseller
   Password: Orion@123 (must change on first login)
```

## Troubleshooting

If you get connection errors:
1. Check your `MONGODB_URI` in `.env` file
2. Ensure your database is accessible from your deployment environment
3. Check firewall/network settings

If users still can't login:
1. Verify the script ran successfully
2. Check database connection
3. Verify email addresses match exactly (case-sensitive)
4. Ensure password is `Orion@123` (case-sensitive)

