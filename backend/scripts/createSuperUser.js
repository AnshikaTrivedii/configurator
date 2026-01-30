import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import connectDB from '../config/database.js';
import SalesUser from '../models/SalesUser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const createSuperUser = async () => {
    try {
        await connectDB();

        const superUserEmail = 'admin@orion.com';
        const password = 'admin123';
        const hashedPassword = await bcrypt.hash(password, 12);

        const superUserData = {
            email: superUserEmail,
            name: 'Super Admin',
            location: 'Headquarters',
            contactNumber: '0000000000',
            role: 'super_admin',
            passwordHash: hashedPassword,
            mustChangePassword: false,
            passwordSetAt: new Date()
        };

        const existingUser = await SalesUser.findOne({ email: superUserEmail });

        if (existingUser) {

            existingUser.role = 'super_admin';
            existingUser.passwordHash = hashedPassword;
            existingUser.mustChangePassword = false;
            await existingUser.save();

        } else {

            await SalesUser.create(superUserData);

        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating super user:', error);
        process.exit(1);
    }
};

createSuperUser();
