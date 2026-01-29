import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

const createOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );
};

/**
 * LOGIN_SCOPES: Only for user identity. 
 * NO CLASSROOM SCOPES ALLOWED HERE.
 */
const LOGIN_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * CLASSROOM_SCOPES: Absolute minimal scope set for Service Account.
 * 
 * CRITICAL: Start with minimal scopes to fix unauthorized_client error.
 * Additional scopes can be added incrementally after verification.
 * 
 * Current Minimal Set (Phase 1):
 * - classroom.courses.readonly → List and view courses
 * - classroom.rosters.readonly → View teachers and students
 * 
 * To Add After Verification (Phase 2):
 * - classroom.coursework.students.readonly → View assignments
 * - classroom.student-submissions.students.readonly → View submissions
 */
const CLASSROOM_SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly'
];

export const getGoogleAuthURL = () => {
    const oauth2Client = createOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'online', // No offline access needed as we don't store refresh tokens
        include_granted_scopes: false,
        scope: LOGIN_SCOPES,
    });
};

export const getGoogleUser = async (code) => {
    const oauth2Client = createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({
        auth: oauth2Client,
        version: 'v2'
    });

    const { data } = await oauth2.userinfo.get();

    return { user: data, tokens };
};

/**
 * Creates a JWT client for Service Account with Domain-Wide Delegation.
 * Verified and audited for Subject impersonation.
 */
export const getServiceAccountAuth = () => {
    let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (privateKey) {
        // Strip extra quotes if they exist
        privateKey = privateKey.replace(/^['"]|['"]$/g, '');
        // Normalize: Replace escaped newlines (\\n) with real newlines (\n) and trim
        privateKey = privateKey.replace(/\\n/g, '\n').trim();

        // Validation: Must be a valid PEM private key
        if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
            throw new Error('Invalid Private Key: Key must start with -----BEGIN PRIVATE KEY-----');
        }
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const impersonatedUser = process.env.GOOGLE_IMPERSONATED_USER;

    if (!privateKey || !clientEmail || !impersonatedUser) {
        throw new Error('Service Account configuration is missing in .env');
    }

    return new google.auth.JWT(
        clientEmail,
        null,
        privateKey,
        CLASSROOM_SCOPES,
        impersonatedUser
    );
};

export default createOAuth2Client;
