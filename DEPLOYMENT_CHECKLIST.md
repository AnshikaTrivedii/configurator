# 🚀 Deployment Checklist

## ✅ Code Changes Pushed to GitHub

**Commit:** `4540843 - feat: Update quotation ID format and fix pricing consistency`

---

## 📋 Pre-Deployment Checklist

### Backend Configuration

- [x] **Backend Port**: `3001` (configurable via `PORT` env variable)
- [x] **Health Check Endpoint**: `/health`
- [x] **API Base Path**: `/api/sales`
- [x] **Database**: MongoDB Atlas (via `MONGODB_URI` env variable)

### Frontend Configuration

- [x] **API URL**: Uses `VITE_API_URL` environment variable
- [x] **Fallback**: `http://localhost:3001/api` (for local development)
- [x] **Build**: Successfully built with Vite

### New Features

- [x] **Quotation ID Format**: `ORION/YYYY/MM/DD/FIRSTNAME/XXX`
- [x] **Duplicate Prevention**: Database check via `/check-latest-quotation-id`
- [x] **Pricing Consistency**: Fixed between PDF and dashboard
- [x] **Exact Data Storage**: Pricing breakdown and product specs saved

---

## 🔧 Environment Variables Required

### Backend (Railway/Production)

```bash
# Required
MONGODB_URI=<your-mongodb-atlas-connection-string>
JWT_SECRET=<your-jwt-secret>
PORT=3000  # Railway will set this automatically

# Optional
FRONTEND_URL=<your-frontend-url>
```

### Frontend (Vercel/Netlify/Production)

```bash
# Required - Set this to your backend URL
VITE_API_URL=https://your-backend-url.railway.app/api
```

---

## 🌐 API Endpoints Reference

### Authentication
- `POST /api/sales/login` - Login
- `POST /api/sales/set-password` - Set password
- `POST /api/sales/change-password` - Change password

### Sales Operations
- `GET /api/sales/profile` - Get user profile
- `GET /api/sales/dashboard` - Get dashboard data
- `POST /api/sales/quotation` - Save quotation
- `GET /api/sales/salesperson/:id` - Get salesperson details

### New Endpoints
- `POST /api/sales/check-latest-quotation-id` - Check latest quotation ID for duplicate prevention

### Testing/Debug
- `GET /health` - Health check
- `GET /api/sales/test-routes` - Test routes
- `GET /api/sales/debug-quotation` - Debug quotation
- `POST /api/sales/test-quotation` - Test quotation save
- `GET /api/sales/test-db` - Test database connection

---

## 🚀 Deployment Steps

### 1. Backend Deployment (Railway)

```bash
# Railway will automatically:
# 1. Detect the backend/ directory
# 2. Run: npm install
# 3. Run: npm start (which runs: node server.js)
# 4. Set PORT environment variable
# 5. Expose the service URL
```

**Important**: Set these environment variables in Railway:
- `MONGODB_URI` (your MongoDB Atlas connection string)
- `JWT_SECRET` (your JWT secret key)
- `FRONTEND_URL` (your frontend URL, e.g., https://your-app.vercel.app)

### 2. Frontend Deployment (Vercel/Netlify)

```bash
# Build command:
npm run build

# Output directory:
dist

# Environment variables to set:
VITE_API_URL=https://your-backend-url.railway.app/api
```

---

## ✅ Post-Deployment Verification

### 1. Check Backend Health

```bash
curl https://your-backend-url.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-10T...",
  "version": "v2.1.0",
  "database": "connected"
}
```

### 2. Test Login Endpoint

```bash
curl -X POST https://your-backend-url.railway.app/api/sales/login \
  -H "Content-Type: application/json" \
  -d '{"email":"khushi.jafri@orion-led.com","password":"Orion@123"}'
```

### 3. Test Quotation ID Endpoint

```bash
curl -X POST https://your-backend-url.railway.app/api/sales/check-latest-quotation-id \
  -H "Content-Type: application/json" \
  -d '{"firstName":"ANSHIKA","year":"2025","month":"01","day":"10"}'
```

Expected response:
```json
{
  "success": true,
  "latestSerial": 0,
  "pattern": "/^ORION\\/2025\\/01\\/10\\/ANSHIKA\\/\\d{3}$/",
  "foundQuotation": null
}
```

### 4. Test Frontend Connection

1. Open your deployed frontend URL
2. Login with test credentials:
   - Email: `khushi.jafri@orion-led.com`
   - Password: `Orion@123`
3. Create a new quotation
4. Verify the quotation ID format: `ORION/YYYY/MM/DD/FIRSTNAME/XXX`
5. Check that the price matches between PDF and Super User dashboard

---

## 🔍 Troubleshooting

### Issue: Frontend can't connect to backend

**Solution**: Verify `VITE_API_URL` is set correctly in frontend environment variables.

### Issue: CORS errors

**Solution**: Check that `FRONTEND_URL` is set in backend environment variables.

### Issue: Database connection fails

**Solution**: Verify `MONGODB_URI` is correct and MongoDB Atlas allows connections from Railway's IP.

### Issue: Quotation ID format is old

**Solution**: Clear localStorage in browser and create a new quotation.

---

## 📊 Key Metrics to Monitor

- ✅ Backend uptime
- ✅ API response times
- ✅ Database connection status
- ✅ Quotation creation success rate
- ✅ Price consistency between PDF and dashboard
- ✅ Quotation ID uniqueness (no duplicates)

---

## 📝 Notes

1. **Quotation ID Format**: Changed from `ORION/YYYY/MM/USERNAME/XXXXXX` to `ORION/YYYY/MM/DD/FIRSTNAME/XXX`
2. **First Name Extraction**: Only the first name is used (e.g., "Anshika Trivedi" → "ANSHIKA")
3. **Duplicate Prevention**: System checks both localStorage and database before generating new IDs
4. **Pricing Fixes**: All pricing calculations now include 18% GST and match the PDF exactly
5. **Exact Data Storage**: Quotations now store the exact pricing breakdown and product specs as shown on the UI

---

## 🎯 Success Criteria

- [x] All tests pass locally
- [x] Code pushed to GitHub
- [ ] Backend deployed successfully on Railway
- [ ] Frontend deployed successfully on Vercel/Netlify
- [ ] Health check returns "healthy"
- [ ] Login works correctly
- [ ] New quotation ID format working
- [ ] Price consistency verified
- [ ] No console errors in browser

---

## 🔗 Useful Links

- **GitHub Repository**: https://github.com/AnshikaTrivedii/configurator
- **Backend (Railway)**: [Set your Railway URL here]
- **Frontend (Vercel)**: [Set your Vercel URL here]
- **MongoDB Atlas**: [Set your Atlas cluster URL here]

---

**Deployment Date**: January 10, 2025
**Version**: v2.1.0
**Status**: ✅ Ready for Deployment

