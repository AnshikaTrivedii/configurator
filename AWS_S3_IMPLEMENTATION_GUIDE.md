# AWS S3 Implementation Guide for PDF Storage

This guide explains how to implement AWS S3 storage for PDFs in the configurator application.

## Overview

The system now stores PDF files in AWS S3 instead of (or in addition to) storing HTML in the database. This provides:
- **Better Performance**: Direct PDF file access instead of regenerating from HTML
- **Scalability**: S3 handles large files efficiently
- **Cost Efficiency**: S3 is cheaper than storing large HTML strings in MongoDB
- **Reliability**: S3 provides 99.999999999% (11 9's) durability

## Architecture

```
Frontend (PDF Generation)
    ↓
PDF Blob → Base64 → Backend API
    ↓
Backend converts Base64 → Buffer → Upload to S3
    ↓
S3 stores PDF: quotations/pdfs/{salesUserId}/{quotationId}.pdf
    ↓
Database stores: pdfS3Key and pdfS3Url
    ↓
Dashboards fetch presigned URLs to display PDFs
```

## Setup Instructions

### 1. AWS S3 Setup

#### Create S3 Bucket
1. Go to AWS Console → S3
2. Create a new bucket (e.g., `orion-led-quotations`)
3. Choose region (e.g., `us-east-1`)
4. **Important**: Configure bucket permissions:
   - Block public access: **Enabled** (we use presigned URLs for security)
   - Versioning: Optional (recommended for production)

#### Create IAM User for S3 Access
1. Go to AWS Console → IAM → Users
2. Create new user: `s3-quotation-uploader`
3. Attach policy (or create custom policy):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject"
      ],
      "Resource": "arn:aws:s3:::orion-led-quotations/quotations/pdfs/*"
    }
  ]
}
```
4. Create Access Key for this user
5. Save Access Key ID and Secret Access Key

### 2. Environment Variables

Add these to your `.env` file in the backend:

```env
# AWS S3 Configuration (using ORION_ prefix to avoid Netlify conflicts)
ORION_S3_REGION=us-east-1
ORION_S3_ACCESS_KEY=your_access_key_id_here
ORION_S3_SECRET_KEY=your_secret_access_key_here
ORION_S3_BUCKET_NAME=orion-led-quotations
```

**Alternative names (also supported):**
- `S3_REGION` (instead of `ORION_S3_REGION`)
- `S3_ACCESS_KEY` (instead of `ORION_S3_ACCESS_KEY`)
- `S3_SECRET_KEY` (instead of `ORION_S3_SECRET_KEY`)
- `S3_BUCKET_NAME` (instead of `ORION_S3_BUCKET_NAME`)

**For Production (Railway/Netlify/etc.):**
- Add these as environment variables in your hosting platform
- Use `ORION_` prefix to avoid conflicts with Netlify's reserved AWS variable names
- Never commit `.env` files to git

### 3. Install Dependencies

```bash
cd backend
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 4. Database Migration

The Quotation model has been updated with new fields:
- `pdfS3Key`: S3 object key (path in bucket)
- `pdfS3Url`: Presigned URL (temporary, expires in 1 hour)

**Existing quotations** will have `null` for these fields. They will:
- Still work with HTML regeneration
- Can have PDFs uploaded later via the upload endpoint

## API Endpoints

### 1. Save Quotation (with PDF)
**POST** `/api/sales/quotation`

**Request Body:**
```json
{
  "quotationId": "QT-2024-001",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "1234567890",
  "productName": "Bellatrix Series",
  "totalPrice": 150000,
  "pdfBase64": "JVBERi0xLjQKJeLjz9MKMy...", // Base64 encoded PDF
  // ... other quotation fields
}
```

**Response:**
```json
{
  "success": true,
  "quotationId": "QT-2024-001",
  "pdfS3Key": "quotations/pdfs/507f1f77bcf86cd799439011/QT-2024-001.pdf",
  "pdfS3Url": "https://orion-led-quotations.s3.amazonaws.com/..."
}
```

### 2. Upload PDF for Existing Quotation
**POST** `/api/sales/quotation/:quotationId/upload-pdf`

**Request Body:**
```json
{
  "pdfBase64": "JVBERi0xLjQKJeLjz9MKMy..."
}
```

**Response:**
```json
{
  "success": true,
  "pdfS3Key": "quotations/pdfs/507f1f77bcf86cd799439011/QT-2024-001.pdf",
  "pdfS3Url": "https://orion-led-quotations.s3.amazonaws.com/..."
}
```

### 3. Get PDF URL (Presigned)
**GET** `/api/sales/quotation/:quotationId/pdf-url`

**Response:**
```json
{
  "success": true,
  "pdfS3Url": "https://orion-led-quotations.s3.amazonaws.com/...?X-Amz-Algorithm=...",
  "pdfS3Key": "quotations/pdfs/507f1f77bcf86cd799439011/QT-2024-001.pdf"
}
```

**Note:** Presigned URLs expire in 1 hour. Call this endpoint again to get a fresh URL.

## Frontend Implementation

### PDF Upload Flow

1. **Generate PDF** (client-side using html2canvas + jsPDF)
2. **Convert to Base64**:
```typescript
const pdfBase64 = await new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onloadend = () => {
    const base64String = (reader.result as string).split(',')[1];
    resolve(base64String);
  };
  reader.onerror = reject;
  reader.readAsDataURL(pdfBlob);
});
```

