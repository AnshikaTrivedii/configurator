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
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
FRONTEND_URL=your_frontend_url
PORT=3001
NODE_ENV=production
```

## Deployment Steps

1. **Deploy Backend:**
   - Deploy the `backend/` folder to your hosting service
   - Set up MongoDB database
   - Configure environment variables
   - Run `npm run seed` to create sales users

2. **Deploy Frontend:**
   - Set `VITE_API_URL` to your deployed backend URL
   - Deploy the frontend to your hosting service

## Sales Team Login

All sales team members can login with:
- **Password**: `Orion@123` (first time only)
- **Emails**: See the complete list in `backend/scripts/seed.js`

After first login, users will be prompted to set a new password.
