# Deployment Verification Guide - Quotation Assignment Fix

## Problem
Quotation assignment works on localhost but NOT in deployed environment. This is a deployment/environment mismatch issue.

## Required Actions

### 1. Backend Deployment (Railway)

#### Verify Backend Code is Deployed
1. Check Railway deployment logs to ensure latest code is deployed
2. Verify the commit hash matches your latest commit: `f2b06cc`
3. Check that `backend/routes/sales.js` contains the latest assignment logic

#### Verify Environment Variables
In Railway dashboard, ensure these are set:
```bash
MONGODB_URI=mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.netlify.app
JWT_SECRET=your-production-jwt-secret
```

#### Restart Backend
1. Go to Railway dashboard
2. Click on your backend service
3. Click "Redeploy" or "Restart"
4. Wait for deployment to complete
5. Verify health check: `https://your-backend.railway.app/health`

### 2. Frontend Deployment (Netlify)

#### Verify Environment Variables
In Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add/Verify: `VITE_API_URL`
3. Value should be: `https://your-backend.railway.app/api`
4. **CRITICAL:** Must NOT be `http://localhost:3001/api`

#### Clear Build Cache and Redeploy
1. Go to Netlify dashboard
2. Deploys → Trigger deploy → Clear cache and deploy site
3. Wait for build to complete
4. Verify build logs show:
   - `VITE_API_URL` is set correctly
   - Build completes successfully

#### Verify Build Output
Check that the built files in `dist/` contain:
- Latest code from `QuoteModal.tsx` and `PdfViewModal.tsx`
- Production logging statements
- Correct API URL (not localhost)

### 3. Verify API Connection

#### Test Backend Health
```bash
curl https://your-backend.railway.app/health
```

Expected response:
```json
{
  "success": true,
  "message": "Configurator Backend API is running - UPDATED CODE VERSION"
}
```

#### Test Frontend API URL
1. Open browser console on deployed frontend
2. Check console logs for:
   ```
   🔐 API Base URL: https://your-backend.railway.app/api
   ```
3. If you see `http://localhost:3001/api`, the environment variable is NOT set correctly

### 4. Production Testing

#### Test Quotation Assignment
1. Login as super user on deployed frontend
2. Create a quotation
3. Select "Prachi" (or another sales person) from dropdown
4. Save quotation
5. **Check browser console** for:
   ```
   🚀 QUOTATION SAVE - Payload being sent: {
     salesUserId: "...",
     salesUserName: "Prachi",
     ...
   }
   ```
6. **Check backend logs** (Railway) for:
   ```
   ✅ Superadmin assigning quotation to: {
     finalSalesUserId: ObjectId("..."),
     finalSalesUserName: "Prachi",
     ...
   }
   ```

#### Verify Database
Query MongoDB to verify saved quotation:
```javascript
// Find the quotation
db.quotations.findOne({ quotationId: "ORION/..." })

// Verify salesUserId matches Prachi's _id
// salesUserId should be ObjectId, not string
```

#### Verify Dashboard
1. Open Super User Dashboard
2. Find Prachi in the list
3. Verify:
   - Quotation count increased
   - Revenue increased
   - Click on Prachi → See the assigned quotation

### 5. Debugging Steps

#### If Assignment Still Doesn't Work

1. **Check Browser Console**
   - Look for `🚀 QUOTATION SAVE - Payload being sent`
   - Verify `salesUserId` is a string (ObjectId string)
   - Verify `apiUrl` is NOT localhost

2. **Check Network Tab**
   - Open DevTools → Network
   - Find POST request to `/api/sales/quotation`
   - Check Request Payload:
     - `salesUserId` should be present
     - `salesUserId` should be a string (not null/undefined)
   - Check Response:
     - Should be 200 OK
     - Should contain `success: true`

3. **Check Backend Logs (Railway)**
   - Look for:
     ```
     🔍 CRITICAL - salesUserId from request: {
       providedSalesUserId: "...",
       ...
     }
     ```
   - Verify `providedSalesUserId` is present
   - Verify it's being converted to ObjectId
   - Verify user lookup succeeds

4. **Check Database Directly**
   ```javascript
   // Find recent quotation
   db.quotations.find().sort({ createdAt: -1 }).limit(1)
   
   // Check salesUserId
   // Should be ObjectId, not string
   // Should match assigned user's _id
   ```

### 6. Common Issues and Fixes

#### Issue: Frontend still using localhost API
**Fix:**
1. Set `VITE_API_URL` in Netlify environment variables
2. Clear cache and redeploy
3. Verify in browser console

#### Issue: Backend not receiving salesUserId
**Fix:**
1. Check browser console for payload log
2. Check Network tab for request payload
3. Verify frontend code is latest version

#### Issue: Backend defaulting to req.user._id
**Fix:**
1. Verify backend code has latest assignment logic
2. Check backend logs for validation messages
3. Restart backend service

#### Issue: Dashboard not showing assigned quotations
**Fix:**
1. Verify database has correct salesUserId (ObjectId)
2. Check dashboard query logs
3. Verify ObjectId matching in aggregation

### 7. Verification Checklist

- [ ] Backend deployed with latest code (commit f2b06cc)
- [ ] Backend environment variables set correctly
- [ ] Backend health check passes
- [ ] Frontend `VITE_API_URL` set to production backend
- [ ] Frontend cache cleared and redeployed
- [ ] Browser console shows correct API URL (not localhost)
- [ ] Quotation save payload includes salesUserId
- [ ] Backend logs show assignment to correct user
- [ ] Database quotation has correct salesUserId (ObjectId)
- [ ] Dashboard shows quotation under assigned user
- [ ] Assigned user's count and revenue increased

### 8. Force Clean Redeploy

#### Backend (Railway)
```bash
# In Railway dashboard:
1. Go to your service
2. Settings → Delete service (or redeploy)
3. Redeploy from latest commit
4. Verify environment variables are set
```

#### Frontend (Netlify)
```bash
# In Netlify dashboard:
1. Site settings → Build & deploy
2. Clear build cache
3. Trigger new deploy
4. Verify environment variables
5. Check build logs
```

## After Deployment

1. Test quotation assignment immediately
2. Check browser console for debug logs
3. Check backend logs for verification messages
4. Verify database has correct salesUserId
5. Confirm dashboard shows correct attribution

If issues persist after following all steps, check:
- Browser console errors
- Network request/response
- Backend logs
- Database records