3. **Send to Backend**:
```typescript
const quotationData = {
  // ... quotation fields
  pdfBase64: pdfBase64
};

await salesAPI.saveQuotation(quotationData);
```

### Displaying PDFs from S3

**Sales Dashboard:**
```typescript
const handleViewPdf = async (quotation: Quotation) => {
  // Priority 1: Check S3
  if (quotation.pdfS3Key || quotation.pdfS3Url) {
    const pdfUrlResponse = await salesAPI.getQuotationPdfUrl(quotation.quotationId);
    window.open(pdfUrlResponse.pdfS3Url, '_blank');
    return;
  }
  
  // Priority 2: Fallback to HTML regeneration
  // ... existing HTML logic
};
```

## S3 Folder Structure

```
orion-led-quotations/
└── quotations/
    └── pdfs/
        ├── {salesUserId1}/
        │   ├── QT-2024-001.pdf
        │   ├── QT-2024-002.pdf
        │   └── ...
        ├── {salesUserId2}/
        │   ├── QT-2024-003.pdf
        │   └── ...
        └── ...
```

**Benefits:**
- Organized by sales user
- Easy to find and manage
- Can set up lifecycle policies per user if needed

## Security Considerations

### 1. Presigned URLs
- URLs expire after 1 hour
- Only accessible to authenticated users
- Backend validates user permissions before generating URL

### 2. Access Control
- S3 bucket is **private** (not publicly accessible)
- Only backend can upload/download
- Frontend gets temporary presigned URLs

### 3. IAM Permissions
- IAM user has minimal permissions (only PutObject, GetObject, DeleteObject)
- Scoped to specific bucket path
- No admin/delete bucket permissions

## Cost Estimation

**S3 Pricing (us-east-1):**
- Storage: $0.023 per GB/month
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests

**Example:**
- 1,000 quotations/month
- Average PDF size: 2 MB
- Monthly storage: 2 GB = $0.046
- PUT requests: 1,000 = $0.005
- GET requests: 5,000 (5 views per quotation) = $0.002
- **Total: ~$0.05/month**

## Migration Strategy

### For Existing Quotations

1. **Option A: Gradual Migration**
   - New quotations automatically upload to S3
   - Old quotations continue using HTML regeneration
   - Migrate old quotations on-demand when viewed

2. **Option B: Bulk Migration Script**
   ```javascript
   // backend/scripts/migratePdfsToS3.js
   // Regenerate PDFs from HTML and upload to S3
   ```

3. **Option C: Hybrid Approach**
   - Keep HTML for quick preview
   - Upload PDF to S3 for download/sharing
   - Best of both worlds

## Troubleshooting

### Common Issues

1. **"ORION_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set"**
   - Check `.env` file
   - Verify environment variables in production
   - Make sure you're using `ORION_S3_*` or `S3_*` prefix (not `AWS_*` which may conflict with Netlify)

2. **"Access Denied" errors**
   - Check IAM user permissions
   - Verify bucket name is correct
   - Ensure region matches

3. **"Presigned URL expired"**
   - URLs expire after 1 hour
   - Call `/pdf-url` endpoint again to get fresh URL

4. **Large PDF uploads fail**
   - Check request size limits (Express default: 100kb)
   - Consider using multipart upload for files > 5MB
   - Or use direct S3 upload from frontend (more complex)

### Debugging

Enable AWS SDK logging:
```javascript
// backend/utils/s3Service.js
import { S3Client } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.ORION_S3_REGION || process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ORION_S3_ACCESS_KEY || process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.ORION_S3_SECRET_KEY || process.env.S3_SECRET_KEY
  },
  logger: console // Enable logging
});
```

## Testing

### Local Testing
1. Set up AWS credentials in `.env`
2. Create test S3 bucket
3. Test upload/download endpoints
4. Verify PDFs are accessible

### Production Testing
1. Upload a test quotation
2. Verify PDF appears in S3 bucket
3. Test viewing PDF from dashboard
4. Check presigned URL expiration

## Next Steps

1. ✅ Install AWS SDK
2. ✅ Create S3 service utility
3. ✅ Update Quotation model
4. ✅ Add upload endpoints
5. ✅ Update frontend to send PDFs
6. ✅ Update dashboards to display from S3
7. ⏳ Set up AWS S3 bucket and IAM user
8. ⏳ Configure environment variables
9. ⏳ Test end-to-end flow
10. ⏳ Deploy to production

## Files Modified

### Backend
- `backend/package.json` - Added AWS SDK dependencies
- `backend/utils/s3Service.js` - New S3 utility service
- `backend/models/Quotation.js` - Added `pdfS3Key` and `pdfS3Url` fields
- `backend/routes/sales.js` - Added PDF upload endpoints

### Frontend
- `src/api/sales.ts` - Added PDF upload/get URL methods
- `src/components/PdfViewModal.tsx` - Updated to send PDF to backend
- `src/components/SalesDashboard.tsx` - Updated to display PDFs from S3
- `src/components/SalesPersonDetailsModal.tsx` - Updated interface for S3 fields

## Support

For issues or questions:
1. Check AWS CloudWatch logs
2. Check backend console logs
3. Verify S3 bucket permissions
4. Test with AWS CLI: `aws s3 ls s3://your-bucket-name/quotations/pdfs/`
