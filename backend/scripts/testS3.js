import { uploadPdfToS3, deletePdfFromS3, getPdfPresignedUrl } from '../utils/s3Service.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env vars from backend/.env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const runTest = async () => {
    try {
        const testBuffer = Buffer.from('Test PDF content ' + Date.now());
        const salesUserId = 'test-user-id';
        const quotationId = 'TEST-QUOTATION-' + Date.now();

        const key = await uploadPdfToS3(testBuffer, quotationId, salesUserId);

        const url = await getPdfPresignedUrl(key);

        await deletePdfFromS3(key);

    } catch (error) {
        console.error('\n❌ S3 Test FAILED:', error);
        process.exit(1);
    }
};

runTest();
