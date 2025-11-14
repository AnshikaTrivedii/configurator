# How to Start the Backend Server

## Quick Start

1. **Open a new terminal/command prompt**

2. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

3. **Create `.env` file (if it doesn't exist):**
   ```env
   PORT=3001
   MONGODB_URI=mongodb://localhost:27017/configurator
   JWT_SECRET=your-secret-key-here
   FRONTEND_URL=http://localhost:5173
   ```

4. **Install dependencies (if not already installed):**
   ```bash
   npm install
   ```

5. **Seed the database with sales users:**
   ```bash
   npm run seed
   ```

6. **Start the backend server:**
   ```bash
   npm start
   ```

## Default Sales User Credentials

After seeding, you can use:
- **Email**: `ashoo.nitin@orion-led.com` (or any email from `backend/scripts/seed.js`)
- **Password**: `Orion@123`

## Verify Backend is Running

1. Open browser: `http://localhost:3001/health`
2. You should see: `{"success": true, "message": "Configurator Backend API is running..."}`

## Then Try Login Again

Go back to your frontend application and try logging in again.

