# Sales Login Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Cannot connect to backend server"

**Symptoms:**
- Error message: "Failed to connect to server. Please check if the backend is running on port 3001."
- Login button shows loading but fails
- Network error in browser console

**Solutions:**

1. **Check if Backend Server is Running**
   ```bash
   cd backend
   npm start
   ```
   
   You should see:
   ```
   🚀 Server running on port 3001
   📊 Health check: http://localhost:3001/health
   🔐 Sales API: http://localhost:3001/api/sales
   ```

2. **Verify Backend is Accessible**
   - Open browser and go to: `http://localhost:3001/health`
   - You should see a JSON response: `{"success": true, "message": "Configurator Backend API is running..."}`
   
3. **Check API URL Configuration**
   - Frontend uses: `http://localhost:3001/api` (default)
   - Can be overridden with `VITE_API_URL` environment variable
   - Check browser console for actual API URL being used

---

### Issue: "Invalid email or password"

**Symptoms:**
- Login form accepts credentials but returns "Invalid email or password"
- Error status: 400

**Solutions:**

1. **Check if Sales Users Exist in Database**
   ```bash
   cd backend
   npm run seed
   ```
   This will create default sales users if they don't exist.

2. **Verify MongoDB is Running**
   - MongoDB should be running on `mongodb://localhost:27017`
   - Or set `MONGODB_URI` in backend `.env` file
   - Check backend console for: "MongoDB Connected: ..."

3. **Check Database Connection**
   - Backend will continue running even if MongoDB is not connected
   - Login will fail if database is not connected
   - Check backend console for database connection errors

4. **Verify User Credentials**
   - Check seed.js for default user credentials
   - Or check database directly for sales users

---

### Issue: "CORS error"

**Symptoms:**
- Browser console shows CORS error
- Network tab shows preflight request failing

**Solutions:**

1. **Check CORS Configuration in backend/server.js**
   - Backend should allow requests from: `http://localhost:5173` (default Vite port)
   - If using different port, add it to CORS origins

2. **Verify Frontend URL**
   - Frontend should be running on one of the allowed origins
   - Default: `http://localhost:5173`
   - Check Vite dev server port

---

### Issue: "404 - Login endpoint not found"

**Symptoms:**
- Error: "Login endpoint not found"
- Status: 404

**Solutions:**

1. **Verify Backend Routes**
   - Check that `backend/routes/sales.js` exists
   - Verify route is registered in `backend/server.js`: `app.use('/api/sales', salesRoutes)`

2. **Check API URL**
   - Frontend should call: `http://localhost:3001/api/sales/login`
   - Verify the URL in browser Network tab

---

## Step-by-Step Setup

### 1. Start MongoDB
```bash
# If MongoDB is installed locally
mongod

# Or if using MongoDB Atlas, ensure MONGODB_URI is set in .env
```

### 2. Configure Backend Environment
Create `backend/.env` file:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/configurator
JWT_SECRET=your-secret-key-here
FRONTEND_URL=http://localhost:5173
```

### 3. Seed Database with Sales Users
```bash
cd backend
npm run seed
```

### 4. Start Backend Server
```bash
cd backend
npm start
```

### 5. Start Frontend
```bash
npm run dev
```

### 6. Test Login
1. Open frontend: `http://localhost:5173`
2. Click "Sales Login" button
3. Use credentials from seed script (check seed.js for default users)

---

## Debugging Steps

### 1. Check Browser Console
- Open Developer Tools (F12)
- Go to Console tab
- Look for error messages when clicking login
- Check for network errors

### 2. Check Network Tab
- Open Developer Tools (F12)
- Go to Network tab
- Try logging in
- Check the `/api/sales/login` request:
  - Status code
  - Response body
  - Request headers
  - Response headers

### 3. Check Backend Console
- Look at backend server console
- Check for:
  - Database connection messages
  - API request logs
  - Error messages
  - Login attempt logs

### 4. Verify API Endpoint
```bash
# Test login endpoint directly
curl -X POST http://localhost:3001/api/sales/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

---

## Common Error Messages

### "Failed to connect to server"
- **Cause:** Backend server is not running
- **Fix:** Start backend server with `cd backend && npm start`

### "Invalid email or password"
- **Cause:** User doesn't exist or password is incorrect
- **Fix:** Seed database with `npm run seed` or verify credentials

### "CORS error"
- **Cause:** Frontend URL is not allowed in CORS configuration
- **Fix:** Add frontend URL to CORS origins in backend/server.js

### "Database connection error"
- **Cause:** MongoDB is not running or connection string is wrong
- **Fix:** Start MongoDB or update MONGODB_URI in .env

---

## Quick Diagnostic

Run these commands to diagnose the issue:

```bash
# 1. Check if backend is running
curl http://localhost:3001/health

# 2. Check if MongoDB is running
# (Windows) Check MongoDB service status
# (Mac/Linux) ps aux | grep mongod

# 3. Check backend logs
cd backend
npm start
# Look for database connection and server startup messages

# 4. Check frontend console
# Open browser DevTools and check Console tab for errors
```

---

## Still Having Issues?

1. **Check all console logs** (browser and backend)
2. **Verify environment variables** are set correctly
3. **Check database connection** is working
4. **Verify sales users exist** in database
5. **Check network connectivity** between frontend and backend
6. **Verify CORS configuration** allows your frontend origin
7. **Check JWT_SECRET** is set in backend .env
8. **Verify port 3001** is not being used by another application

