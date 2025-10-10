# Deployment Troubleshooting Guide

## Issues You're Experiencing

### 1. Sales Team Login Modal Appearing
**This is normal behavior** - The modal appears when users click the "🔐 SALES LOGIN" button. This is the intended way for sales team members to access additional features.

### 2. "API endpoint not found" Error
This error occurs when your frontend tries to call API endpoints that don't exist in your backend. This has been fixed by adding the missing `/api/email/quota` endpoint.

### 3. "Invalid email or password" Error
This error indicates authentication issues. Here are the most likely causes and solutions:

## Troubleshooting Steps

### Step 1: Verify Frontend Environment Variables
Your frontend needs to know where your backend is deployed.

**For Vercel deployment:**
1. Go to your Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Add: `VITE_API_URL` = `https://your-backend-url.com/api`

**For Netlify deployment:**
1. Go to your Netlify dashboard
2. Select your site
3. Go to Site settings → Environment variables
4. Add: `VITE_API_URL` = `https://your-backend-url.com/api`

### Step 2: Verify Backend is Running
Test your backend API:
1. Visit: `https://your-backend-url.com/health`
2. You should see: `{"status":"ok","timestamp":"..."}`

### Step 3: Check Backend Environment Variables
Your backend needs these environment variables:

**Required Backend Environment Variables:**
- `MONGODB_URI`: Your MongoDB Atlas connection string
- `JWT_SECRET`: A strong random string
- `FRONTEND_URL`: Your frontend URL (for CORS)
- `NODE_ENV`: `production`

### Step 4: Seed the Database
Your production database needs sales users. Run this in your backend deployment:

```bash
npm run seed
```

Or manually create a user using the scripts in your backend folder.

### Step 5: Test Authentication
Try logging in with these credentials:
- **Email**: `anshika.trivedi@orion-led.com`
- **Password**: `Orion@123`

## Quick Fix Commands

### For Railway Backend:
```bash
# SSH into your Railway deployment
railway shell

# Run the seed script
npm run seed

# Or create a specific user
node update-production-db.cjs
```

### For Render Backend:
```bash
# Use Render's shell feature
# Run the seed script
npm run seed
```

## Common Issues and Solutions

### Issue: "API endpoint not found" Error
**Solution**: This has been fixed by adding the missing `/api/email/quota` endpoint to your backend. The error occurred because:
- Your frontend was trying to call `/api/email/quota` for quote submissions
- Your backend only had `/api/sales/*` endpoints
- The quote API was hardcoded to an external URL

**Fix Applied**: 
- Added `/api/email/quota` endpoint to your backend
- Updated quote API to use your backend instead of external URL

### Issue: CORS Errors
**Solution**: Make sure `FRONTEND_URL` environment variable in backend matches your frontend URL exactly.

### Issue: Database Connection Failed
**Solution**: 
1. Check your MongoDB Atlas connection string
2. Ensure your IP is whitelisted (or use 0.0.0.0/0 for all IPs)
3. Verify database user has proper permissions

### Issue: JWT Secret Missing
**Solution**: Set a strong JWT_SECRET in your backend environment variables.

### Issue: Frontend Can't Reach Backend
**Solution**: 
1. Verify `VITE_API_URL` is set correctly
2. Check that backend is actually running
3. Test the backend URL directly in browser

## Testing Your Fix

1. **Test Backend Health**: Visit `https://your-backend-url.com/health`
2. **Test Login**: Try logging in with `anshika.trivedi@orion-led.com` / `Orion@123`
3. **Check Browser Console**: Look for any network errors or CORS issues

## Need Help?

If you're still having issues, check:
1. Your deployment platform's logs (Railway/Render console)
2. Browser developer tools → Network tab
3. Browser developer tools → Console tab

The most common issue is missing or incorrect environment variables.
