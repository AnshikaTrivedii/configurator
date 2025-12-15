# Deployment Checklist - Ownership Fix (CRITICAL)

## ✅ Changes Pushed to GitHub
- **Commit**: `27c7c0f` - CRITICAL FIX: Correct quotation ownership assignment logic
- **File Changed**: `backend/routes/sales.js`
- **Status**: ✅ Pushed to `main` branch

---

## 🚀 Backend Deployment (Railway)

### Step 1: Verify Code is Deployed
1. Go to Railway dashboard → Your backend service
2. Check "Deployments" tab
3. Verify latest deployment shows commit: `27c7c0f`
4. If not, trigger a new deployment:
   - Click "Redeploy" or
   - Push a dummy commit to trigger auto-deploy

### Step 2: Verify Environment Variables
In Railway dashboard → Variables tab, ensure these are set:

```bash
MONGODB_URI=mongodb+srv://trivedianshika48_db_user:pPMA2M5qLhIbh58y@cluster0.kssxg5e.mongodb.net/configurator?retryWrites=true&w=majority&appName=Cluster0
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.netlify.app
JWT_SECRET=your-production-jwt-secret
```

### Step 3: Restart/Redeploy Backend
1. Railway dashboard → Your backend service
2. Click "Redeploy" or "Restart"
3. Wait for deployment to complete (check logs)
4. Verify health check: `https://your-backend.railway.app/health`

### Step 4: Verify Backend Logs
After deployment, check Railway logs for:
- ✅ Server started successfully
- ✅ Database connected
- ✅ No errors in startup

---

## 🌐 Frontend Deployment (Netlify)

### Step 1: Verify Environment Variables
In Netlify dashboard → Site settings → Environment variables:

**CRITICAL**: Set `VITE_API_URL`
- **Key**: `VITE_API_URL`
- **Value**: `https://your-backend.railway.app/api`
- **⚠️ MUST NOT be**: `http://localhost:3001/api`

### Step 2: Clear Cache and Redeploy
1. Netlify dashboard → Deploys
2. Click "Trigger deploy" → "Clear cache and deploy site"
3. Wait for build to complete
4. Verify build logs show:
   - ✅ `VITE_API_URL` is set correctly
   - ✅ Build completes successfully
   - ✅ No errors

### Step 3: Verify Build Output
After deployment, verify:
- ✅ Site is live and accessible
- ✅ No console errors in browser
- ✅ API calls are going to production backend (not localhost)

---

## 🧪 Testing the Ownership Fix

### Test 1: Super User Assigns to Sales Person
1. **Login** as super user (`super@orion-led.com`)
2. **Create a quotation**
3. **Assign to a sales person** (e.g., "Prachi" or "Rajneesh Rawat")
4. **Save the quotation**
5. **Check browser console** for:
   ```
   🚀 QUOTATION SAVE - Payload being sent
   salesUserId: [assigned user's ID]
   salesUserName: [assigned user's name]
   ```
6. **Check backend logs** (Railway) for:
   ```
   ✅ Super user assigned quotation to: [assigned user]
   FINAL ASSIGNMENT → [assigned user name] [assigned user ID]
   ```

### Test 2: Verify Dashboard Attribution
1. **Open Super User Dashboard**
2. **Check the assigned user's row** (e.g., Prachi)
   - ✅ Quotation count should increase
   - ✅ Revenue should increase
3. **Check super user's row**
   - ✅ Quotation count should NOT increase
   - ✅ Revenue should NOT increase

### Test 3: Sales Person Dashboard
1. **Login as the assigned sales person** (e.g., Prachi)
2. **Open their dashboard**
3. **Verify**:
   - ✅ The quotation appears in their list
   - ✅ Quotation count is correct
   - ✅ Revenue is correct

### Test 4: Super User Creates for Themselves
1. **Login as super user**
2. **Create a quotation**
3. **Do NOT assign to anyone** (leave dropdown as default)
4. **Save the quotation**
5. **Verify**:
   - ✅ Quotation appears in super user's dashboard
   - ✅ Quotation count increases for super user
   - ✅ Backend logs show: `FINAL ASSIGNMENT → [super user name] [super user ID]`

---

## 🔍 Debugging if Issues Persist

### Check Backend Logs (Railway)
Look for these log messages:
```
FINAL ASSIGNMENT → [name] [id]
📊 FINAL ATTRIBUTION: { quotationId, finalSalesUserId, finalSalesUserName }
```

### Check Frontend Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for:
   ```
   🚀 QUOTATION SAVE - Payload being sent
   salesUserId: [should be assigned user's ID, not super user's ID]
   ```

### Verify Database
If needed, check MongoDB directly:
```javascript
// Find quotations assigned to a specific user
db.quotations.find({ 
  salesUserId: ObjectId("assigned-user-id-here") 
})

// Should return quotations assigned to that user
```

### Common Issues

#### Issue: Quotation still shows under super user
**Solution**: 
- Check backend logs for `FINAL ASSIGNMENT` message
- Verify `salesUserId` in payload matches assigned user
- Clear browser cache and retry

#### Issue: Backend not receiving correct salesUserId
**Solution**:
- Verify `VITE_API_URL` in Netlify is set to production backend
- Check browser console for API URL being used
- Ensure frontend is rebuilt after environment variable change

#### Issue: Assignment works locally but not in production
**Solution**:
- Verify backend code is deployed (check Railway commit hash)
- Verify environment variables are set correctly
- Check Railway logs for any errors
- Restart backend service

---

## ✅ Success Criteria

The fix is working correctly when:
1. ✅ Super user assigns quotation to sales person → quotation appears under sales person
2. ✅ Super user creates quotation for themselves → quotation appears under super user
3. ✅ Sales person dashboard shows their assigned quotations
4. ✅ Super user dashboard shows correct counts (not including assigned quotations)
5. ✅ Backend logs show `FINAL ASSIGNMENT → [correct name] [correct ID]`
6. ✅ Database `salesUserId` field matches assigned user (not super user)

---

## 📞 Next Steps After Deployment

1. **Test all scenarios** above
2. **Monitor logs** for 24 hours
3. **Verify** no errors in production
4. **Confirm** with users that assignment is working correctly

---

**Last Updated**: After commit `27c7c0f`
**Fix Status**: ✅ Code pushed, ready for deployment verification

