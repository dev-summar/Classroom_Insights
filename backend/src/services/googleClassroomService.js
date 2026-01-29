import { google } from 'googleapis';
import { getServiceAccountAuth } from '../auth/googleAuth.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Gets a Classroom API client strictly via Service Account + Domain-Wide Delegation.
 * THIS IS THE ONLY ALLOWED PATH FOR CLASSROOM API ACCESS.
 */
const getClassroomClient = () => {
    try {
        const auth = getServiceAccountAuth();

        // Validation: Ensure it's a JWT client
        if (auth.constructor.name !== 'JWT') {
            throw new Error(`Invalid Auth Client: Expected JWT, got ${auth.constructor.name}`);
        }

        const impersonatedUser = process.env.GOOGLE_IMPERSONATED_USER;
        console.log(`[AUTH] Initializing Google Classroom API client (JWT: ${impersonatedUser})`);

        return google.classroom({ version: 'v1', auth });
    } catch (error) {
        console.error('[AUTH ERROR] Google Classroom Client initialization failed:', error.message);
        throw new Error(`CRITICAL: Service Account Classroom Auth Failed. ${error.message}`);
    }
};

export default getClassroomClient;
