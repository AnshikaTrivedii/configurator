# Deployment Guide

## Environment Variables

### Frontend (.env file)
Create a `.env` file in the root directory with:

```env
# For local development
VITE_API_URL=http://localhost:3001/api

# For production deployment, set this to your backend URL:
# VITE_API_URL=https://your-backend-domain.com/api
```

### Backend Environment Variables
Create a `.env` file in the `backend/` directory with:

```env
# Database (use MongoDB Atlas for production)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/configurator

# JWT Secret (use a strong random string)
JWT_SECRET=your-super-secret-jwt-key-here

# Frontend URL (for CORS)
FRONTEND_URL=https://your-frontend-domain.com

# Server Port (Railway/Render will set this automatically)
PORT=3001

# Environment
NODE_ENV=production
```

### MongoDB Setup (Required)
1. **Create MongoDB Atlas account** at https://cloud.mongodb.com
2. **Create a new cluster**
3. **Get connection string** and use it as MONGODB_URI
4. **Whitelist all IPs** (0.0.0.0/0) for deployment

## Deployment Steps

### Option 1: Railway (Recommended)

#### Backend Deployment:
1. **Go to** https://railway.app
2. **Sign up/Login** with GitHub
3. **Click "New Project"** → "Deploy from GitHub repo"
4. **Select your repository** and choose the `backend` folder
5. **Set Environment Variables:**
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `JWT_SECRET`: A strong random string (e.g., `my-super-secret-jwt-key-2024`)
   - `FRONTEND_URL`: Your frontend URL (e.g., `https://your-app.vercel.app`)
   - `NODE_ENV`: `production`
6. **Deploy** - Railway will automatically build and deploy
7. **Get your backend URL** (e.g., `https://your-app.railway.app`)

#### Frontend Deployment (Vercel):
1. **Go to** https://vercel.com
2. **Import your GitHub repository**
3. **Set Environment Variable:**
   - `VITE_API_URL`: `https://your-backend-url.railway.app/api`
4. **Deploy**

### Option 2: Render

#### Backend Deployment:
1. **Go to** https://render.com
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Set build command:** `npm install`
5. **Set start command:** `npm start`
6. **Set environment variables** (same as Railway)
7. **Deploy**

### After Backend Deployment:
1. **Run the seed script** to create sales users:
   ```bash
   # SSH into your deployed backend or use Railway/Render console
   npm run seed
   ```
2. **Test the API** at `https://your-backend-url.com/health`

## Sales Team Login

All sales team members can login with:
- **Password**: `Orion@123` (first time only)
- **Emails**: See the complete list in `backend/scripts/seed.js`

After first login, users will be prompted to set a new password.
