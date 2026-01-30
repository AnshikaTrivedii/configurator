import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

// Lazy initialization variables
let s3Client = null;
let BUCKET_NAME = null;
let region = null;

/**
 * Initialize (or get existing) S3 Client and configuration
 * @returns {Object} object containing s3Client and BUCKET_NAME
 */
const getS3Context = () => {
  // If already initialized, return existing context
  if (s3Client && BUCKET_NAME) {
    return { s3Client, BUCKET_NAME };
  }

  // Get S3 configuration
  region = process.env.ORION_S3_REGION || process.env.S3_REGION || 'us-east-1';
  const accessKeyId = process.env.ORION_S3_ACCESS_KEY || process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.ORION_S3_SECRET_KEY || process.env.S3_SECRET_KEY;
  BUCKET_NAME = process.env.ORION_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;

  // Log only once during initialization

  if (!accessKeyId || !secretAccessKey) {
    console.warn('⚠️ AWS Credentials missing. S3 operations will fail.');
  }

  s3Client = new S3Client({
    region: region,
    credentials: accessKeyId && secretAccessKey ? {
      accessKeyId: accessKeyId,
      secretAccessKey: secretAccessKey
    } : undefined
  });

  return { s3Client, BUCKET_NAME };
};

const PDF_FOLDER = 'quotations/pdfs'; // Folder structure in S3

// Path structure options:
// Option 1: By user only (simplest)
//   quotations/pdfs/{salesUserId}/{quotationId}.pdf
// Option 2: By user and date (organized by date)
//   quotations/pdfs/{salesUserId}/{year}/{month}/{quotationId}.pdf
// Option 3: Flat structure (all in one folder per user)
//   quotations/pdfs/{salesUserId}/{quotationId}.pdf (current)

/**
 * Sanitize quotation ID for use in S3 path (replace slashes with dashes)
 * @param {string} quotationId - Quotation ID that may contain slashes
 * @returns {string} Sanitized quotation ID safe for S3 paths
 */
const sanitizeQuotationId = (quotationId) => {
  if (!quotationId) {
    throw new Error('Quotation ID is required for S3 upload');
  }

  // Replace slashes with dashes (main issue)
  // Keep alphanumeric, dashes, underscores, and dots
  // Only replace slashes and other problematic characters
  let sanitized = quotationId.replace(/\//g, '-');

  // Remove or replace any remaining problematic characters but keep the structure
  // Don't be too aggressive - just handle slashes and spaces
  sanitized = sanitized.replace(/\s+/g, '-'); // Replace spaces with dashes

  // Remove any double dashes that might have been created
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing dashes
  sanitized = sanitized.replace(/^-+|-+$/g, '');

  return sanitized;
};

/**
 * Upload PDF to S3
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @param {string} quotationId - Unique quotation ID
 * @param {string} salesUserId - Sales user ID for folder organization
 * @returns {Promise<string>} S3 object key
 */
export const uploadPdfToS3 = async (pdfBuffer, quotationId, salesUserId) => {
  // Initialize context on first use
  const { s3Client, BUCKET_NAME } = getS3Context();

  if (!BUCKET_NAME) {
    const error = 'ORION_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set';
    console.error('❌', error);
    throw new Error(error);
  }

  if (!quotationId) {
    const error = 'Quotation ID is required for S3 upload';
    console.error('❌', error);
    throw new Error(error);
  }

  if (!salesUserId) {
    const error = 'Sales User ID is required for S3 upload';
    console.error('❌', error);
    throw new Error(error);
  }

  if (!pdfBuffer || pdfBuffer.length === 0) {
    const error = 'PDF buffer is empty or invalid';
    console.error('❌', error);
    throw new Error(error);
  }

  // Sanitize quotation ID to avoid deep folder structures
  const sanitizedQuotationId = sanitizeQuotationId(quotationId);

  // Create S3 key: quotations/pdfs/{salesUserId}/{sanitizedQuotationId}.pdf
  // This keeps it simple: quotations/pdfs/{userId}/{quotationId}.pdf
  const s3Key = `${PDF_FOLDER}/${salesUserId}/${sanitizedQuotationId}.pdf`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: pdfBuffer,
    ContentType: 'application/pdf',
    // Add metadata
    Metadata: {
      quotationId: quotationId,
      salesUserId: salesUserId.toString(),
      uploadedAt: new Date().toISOString()
    }
  });

  try {

    await s3Client.send(command);

    return s3Key;
  } catch (error) {
    console.error('❌ Error uploading PDF to S3:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.Code || error.code,
      requestId: error.$metadata?.requestId,
      httpStatusCode: error.$metadata?.httpStatusCode,
      bucket: BUCKET_NAME,
      s3Key: s3Key
    });
    throw new Error(`Failed to upload PDF to S3: ${error.message}`);
  }
};

/**
 * Get presigned URL for PDF (temporary access URL)
 * @param {string} s3Key - S3 object key
 * @param {number} expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>} Presigned URL
 */
export const getPdfPresignedUrl = async (s3Key, expiresIn = 3600) => {
  const { s3Client, BUCKET_NAME } = getS3Context();

  if (!BUCKET_NAME) {
    throw new Error('ORION_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set');
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  try {
    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('❌ Error generating presigned URL:', error);
    throw new Error(`Failed to generate presigned URL: ${error.message}`);
  }
};

/**
 * Delete PDF from S3
 * @param {string} s3Key - S3 object key
 * @returns {Promise<void>}
 */
export const deletePdfFromS3 = async (s3Key) => {
  const { s3Client, BUCKET_NAME } = getS3Context();

  if (!BUCKET_NAME) {
    throw new Error('ORION_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  try {
    await s3Client.send(command);

  } catch (error) {
    console.error('❌ Error deleting PDF from S3:', error);
    throw new Error(`Failed to delete PDF from S3: ${error.message}`);
  }
};

/**
 * Get public URL for PDF (if bucket is public)
 * @param {string} s3Key - S3 object key
 * @returns {string} Public URL
 */
export const getPdfPublicUrl = (s3Key) => {
  const { BUCKET_NAME } = getS3Context();

  if (!BUCKET_NAME) {
    throw new Error('ORION_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set');
  }

  const region = process.env.ORION_S3_REGION || process.env.S3_REGION || 'us-east-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
};
