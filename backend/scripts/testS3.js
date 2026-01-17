import { uploadPdfToS3, deletePdfFromS3, getPdfPresignedUrl } from '../utils/s3Service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from backend/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

console.log('🧪 Testing S3 Upload Service...');
console.log('Environment Variables Check:');
console.log('ORION_S3_BUCKET_NAME:', process.env.ORION_S3_BUCKET_NAME);
console.log('ORION_S3_REGION:', process.env.ORION_S3_REGION);
console.log('ORION_S3_ACCESS_KEY present:', !!process.env.ORION_S3_ACCESS_KEY);

const runTest = async () => {
    try {
        const testBuffer = Buffer.from('Test PDF content ' + Date.now());
        const salesUserId = 'test-user-id';
        const quotationId = 'TEST-QUOTATION-' + Date.now();

        console.log('\n📤 Attempting upload...');
        const key = await uploadPdfToS3(testBuffer, quotationId, salesUserId);
        console.log('✅ Upload successful. Key:', key);

        console.log('\n🔗 Getting presigned URL...');
        const url = await getPdfPresignedUrl(key);
        console.log('✅ URL generated:', url);

        console.log('\n🗑️ Cleaning up (deleting test file)...');
        await deletePdfFromS3(key);
        console.log('✅ Delete successful');

        console.log('\n✨ S3 Configuration is VALID and WORKING!');
    } catch (error) {
        console.error('\n❌ S3 Test FAILED:', error);
        process.exit(1);
    }
};

runTest();
