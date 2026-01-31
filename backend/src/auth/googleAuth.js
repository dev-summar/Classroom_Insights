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
 */
const LOGIN_SCOPES = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
];

/**
 * CORE_SCOPES: Always enabled and approved in Admin Console.
 */
const CORE_SCOPES = [
    'https://www.googleapis.com/auth/classroom.courses.readonly',
    'https://www.googleapis.com/auth/classroom.rosters.readonly'
];

/**
 * OPTIONAL_SCOPES: Only requested if ENABLE_ASSIGNMENTS_SYNC is true.
 */
const OPTIONAL_SCOPES = [
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
    'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly'
];

export const getGoogleAuthURL = () => {
    const oauth2Client = createOAuth2Client();
    return oauth2Client.generateAuthUrl({
        access_type: 'online',
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
 * Dynamically selects scopes based on feature flags to avoid unauthorized_client errors.
 */
export const getServiceAccountAuth = (impersonatedEmail = null) => {
    let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;

    if (privateKey) {
        privateKey = privateKey.replace(/^['"]|['"]$/g, '');
        privateKey = privateKey.replace(/\\n/g, '\n').trim();
        if (!privateKey.startsWith('-----BEGIN PRIVATE KEY-----')) {
            throw new Error('Invalid Private Key');
        }
    }

    const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const impersonatedUser = impersonatedEmail || process.env.GOOGLE_IMPERSONATED_USER;

    if (!privateKey || !clientEmail || !impersonatedUser) {
        throw new Error('Service Account configuration is missing in .env');
    }

    // FEATURE FLAG: Only include optional scopes if explicitly enabled
    const enableAssignments = process.env.ENABLE_ASSIGNMENTS_SYNC === 'true';
    const activeScopes = enableAssignments ? [...CORE_SCOPES, ...OPTIONAL_SCOPES] : CORE_SCOPES;

    console.log(`[AUTH] Creating JWT client for ${impersonatedUser}. Scopes: ${activeScopes.length} (${enableAssignments ? 'All' : 'Core Only'})`);

    return new google.auth.JWT(
        clientEmail,
        null,
        privateKey,
        activeScopes,
        impersonatedUser
    );
};

export default createOAuth2Client;
