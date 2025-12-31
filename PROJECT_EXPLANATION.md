# LED Display Configurator - Complete Project Documentation

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Key Features & Capabilities](#key-features--capabilities)
3. [Architecture & Tech Stack](#architecture--tech-stack)
4. [User Roles & Authentication](#user-roles--authentication)
5. [Pricing System](#pricing-system)
6. [Product Catalog](#product-catalog)
7. [Document Generation](#document-generation)
8. [Database Structure](#database-structure)
9. [Implementation Details](#implementation-details)
10. [Deployment](#deployment)

---

## 🎯 Project Overview

**LED Display Configurator** is a comprehensive web application that enables sales teams and partners to configure, price, and generate professional quotations for LED display products. The system handles complex calculations for display dimensions, cabinet layouts, controller selection, wiring diagrams, and multi-tier pricing based on customer types.

### Core Purpose
- **Sales Enablement**: Empower sales teams to create accurate, professional quotations on-the-fly
- **Product Configuration**: Interactive tool to configure LED displays with real-time calculations
- **Multi-format Export**: Generate PDF, DOCX, and HTML quotations
- **Role-based Access**: Different interfaces for sales, partners, and administrators
- **Analytics Dashboard**: Track sales performance, quotations, and revenue

---

## ✨ Key Features & Capabilities

### 1. **Interactive Display Configurator**
- **Dimension Input**: Support for multiple units (mm, cm, m, ft)
- **Real-time Calculations**: 
  - Cabinet grid layout (columns × rows)
  - Total display dimensions
  - Pixel count and density
  - Power consumption
  - Weight calculations
- **Aspect Ratio Presets**: Common ratios (16:9, 4:3, 21:9, etc.)
- **Product Recommendations**: Based on viewing distance and environment
- **Visual Preview**: Real-time 3D-style preview of configured display

### 2. **Product Selection & Management**
- **7 Product Series**:
  - **Bellatrix Series**: Indoor COB displays (P1.25, P1.5, P2.5, P3, P4)
  - **Rigel Series**: Outdoor displays (P1.25, P1.5, P1.8, P2.5, P3)
  - **Betelgeuse Series**: Indoor SMD displays (P1.25, P1.5, P2.5, P3, P4) - *P1.25 & P1.5 disabled*
  - **Flexible Series**: Flexible indoor displays (P1.5, P1.8, P2.5, P3, P4)
  - **Rental Series**: Rental displays with cabinet/curve lock options
  - **Jumbo Series**: Large format displays with integrated controllers
  - **Transparent Series**: Transparent LED displays
  - **Standee Series**: Digital standee displays
- **Product Filtering**: By category, environment (Indoor/Outdoor), pixel pitch
- **Product Details**: Complete specifications, images, PDF datasheets

### 3. **Controller Selection & Wiring**
- **Automatic Controller Selection**: Based on total pixel count
  - TB2 (up to 0.65M pixels)
  - TB40 (up to 1.3M pixels)
  - TB60 (up to 2.3M pixels)
  - VX1, VX400, VX400 Pro (up to 2.6M pixels)
  - VX600, VX600 Pro (up to 3.9M pixels)
  - VX1000, VX1000 Pro (up to 6.5M pixels)
  - 4K PRIME (up to 13M pixels)
- **Redundancy Mode**: Optional backup controller configuration
- **Data Wiring Diagrams**: Visual representation of data signal routing
- **Power Wiring Diagrams**: Power distribution and consumption calculations

### 4. **Multi-Tier Pricing System**
- **Three Customer Types**:
  - **End User**: Full retail pricing
  - **Reseller**: 25% discount (75% of retail)
  - **SI/Channel Partner**: 35% discount (65% of retail)
- **Product-specific Pricing**: Each product has separate prices for each tier
- **Rental Products**: Special pricing structure with cabinet and curve lock options
- **Custom Pricing Override**: Manual adjustment of structure and installation costs
- **GST Calculation**: 18% GST on all components
- **Discount Support**: Optional discount percentage on product total

### 5. **Document Generation**
- **PDF Export**: 
  - Multi-page professional quotations
  - Company branding and logos
  - Complete product specifications
  - Pricing breakdown with GST
  - Wiring diagrams
  - Technical specifications
- **DOCX Export**: 
  - Word-compatible format
  - Pixel-perfect rendering (HTML-to-image conversion)
  - Editable format for further customization
- **HTML Preview**: 
  - Real-time preview before export
  - Responsive layout
  - Print-ready styling

### 6. **User Management & Authentication**
- **JWT-based Authentication**: Secure token-based login
- **Password Management**: 
  - First-time password setup
  - Password change functionality
  - Bcrypt hashing (12 rounds)
- **Session Management**: Persistent login with localStorage
- **Role-based Routing**: Automatic redirection based on user role

### 7. **Super User Dashboard**
- **Sales Analytics**:
  - Total sales persons count
  - Total quotations generated
  - Total revenue
  - Active users
  - Average quotations per user
- **Sales Person Details**:
  - Individual quotation count
  - Revenue per sales person
  - Location-based filtering
  - Search functionality
- **Monthly Trends**: Quotations and revenue by month
- **Top Performers**: Sales persons ranked by quotations/revenue
- **Auto-refresh**: 30-minute automatic refresh interval
- **Manual Refresh**: On-demand data refresh button

### 8. **Quotation Management**
- **Unique Quotation IDs**: Auto-generated sequential IDs
- **Quotation Storage**: Complete quotation data saved to database
- **Sales Attribution**: Each quotation linked to sales person/partner
- **Customer Information**: Name, email, phone, customer type
- **Pricing Breakdown**: Detailed cost breakdown stored for reference
- **Product Specifications**: Complete product details saved with quotation

### 9. **Partner System**
- **Partner Role**: Special role for channel partners
- **Customer Type Restrictions**: Partners can be restricted to specific customer types
- **Partner Login**: Separate login flow for partners
- **Quotation Attribution**: Partner quotations tracked separately

---

## 🏗️ Architecture & Tech Stack

### Frontend
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 5.4.2
- **Styling**: Tailwind CSS 3.4.1
- **State Management**: React Context API (`DisplayConfigContext`)
- **UI Components**: Custom components with Lucide React icons
- **PDF Generation**: 
  - `jspdf` 3.0.2
  - `html2canvas` 1.4.1
  - `react-pdf` 7.7.3 (for PDF preview)
- **DOCX Generation**: 
  - `docx` 9.5.1
  - `html2canvas` (for image conversion)
- **Form Handling**: React hooks (`useState`, `useEffect`, `useMemo`)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs (12 rounds)
- **CORS**: Enabled for frontend communication
- **Compression**: gzip compression middleware

### Key Libraries
- **PDF Processing**: `pdfjs-dist` 3.11.174
- **Image Processing**: `html-to-image` 1.11.13
- **Document Generation**: `docxtemplater` 3.67.4
- **Email**: `@react-email/components` 0.1.0, `resend` 4.6.0
- **Flow Diagrams**: `@xyflow/react` 12.7.1

---

## 👥 User Roles & Authentication

### User Roles

#### 1. **Normal User** (Public)
- **Access**: Landing page, product selection, configuration wizard
- **Capabilities**: 
  - Browse products
  - Configure displays
  - Generate quotations (without saving)
  - Export PDF/DOCX
- **Limitations**: Cannot save quotations, no dashboard access

#### 2. **Sales User** (`role: 'sales'`)
- **Access**: Direct access to configurator (skips landing page)
- **Capabilities**:
  - Full configurator access
  - Save quotations to database
  - View own quotations
  - Generate all document formats
- **Dashboard**: No access to Super User Dashboard

#### 3. **Partner User** (`role: 'partner'`)
- **Access**: Direct access to configurator
- **Capabilities**:
  - Same as sales user
  - Can be restricted to specific customer types (`allowedCustomerTypes`)
  - Quotations attributed to partner
- **Dashboard**: No access to Super User Dashboard

#### 4. **Super Admin** (`role: 'super'` or `'super_admin'`)
- **Access**: Super User Dashboard + Configurator
- **Capabilities**:
  - All sales user capabilities
  - View Super User Dashboard
  - See all sales persons and quotations
  - Analytics and reporting
  - Filter and search quotations
- **Dashboard**: Full access to analytics

### Authentication Flow

1. **Login Process**:
   ```
   User enters email/password
   → Backend validates credentials
   → Returns JWT token + user object
   → Frontend stores token in localStorage
   → User redirected based on role
   ```

2. **Token Validation**:
   - Token stored in `localStorage` as `salesToken`
   - User object stored in `localStorage` as `salesUser`
   - On app load, token validated via `/api/sales/profile`
   - Invalid tokens trigger logout

3. **Session Persistence**:
   - Login state persists across page refreshes
   - User object verified for required fields (`_id`, `email`, `role`)
   - Missing fields trigger cache clear and re-login

4. **Password Management**:
   - First-time users: `mustChangePassword: true`
   - Password set via `/api/sales/set-password`
   - Password change via `/api/sales/change-password`
   - Passwords hashed with bcrypt (12 rounds)

---

## 💰 Pricing System

### Pricing Architecture

The pricing system uses a **centralized calculation function** (`calculateCentralizedPricing`) to ensure consistency across:
- Frontend display
- PDF generation
- Database storage
- Dashboard display

### Price Sources

#### Regular Products
Each product has three price fields:
- `price`: End User price (full retail)
- `resellerPrice`: Reseller price (typically 75% of retail)
- `siChannelPrice`: SI/Channel price (typically 65% of retail)

#### Rental Products
Special pricing structure:
```typescript
prices: {
  cabinet: {
    endCustomer: number,
    siChannel: number,
    reseller: number
  },
  curveLock: {
    endCustomer: number,
    siChannel: number,
    reseller: number
  }
}
```

### Price Calculation Flow

1. **User Type Selection**: Customer selects type (End User, Reseller, SI/Channel Partner)
2. **Product Price Lookup**: System selects appropriate price field based on user type
3. **Quantity Calculation**: Based on cabinet grid and display dimensions
4. **Subtotal**: `unitPrice × quantity`
5. **Processor Price**: Added if controller selected (Jumbo Series includes controller)
6. **Structure Cost**: 
   - Indoor: ₹4,000 per cabinet
   - Outdoor: ₹2,500 per sq.ft
7. **Installation Cost**: 
   - Default: ₹500 per sq.ft
   - Can be custom (fixed or per sq.ft)
8. **GST Calculation**: 18% on all components
9. **Discount** (optional): Percentage discount on product total
10. **Grand Total**: Sum of all components with GST

### Price Normalization

**Critical Fix**: UI uses `"SI/Channel Partner"` label, but legacy pricing helpers expect `"Channel"`. A normalization layer maps:
- `"SI/Channel Partner"` → `"Channel"`
- `"Reseller"` → `"Reseller"`
- `"End User"` → `"End User"`

This mapping occurs at the boundary of legacy pricing functions to ensure correct price selection.

### "NA" Price Handling

Products without pricing show `"NA"` (Not Available):
- System checks for `"NA"` or `"N/A"` strings
- Returns `null` for unavailable prices
- UI displays "Price not available" message
- Calculations skip products with NA prices

---

## 📦 Product Catalog

### Product Data Structure

Products defined in `src/data/products.ts` with:
- **Basic Info**: ID, name, category, image
- **Dimensions**: Cabinet, module, resolution
- **Specifications**: Pixel pitch, brightness, refresh rate, power consumption
- **Pricing**: End User, Reseller, SI/Channel prices
- **Environment**: Indoor/Outdoor
- **Technical Details**: 50+ specification fields
- **Enabled Flag**: `enabled: true/false` for product visibility

### Product Categories

1. **Bellatrix Series** (Indoor COB)
   - P1.25, P1.5, P2.5, P3, P4
   - High brightness, indoor use

2. **Rigel Series** (Outdoor)
   - P1.25, P1.5, P1.8, P2.5, P3
   - Weatherproof, high brightness

3. **Betelgeuse Series** (Indoor SMD)
   - P1.25 (disabled), P1.5 (disabled), P2.5, P3, P4
   - Standard indoor displays

4. **Flexible Series** (Indoor Flexible)
   - P1.5, P1.8, P2.5, P3, P4
   - Curved/bendable displays

5. **Rental Series** (Rental)
   - Cabinet and curve lock options
   - Special pricing structure

6. **Jumbo Series** (Large Format)
   - Integrated controllers
   - Simplified pricing

7. **Transparent Series** (Transparent)
   - High transparency
   - Front/rear glass options

8. **Standee Series** (Digital Standee)
   - Fixed dimensions
   - Standee-specific configurations

### Product Filtering

- **By Category**: Filter by product series
- **By Environment**: Indoor/Outdoor
- **By Pixel Pitch**: Range selection
- **By Availability**: Only enabled products shown

---

## 📄 Document Generation

### PDF Generation

**Technology**: `jspdf` + `html2canvas`

**Process**:
1. Generate HTML content using `generateConfigurationHtml`
2. Convert HTML pages to images using `html2canvas`
3. Embed images in PDF with A4 dimensions (210mm × 297mm)
4. Add page breaks between sections
5. Generate blob and trigger download

**Content**:
- **Page 1**: Cover page with company logo, quotation ID, date
- **Page 2**: Customer information, sales person details
- **Page 3**: Product specifications, dimensions, cabinet layout
- **Page 4**: Technical specifications (brightness, power, etc.)
- **Page 5**: Pricing breakdown (unit price, quantity, GST, total)
- **Page 6**: Wiring diagrams (data and power)
- **Page 7+**: Additional pages for large configurations

### DOCX Generation

**Technology**: `docx` library + `html2canvas`

**Process**:
1. Generate HTML content (same as PDF)
2. Convert each HTML page to high-quality image
3. Embed images in DOCX with exact A4 dimensions
4. Preserve page breaks and layout
5. Generate blob and trigger download

**Advantages**:
- Pixel-perfect rendering
- Editable in Microsoft Word
- Maintains visual fidelity

### HTML Preview

**Technology**: React component rendering

**Features**:
- Real-time preview before export
- Responsive layout
- Print-ready CSS
- All quotation content visible
- Interactive before conversion

### Document Content Structure

1. **Header**: Company logo, quotation ID, date
2. **Customer Info**: Name, email, phone, customer type
3. **Sales Info**: Sales person name, email, phone, location
4. **Product Details**:
   - Product name and category
   - Display dimensions (width × height)
   - Cabinet grid (columns × rows)
   - Total cabinets
   - Pixel pitch and density
   - Resolution
5. **Technical Specs**:
   - Brightness, refresh rate
   - Power consumption (max/avg)
   - Weight, environment
   - Operating conditions
6. **Pricing Breakdown**:
   - Unit price
   - Quantity
   - Subtotal
   - Processor price (if applicable)
   - Structure cost
   - Installation cost
   - GST (18%)
   - Discount (if applicable)
   - Grand total
7. **Wiring Diagrams**:
   - Data wiring (controller to cabinets)
   - Power wiring (power distribution)

---

## 🗄️ Database Structure

### MongoDB Collections

#### 1. **SalesUser Collection**

```javascript
{
  _id: ObjectId,
  email: String (unique, lowercase),
  name: String,
  location: String,
  contactNumber: String,
  passwordHash: String (bcrypt hashed),
  mustChangePassword: Boolean (default: true),
  passwordSetAt: Date,
  role: String (enum: ['sales', 'super', 'super_admin', 'partner']),
  allowedCustomerTypes: [String] (for partners: ['endUser', 'reseller', 'siChannel']),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `email` (unique index)

#### 2. **Quotation Collection**

```javascript
{
  _id: ObjectId,
  quotationId: String (unique, indexed),
  salesUserId: ObjectId (ref: 'SalesUser'),
  salesUserName: String,
  customerName: String,
  customerEmail: String,
  customerPhone: String,
  productName: String,
  productDetails: Mixed (complete product object),
  message: String,
  userType: String (enum: ['endUser', 'siChannel', 'reseller']),
  userTypeDisplayName: String,
  totalPrice: Number,
  pdfPage6HTML: String (wiring diagram HTML),
  exactPricingBreakdown: Mixed (detailed pricing),
  exactProductSpecs: Mixed (product specifications),
  quotationData: Mixed (complete quotation data),
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes**:
- `quotationId` (unique index)
- `salesUserId` + `createdAt` (compound index)
- `createdAt` (descending index)

### Database Operations

#### Quotation Creation
- Auto-generate unique quotation ID
- Link to sales user via `salesUserId`
- Store complete product and pricing data
- Timestamp creation

#### Quotation Retrieval
- Fetch by sales user ID
- Filter by date range
- Aggregate for dashboard statistics
- Group by month for trends

---

## 🔧 Implementation Details

### Frontend Architecture

#### Component Hierarchy
```
App.tsx
├── LandingPage (public)
├── ConfigurationWizard (guided flow)
├── DisplayConfigurator (main configurator)
│   ├── ProductSelector
│   ├── DimensionControls
│   ├── DisplayPreview
│   ├── ConfigurationSummary
│   ├── DataWiringView
│   ├── PowerWiringView
│   ├── UserInfoForm
│   ├── QuoteModal
│   └── PdfViewModal
└── SuperUserDashboard (admin only)
    └── SalesPersonDetailsModal
```

#### State Management

**DisplayConfigContext**: Global state for display configuration
```typescript
{
  width: number,
  height: number,
  unit: string,
  viewingDistance: number | null,
  pixelPitch: number | null,
  environment: string | null,
  entryMode: 'guided' | 'direct',
  directProductMode: boolean,
  selectedProductName: string | null
}
```

**Local State**: Component-specific state using `useState`
- Product selection
- Controller selection
- User info form
- Modal visibility

#### Custom Hooks

1. **`useDisplayCalculations`**:
   - Cabinet grid calculation
   - Dimension conversions
   - Aspect ratio calculations
   - Display area calculations

2. **`useControllersSelection`**:
   - Controller selection logic
   - Redundancy mode
   - Port calculations

3. **`useDisplayConfig`**:
   - Access to global display config
   - Update functions

### Backend Architecture

#### API Routes

**`/api/sales`**:
- `POST /login`: User authentication
- `GET /profile`: Get current user
- `POST /set-password`: First-time password setup
- `POST /change-password`: Change existing password
- `POST /quotations`: Create quotation
- `GET /quotations`: Get quotations (filtered by user)
- `GET /sales-persons`: Get all sales persons (super admin only)
- `GET /dashboard-stats`: Get dashboard statistics (super admin only)

**`/api/products`**:
- `GET /`: Get all products
- `GET /:id`: Get product by ID

#### Middleware

1. **`authenticateToken`**: JWT validation
2. **`validateLogin`**: Login request validation
3. **`validateSetPassword`**: Password setup validation
4. **`validateChangePassword`**: Password change validation

#### Utilities

1. **`wordGenerator.js`**: Backend DOCX generation
2. **`wordGeneratorHtml.js`**: HTML-to-DOCX conversion
3. **`processorPrices.js`**: Controller pricing lookup
4. **`docxPageExtractor.js`**: DOCX page extraction utilities

### Pricing Calculation

**Centralized Function**: `calculateCentralizedPricing` in `src/utils/centralizedPricing.ts`

**Used By**:
- `QuoteModal.tsx` (database storage)
- `docxGenerator.ts` (PDF generation)
- `SuperUserDashboard.tsx` (display)

**Returns**:
```typescript
{
  unitPrice: number,
  quantity: number,
  subtotal: number,
  processorPrice: number,
  processorGst: number,
  structureCost: number,
  structureGst: number,
  installationCost: number,
  installationGst: number,
  productTotal: number,
  productGst: number,
  grandTotal: number,
  discount?: {
    discountedProductTotal: number,
    discountedProcessorTotal: number,
    discountedGrandTotal: number
  }
}
```

### Error Handling

1. **Frontend**:
   - Try-catch blocks around async operations
   - Error boundaries for React components
   - User-friendly error messages
   - Console logging for debugging

2. **Backend**:
   - Global error handler middleware
   - Validation errors returned as JSON
   - Database errors caught and logged
   - 404 handler for unknown routes

### Security

1. **Authentication**:
   - JWT tokens with expiration
   - Password hashing (bcrypt, 12 rounds)
   - Token validation on protected routes

2. **Data Validation**:
   - Input validation middleware
   - MongoDB ObjectId validation
   - Type checking in TypeScript

3. **CORS**:
   - Whitelisted frontend URLs
   - Credentials enabled for cookies

---

## 🚀 Deployment

### Frontend Deployment

**Platform**: Netlify (or similar static hosting)

**Build Process**:
```bash
npm run build
# Output: dist/ directory
```

**Environment Variables**:
- `VITE_API_URL`: Backend API URL

### Backend Deployment

**Platform**: Render (Free tier)

**Configuration**:
- Node.js environment
- MongoDB connection string
- Environment variables:
  - `MONGODB_URI`
  - `JWT_SECRET`
  - `FRONTEND_URL`
  - `RUN_PARTNER_SCRIPT` (optional, for partner seeding)

**Startup Script**:
- `npm start` (runs `node server.js`)
- Partner creation script runs automatically if `RUN_PARTNER_SCRIPT=true`

### Database

**MongoDB**: Cloud-hosted (MongoDB Atlas or similar)

**Connection**: Mongoose ODM with connection pooling

### Deployment Features

1. **Auto-deployment**: Git push triggers deployment
2. **Health Check**: `/health` endpoint for monitoring
3. **Logging**: Console logs for debugging
4. **Error Tracking**: Error logs in deployment platform

---

## 📊 Key Metrics & Statistics

### Dashboard Metrics

- **Total Sales Persons**: Count of all sales users
- **Total Quotations**: All quotations in database
- **Total Revenue**: Sum of all quotation `totalPrice` values
- **Active Users**: Users who have created quotations
- **Average Quotations Per User**: Total quotations / Total users
- **Monthly Trends**: Quotations and revenue grouped by month
- **Top Performers**: Sales persons ranked by quotation count/revenue

### Quotation Tracking

- **Unique Quotation IDs**: Sequential, auto-generated
- **Sales Attribution**: Each quotation linked to sales person
- **Customer Type Distribution**: End User vs Reseller vs SI/Channel
- **Product Popularity**: Most configured products
- **Revenue by Product**: Revenue breakdown by product category

---

## 🎨 User Interface

### Design Principles

1. **Responsive Design**: Works on desktop, tablet, mobile
2. **Modern UI**: Clean, professional interface
3. **Real-time Feedback**: Instant calculations and updates
4. **Intuitive Navigation**: Clear flow from product selection to quotation
5. **Visual Preview**: 3D-style display preview

### Key UI Components

1. **Product Selector**: Grid/list view of products with filters
2. **Dimension Controls**: Input fields with unit conversion
3. **Display Preview**: Visual representation of configured display
4. **Configuration Summary**: Overview of all settings
5. **Wiring Diagrams**: Interactive data and power wiring views
6. **Quote Modal**: Final quotation review before saving
7. **PDF Preview Modal**: PDF preview before download
8. **Dashboard**: Analytics and sales person management

---

## 🔄 Workflow Examples

### Sales User Workflow

1. **Login**: Sales user logs in with email/password
2. **Product Selection**: Browse and select LED display product
3. **Configuration**: 
   - Set dimensions (width × height)
   - View cabinet grid layout
   - Select controller (auto-selected or manual)
   - Review wiring diagrams
4. **Customer Info**: Enter customer details and customer type
5. **Pricing Review**: Review pricing breakdown
6. **Generate Quotation**: 
   - Save to database
   - Generate PDF/DOCX
   - Download documents
7. **Dashboard**: View own quotations (if implemented)

### Super Admin Workflow

1. **Login**: Super admin logs in
2. **Dashboard Access**: Redirected to Super User Dashboard
3. **Analytics Review**: 
   - View total quotations
   - Review revenue
   - Check top performers
   - Analyze monthly trends
4. **Sales Person Details**: Click on sales person to see individual quotations
5. **Configurator Access**: Can also use configurator like sales user

### Partner Workflow

1. **Login**: Partner logs in
2. **Product Selection**: Same as sales user
3. **Configuration**: Same as sales user
4. **Customer Type Restriction**: May be limited to specific customer types
5. **Quotation Generation**: Same as sales user
6. **Attribution**: Quotations attributed to partner

---

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- MongoDB (local or cloud)
- npm or yarn

### Frontend Setup

```bash
cd /path/to/configurator-3
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### Backend Setup

```bash
cd /path/to/configurator-3/backend
npm install
# Create .env file with:
# MONGODB_URI=your_mongodb_connection_string
# JWT_SECRET=your_jwt_secret
# FRONTEND_URL=http://localhost:5173
npm start
# Backend runs on http://localhost:3001
```

### Database Setup

1. Create MongoDB database
2. Run seed script (if available) to create initial users
3. Partner creation script runs automatically if `RUN_PARTNER_SCRIPT=true`

---

## 📝 Future Enhancements (Potential)

1. **Email Integration**: Send quotations via email
2. **Quotation History**: View and re-download past quotations
3. **Product Comparison**: Compare multiple products side-by-side
4. **Advanced Analytics**: More detailed reporting and charts
5. **Multi-language Support**: Support for multiple languages
6. **Mobile App**: Native mobile application
7. **API for Third-party**: REST API for external integrations
8. **Bulk Quotation**: Generate multiple quotations at once
9. **Template System**: Save and reuse quotation templates
10. **Approval Workflow**: Quotation approval process

---

## 🎓 Summary

The **LED Display Configurator** is a comprehensive, production-ready application that:

✅ **Enables Sales Teams**: Quick, accurate quotation generation  
✅ **Supports Multiple Roles**: Sales, partners, and administrators  
✅ **Handles Complex Calculations**: Dimensions, pricing, wiring, controllers  
✅ **Generates Professional Documents**: PDF, DOCX, HTML formats  
✅ **Tracks Performance**: Analytics dashboard for management  
✅ **Scales Efficiently**: MongoDB database, modular architecture  
✅ **Deploys Easily**: Frontend and backend on modern platforms  

The system is built with modern web technologies, follows best practices, and provides a solid foundation for future enhancements.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Project Status**: Production Ready



