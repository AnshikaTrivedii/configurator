# Deploy Partner Users on Render

## Method 1: Using Render Shell (Easiest)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Select your **backend service**
3. Click on **"Shell"** tab (or find it in the sidebar)
4. Run these commands:

```bash
cd backend
npm run create-partners
```

5. You should see output confirming the users were created:
```
✅ Created/Updated partner user: anushka48@gmail.com
✅ Created/Updated partner user: amanabcd@gmail.com
```

## Method 2: Using Render's Environment Variables

If you need to ensure the script uses the correct database connection:

1. Go to your backend service in Render
2. Go to **Environment** tab
3. Verify `MONGODB_URI` is set correctly
4. Then use Shell to run the script

## Method 3: Add as a Build Command (One-time)

If you want to run it automatically on next deploy:

1. Go to your backend service settings
2. In **Build Command**, you can temporarily add:
   ```bash
   npm install && npm run create-partners
   ```
3. **Note:** Remove this after first run to avoid running it on every deploy

## Verification

After running the script, test login with:
- Email: `anushka48@gmail.com`
- Password: `Orion@123`

## Troubleshooting

**If you get "command not found":**
- Make sure you're in the correct directory
- Try: `cd /opt/render/project/src/backend` (Render's default path)

**If you get database connection errors:**
- Check your `MONGODB_URI` environment variable in Render
- Ensure your MongoDB database is accessible from Render

**If the script doesn't exist:**
- Make sure you've pulled the latest code: `git pull origin main`
- Or redeploy your service to get the latest code

