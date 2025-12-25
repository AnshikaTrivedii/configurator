#Deployment

## How to Deploy

To Development

1.Create/Switch to the develop branch: git checkout -b develop

2.Make your changes.

3.Push: git push origin develop

4.The action "Deploy to Development" will run.

To Production

1.Switch to main: git checkout main

2.Merge development changes: git merge develop

3.Push: git push origin main

The action "Deploy to Production" will run.

# API Endpoints Documentation

## Environment Setup

### Backend Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure the following variables:

- `PORT` - Server port (default: 3001)
- `MONGODB_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT token signing (use a strong random string in production)
- `FRONTEND_URL` - Frontend URL for CORS configuration
- `NODE_ENV` - Environment (development/production/test)
- `RUN_PARTNER_SCRIPT` - Set to 'true' to run partner creation script on startup

### Frontend Environment Variables

Copy `.env.example` to `.env` and configure the following variables:

- `VITE_API_URL` - Backend API base URL (e.g., `http://localhost:3001/api`)

**Note:** Both `.env` files are gitignored. Use the `.env.example` files as templates.

---

## Base URL
```
http://localhost:3001 (development)
```

---

## Health Check

### GET `/health`
Check if the backend API is running.

**Request Body:** None

**Response Body:**
```json
{
  "success": true,
  "message": "Configurator Backend API is running - UPDATED CODE VERSION",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "v2.1.0",
  "features": {
    "quotationAssignment": "DEPLOYED",
    "objectIdValidation": "ENABLED",
    "assignmentVerification": "ENABLED",
    "enhancedLogging": "ENABLED"
  },
  "environment": "development",
  "frontendUrl": "http://localhost:5173"
}
```

---

## Products API

### GET `/api/products`
Get products with optional filtering.

**Query Parameters:**
- `guidedMode` (boolean, optional): Whether user is in guided mode
- `recommendedPixelPitch` (string|number, optional): Recommended pixel pitch to filter by
- `products` (JSON string, optional): Products array to filter

**Request Body:** None

**Response Body:**
```json
{
  "success": true,
  "products": [],
  "total": 0,
  "filters": {
    "guidedMode": false,
    "recommendedPixelPitch": null,
    "applied": false
  }
}
```

---

### POST `/api/products/filter`
Filter products based on guided mode and recommended pixel pitch.

**Request Body:**
```json
{
  "products": [],
  "guidedMode": false,
  "recommendedPixelPitch": "1.5"
}
```

**Response Body:**
```json
{
  "success": true,
  "products": [],
  "total": 0,
  "originalTotal": 0,
  "filters": {
    "guidedMode": false,
    "recommendedPixelPitch": "1.5",
    "applied": false
  }
}
```

---

## Sales API

### POST `/api/sales/login`
Login for sales users, partners, and super admins.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response Body:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "location": "Mumbai",
    "contactNumber": "9876543210",
    "email": "user@example.com",
    "role": "sales",
    "allowedCustomerTypes": []
  },
  "mustChangePassword": false
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

---

### POST `/api/sales/set-password`
Set password for first-time login (requires authentication).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "currentPassword": "temporary_password",
  "newPassword": "new_secure_password"
}
```

**Response Body:**
```json
{
  "success": true,
  "token": "new_jwt_token_here",
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "location": "Mumbai",
    "contactNumber": "9876543210",
    "email": "user@example.com",
    "role": "sales",
    "allowedCustomerTypes": []
  },
  "mustChangePassword": false
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Current password is incorrect"
}
```

---

### POST `/api/sales/change-password`
Change existing password (requires authentication).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "oldPassword": "current_password",
  "newPassword": "new_password"
}
```

**Response Body:**
```json
{
  "success": true,
  "token": "new_jwt_token_here",
  "user": {
    "name": "John Doe",
    "location": "Mumbai",
    "contactNumber": "9876543210",
    "email": "user@example.com"
  },
  "mustChangePassword": false
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Old password is incorrect"
}
```

---

### GET `/api/sales/profile`
Get current user profile (requires authentication).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:** None

**Response Body:**
```json
{
  "success": true,
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "location": "Mumbai",
    "contactNumber": "9876543210",
    "email": "user@example.com",
    "role": "sales",
    "allowedCustomerTypes": []
  },
  "mustChangePassword": false
}
```

---

### POST `/api/sales/reset-password`
Reset password to default (temporary endpoint - requires secret key).

**Request Body:**
```json
{
  "email": "user@example.com",
  "secretKey": "reset123"
}
```

**Response Body:**
```json
{
  "success": true,
  "message": "Password reset to Orion@123 successfully"
}
```

---

### GET `/api/sales/test-routes`
Test endpoint to verify routes are working.

