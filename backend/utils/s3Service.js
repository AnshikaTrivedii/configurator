import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.ORION_S3_REGION || process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.ORION_S3_ACCESS_KEY || process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.ORION_S3_SECRET_KEY || process.env.S3_SECRET_KEY
  }
});

const BUCKET_NAME = process.env.ORION_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME;
const PDF_FOLDER = 'quotations/pdfs'; // Folder structure in S3

/**
 * Upload PDF to S3
 * @param {Buffer} pdfBuffer - PDF file as buffer
 * @param {string} quotationId - Unique quotation ID
 * @param {string} salesUserId - Sales user ID for folder organization
 * @returns {Promise<string>} S3 object key
 */
export const uploadPdfToS3 = async (pdfBuffer, quotationId, salesUserId) => {
  if (!BUCKET_NAME) {
    throw new Error('ORION_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set');
  }

  // Create S3 key: quotations/pdfs/{salesUserId}/{quotationId}.pdf
  const s3Key = `${PDF_FOLDER}/${salesUserId}/${quotationId}.pdf`;

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
    console.log(`✅ PDF uploaded to S3: ${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error('❌ Error uploading PDF to S3:', error);
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
  if (!BUCKET_NAME) {
    throw new Error('ORION_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set');
  }

  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key
  });

  try {
    await s3Client.send(command);
    console.log(`✅ PDF deleted from S3: ${s3Key}`);
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
  if (!BUCKET_NAME) {
    throw new Error('ORION_S3_BUCKET_NAME or S3_BUCKET_NAME environment variable is not set');
  }

  const region = process.env.ORION_S3_REGION || process.env.S3_REGION || 'us-east-1';
  return `https://${BUCKET_NAME}.s3.${region}.amazonaws.com/${s3Key}`;
};
