# Quick Start Guide - Backend Server

## Problem: Cannot Login to Sales

If you're unable to log in to the sales login, the most common issue is that **the backend server is not running**.

## Solution: Start the Backend Server

### Step 1: Open a Terminal/Command Prompt

### Step 2: Navigate to the Backend Directory

```bash
cd backend
```

### Step 3: Install Dependencies (if not already installed)

```bash
npm install
```

### Step 4: Check Environment Configuration

Create a `.env` file in the `backend` directory if it doesn't exist:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/configurator
JWT_SECRET=your-secret-key-here-change-in-production
FRONTEND_URL=http://localhost:5173
```

### Step 5: Start MongoDB (if not running)

Make sure MongoDB is running on your system:
- **Windows**: Check if MongoDB service is running in Services
- **Mac/Linux**: Run `mongod` or check if MongoDB service is running

### Step 6: Seed the Database (if needed)

If you haven't seeded the database with sales users:

```bash
npm run seed
```

This will create default sales users with:
- **Default Password**: `Orion@123`
- **Email**: Check `backend/scripts/seed.js` for the list of users

### Step 7: Start the Backend Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### Step 8: Verify Backend is Running

You should see output like:
```
🚀 Server running on port 3001
📊 Health check: http://localhost:3001/health
🔐 Sales API: http://localhost:3001/api/sales
🌐 Frontend URL: http://localhost:5173
MongoDB Connected: localhost
```

### Step 9: Test the Backend

Open your browser and go to:
```
http://localhost:3001/health
```

You should see a JSON response:
```json
{
  "success": true,
  "message": "Configurator Backend API is running - UPDATED CODE VERSION",
  "timestamp": "...",
  "version": "v2.1.0"
}
```

### Step 10: Try Login Again

Now go back to your frontend application and try logging in again.

## Default Sales User Credentials

After seeding the database, you can use any of these emails (check `backend/scripts/seed.js` for the full list):

- `ashoo.nitin@orion-led.com`
- `mukund.puranik@orion-led.com`
- `onkar@orion-led.com`
- ... (and more)

**Default Password**: `Orion@123`

## Troubleshooting

### Issue: "Cannot connect to backend server"

**Solution**: Make sure the backend server is running on port 3001.

### Issue: "MongoDB connection error"

**Solution**: 
1. Make sure MongoDB is installed and running
2. Check the `MONGODB_URI` in your `.env` file
3. If using MongoDB Atlas, update the connection string

### Issue: "Invalid email or password"

**Solution**:
1. Make sure you've seeded the database: `npm run seed`
2. Use the correct email format (check `backend/scripts/seed.js`)
3. Use the default password: `Orion@123`

### Issue: "CORS error"

**Solution**: 
1. Check that your frontend URL is in the CORS configuration in `backend/server.js`
2. Make sure `FRONTEND_URL` in `.env` matches your frontend URL

## Quick Commands Summary

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Seed database
npm run seed

# Start server
npm start

# Start server with auto-reload (development)
npm run dev
```

## Still Having Issues?

1. Check browser console for error messages
2. Check backend console for error messages
3. Verify MongoDB is running
4. Verify backend server is running on port 3001
5. Check that frontend is running on port 5173 (or update CORS in backend)
6. Check network tab in browser DevTools for API request details