**Request Body:** None

**Response Body:**
```json
{
  "success": true,
  "message": "Routes are working - UPDATED CODE VERSION",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "v2.1.0"
}
```

---

### GET `/api/sales/test-db`
Test database connection and operations.

**Request Body:** None

**Response Body:**
```json
{
  "success": true,
  "message": "Database test successful",
  "connectionState": 1,
  "database": "configurator_db",
  "host": "localhost",
  "port": 27017,
  "totalQuotations": 100,
  "testQuotationId": "DB-TEST-1234567890",
  "verificationPassed": true
}
```

---

### POST `/api/sales/test-quotation`
Test quotation creation endpoint.

**Request Body:**
```json
{
  "quotationId": "TEST-001",
  "customerName": "Test Customer",
  "customerEmail": "test@example.com",
  "customerPhone": "9876543210",
  "productName": "Test Product",
  "productDetails": {},
  "message": "Test message",
  "userType": "endUser",
  "userTypeDisplayName": "End User",
  "totalPrice": 100000
}
```

**Response Body:**
```json
{
  "success": true,
  "message": "Simple test quotation saved successfully",
  "quotationId": "TEST-001",
  "totalPrice": 100000
}
```

---

### POST `/api/sales/quotation`
Save quotation to database (requires authentication).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "quotationId": "ORION/2024/01/01/JOHN/001",
  "customerName": "Customer Name",
  "customerEmail": "customer@example.com",
  "customerPhone": "9876543210",
  "productName": "Product Name",
  "productDetails": {
    "productId": "bellatrix-indoor-cob-p1.5",
    "dimensions": {
      "width": 10,
      "height": 5
    }
  },
  "message": "Optional message",
  "userType": "endUser",
  "userTypeDisplayName": "End User",
  "totalPrice": 150000,
  "exactPricingBreakdown": {},
  "exactProductSpecs": {},
  "createdAt": "2024-01-01T00:00:00.000Z",
  "salesUserId": "507f1f77bcf86cd799439011",
  "salesUserName": "John Doe"
}
```

**Note:** `salesUserId` and `salesUserName` are optional. If provided, the quotation will be assigned to that user (super admin only). If not provided, the quotation is assigned to the logged-in user.

**Response Body:**
```json
{
  "success": true,
  "message": "Quotation saved successfully",
  "quotationId": "ORION/2024/01/01/JOHN/001",
  "quotationData": {
    "id": "507f1f77bcf86cd799439012",
    "customerName": "Customer Name",
    "productName": "Product Name",
    "totalPrice": 150000,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (400):**
```json
{
  "success": false,
  "message": "Missing required fields: quotationId, customerName, customerEmail, productName"
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Access denied. Sales, Partner, Super Admin, or Admin role required to create quotations."
}
```

---

### GET `/api/sales/dashboard`
Get admin dashboard with all sales users and quotation statistics (requires super admin authentication).

**Headers:**
- `Authorization: Bearer <token>`

**Query Parameters:**
- `startDate` (string, optional): Start date filter (ISO format)
- `endDate` (string, optional): End date filter (ISO format)
- `location` (string, optional): Location filter

**Request Body:** None

**Response Body:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "location": "Mumbai",
      "contactNumber": "9876543210",
      "quotationCount": 25,
      "revenue": 2500000,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "role": "sales"
    }
  ],
  "stats": {
    "totalSalesPersons": 10,
    "totalQuotations": 150,
    "activeUsers": 8,
    "topPerformers": [
      {
        "_id": "507f1f77bcf86cd799439011",
        "name": "John Doe",
        "quotationCount": 25
      }
    ],
    "totalRevenue": 15000000,
    "averageQuotationsPerUser": 19,
    "quotationsByMonth": [
      {
        "_id": {
          "year": 2024,
          "month": 1
        },
        "count": 50,
        "revenue": 5000000
      }
    ]
  },
  "filters": {
    "startDate": "2024-01-01",
    "endDate": "2024-01-31",
    "location": "Mumbai"
  }
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Access denied. Super Admin role required."
}
```

---

### GET `/api/sales/my-dashboard`
Get current sales user's own dashboard data (requires sales user authentication).

**Headers:**
- `Authorization: Bearer <token>`

**Request Body:** None

**Response Body:**
```json
{
  "success": true,
  "salesPerson": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "location": "Mumbai",
    "contactNumber": "9876543210",
    "role": "sales"
  },
  "customers": [
    {
      "customerName": "Customer Name",
      "customerEmail": "customer@example.com",
      "customerPhone": "9876543210",
      "userType": "endUser",
      "userTypeDisplayName": "End User",
      "quotations": [
        {
          "quotationId": "ORION/2024/01/01/JOHN/001",
          "productName": "Product Name",
          "productDetails": {},
          "totalPrice": 150000,
          "message": "Message",
          "userType": "endUser",
          "userTypeDisplayName": "End User",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ],
  "totalQuotations": 25,
  "totalCustomers": 10,
  "totalRevenue": 2500000
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Access denied. Sales role required."
}
```

---

### GET `/api/sales/salesperson/:id`
Get sales person details with their quotations (requires super admin authentication).

**Headers:**
- `Authorization: Bearer <token>`

**URL Parameters:**
- `id` (string): Sales person MongoDB ObjectId

**Request Body:** None

**Response Body:**
```json
{
  "success": true,
  "salesPerson": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "email": "john@example.com",
    "location": "Mumbai",
    "contactNumber": "9876543210",
    "role": "sales",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "customers": [
    {
      "customerName": "Customer Name",
      "customerEmail": "customer@example.com",
      "customerPhone": "9876543210",
      "userType": "endUser",
      "userTypeDisplayName": "End User",
      "quotations": [
        {
          "quotationId": "ORION/2024/01/01/JOHN/001",
          "productName": "Product Name",
          "productDetails": {},
          "totalPrice": 150000,
          "message": "Message",
          "userType": "endUser",
          "userTypeDisplayName": "End User",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
      ]
    }
  ],
  "totalQuotations": 25,
  "totalCustomers": 10
}
```

**Error Response (403):**
```json
{
  "success": false,
  "message": "Access denied. Super Admin role required."
}
```

**Error Response (404):**
```json
{
  "success": false,
  "message": "Sales person not found"
}
```

---

### POST `/api/sales/generate-quotation-id`
Generate globally unique quotation ID with atomic serial number generation.

**Request Body:**
```json
{
  "firstName": "JOHN",
  "year": "2024",
  "month": "01",
  "day": "01"
}
```

**Response Body:**
```json
{
  "success": true,
  "quotationId": "ORION/2024/01/01/JOHN/001",
  "serial": "001",
  "isGloballyUnique": true,
  "message": "Globally unique quotation ID generated successfully"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Missing required fields: firstName, year, month, day"
}
```

---

### POST `/api/sales/check-latest-quotation-id`
Check latest quotation ID for a specific user and date (legacy endpoint).

**Request Body:**
```json
{
  "firstName": "JOHN",
  "year": "2024",
  "month": "01",
  "day": "01"
}
```

**Response Body:**
```json
{
  "success": true,
  "latestSerial": 5,
  "pattern": "/^ORION\\/2024\\/01\\/01\\/JOHN\\/\\d{3}$/",
  "foundQuotation": "ORION/2024/01/01/JOHN/005"
}
```

---

## Data Models

### Quotation Model
```typescript
{
  quotationId: string;              // Unique quotation ID (e.g., "ORION/2024/01/01/JOHN/001")
  salesUserId: ObjectId;            // Reference to SalesUser
  salesUserName: string;            // Name of sales user
  customerName: string;             // Customer name
  customerEmail: string;            // Customer email
  customerPhone: string;            // Customer phone
  productName: string;              // Product name
  productDetails: Object;           // Product details (mixed type)
  message: string;                  // Optional message
  userType: "endUser" | "siChannel" | "reseller";  // User type
  userTypeDisplayName: string;      // Display name for user type
  totalPrice: number;               // Total price (includes 18% GST)
  pdfPage6HTML?: string;            // Optional PDF HTML
  exactPricingBreakdown?: Object;   // Exact pricing breakdown
  exactProductSpecs?: Object;       // Exact product specs
  quotationData?: Object;           // Complete quotation data
  createdAt: Date;                  // Creation timestamp
  updatedAt: Date;                  // Last update timestamp
}
```

### SalesUser Model
```typescript
{
  _id: ObjectId;                    // User ID
  email: string;                    // Unique email (lowercase)
  name: string;                     // User name
  location: string;                 // Location
  contactNumber: string;            // Contact number
  passwordHash: string;             // Hashed password (not returned in responses)
  mustChangePassword: boolean;      // Whether password must be changed
  passwordSetAt?: Date;             // When password was set
  role: "sales" | "super" | "super_admin" | "partner";  // User role
  allowedCustomerTypes?: string[];  // Customer types partner can see (partner only)
  createdAt: Date;                  // Creation timestamp
  updatedAt: Date;                  // Last update timestamp
}
```

---

## Authentication

Most endpoints require authentication via JWT token. Include the token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

Token expires in 30 days.

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "message": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors, missing fields)
- `401`: Unauthorized (invalid token, invalid credentials)
- `403`: Forbidden (insufficient permissions)
- `404`: Not Found (resource not found)
- `500`: Internal Server Error
