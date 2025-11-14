# Sales Login Quick Fix

## Problem: Cannot Login to Sales

The backend server is running, but you still can't log in. Here are the most common issues and solutions:

## Solution 1: Check Database Connection

The backend server might be running, but MongoDB might not be connected.

### Check if MongoDB is Running:

**Windows:**
1. Open Services (Win + R, type `services.msc`)
2. Look for "MongoDB Server" service
3. If it's not running, start it

**Mac/Linux:**
```bash
# Check if MongoDB is running
ps aux | grep mongod

# Start MongoDB (if not running)
mongod
```

### Check Backend Console:

Look at your backend server console. You should see:
```
MongoDB Connected: localhost
```

If you see:
```
Database connection error: ...
⚠️  Server will continue running without database connection
```

Then MongoDB is not connected.

## Solution 2: Seed the Database

If the database is empty or hasn't been seeded, there will be no sales users to log in with.

### Step 1: Navigate to Backend Directory

```bash
cd backend
```

### Step 2: Seed the Database

```bash
npm run seed
```

You should see output like:
```
Starting sales users seeding...
Created user: ashoo.nitin@orion-led.com
Created user: mukund.puranik@orion-led.com
...
Seeding completed:
- Created: X users
- Skipped: Y existing users
- Default password for new users: Orion@123
```

### Step 3: Verify Users Were Created

Check the backend console or database to verify users were created.

## Solution 3: Use Correct Credentials

After seeding, you can use these credentials:

### Default Sales User Credentials:

**Email Examples:**
- `ashoo.nitin@orion-led.com`
- `mukund.puranik@orion-led.com`
- `onkar@orion-led.com`
- `prachi.sharma@orion-led.com`
- `rajneesh.rawat@orion-led.com`
- `vivekanand@orion-led.com`
- `khushi.jafri@orion-led.com`
- `ashwani.yadav@orion-led.com`
- `anshika.trivedi@orion-led.com`
- `madhur@orion-led.com`
- `amisha@orion-led.com`

**Default Password:** `Orion@123`

(Check `backend/scripts/seed.js` for the full list of users)

## Solution 4: Check Browser Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Try logging in
4. Look for error messages

Common errors:
- `Cannot connect to backend server` → Backend not running
- `Invalid email or password` → Wrong credentials or database not seeded
- `Internal server error` → MongoDB not connected or database error
- `CORS error` → CORS configuration issue

## Solution 5: Check Network Tab

1. Open browser DevTools (F12)
2. Go to Network tab
3. Try logging in
4. Look for the `/api/sales/login` request
5. Check:
   - Status code (200 = success, 400/500 = error)
   - Response body (error message)
   - Request headers
   - Response headers

## Quick Diagnostic Steps

1. **Check Backend Health:**
   - Open: `http://localhost:3001/health`
   - Should see: `{"success": true, "message": "Configurator Backend API is running..."}`

2. **Check MongoDB Connection:**
   - Look at backend console
   - Should see: `MongoDB Connected: localhost`

3. **Check Database Seeding:**
   - Run: `cd backend && npm run seed`
   - Should see: Users created successfully

4. **Try Login:**
   - Use email: `ashoo.nitin@orion-led.com`
   - Use password: `Orion@123`
   - Check browser console for errors

## Common Error Messages and Solutions

### "Cannot connect to backend server"
- **Solution**: Start backend server: `cd backend && npm start`

### "Invalid email or password"
- **Solution**: 
  1. Seed database: `cd backend && npm run seed`
  2. Use correct credentials (see above)
  3. Check email format (must match exactly)

### "Internal server error"
- **Solution**: 
  1. Check MongoDB is running
  2. Check database connection in backend console
  3. Check backend console for error messages

### "CORS error"
- **Solution**: 
  1. Check CORS configuration in `backend/server.js`
  2. Verify frontend URL is in CORS origins
  3. Check `FRONTEND_URL` in backend `.env` file

## Still Having Issues?

1. Check backend console for error messages
2. Check browser console for error messages
3. Check network tab for API request details
4. Verify MongoDB is running
5. Verify database is seeded
6. Verify credentials are correct

