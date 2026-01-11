import { logger } from '../utils/logger';

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
    logger.error('FATAL: ACCESS_TOKEN_SECRET is missing or too short (min 32 chars). Exiting.');
    process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL || (!DATABASE_URL.startsWith('mongodb://') && !DATABASE_URL.startsWith('mongodb+srv://'))) {
    logger.error('FATAL: Invalid or missing DATABASE_URL. Exiting.');
    process.exit(1);
}

const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || JWT_SECRET + '_refresh';
if (!REFRESH_TOKEN_SECRET || REFRESH_TOKEN_SECRET.length < 32) {
    logger.warn('REFRESH_TOKEN_SECRET is missing or too short, using JWT_SECRET + "_refresh". Consider setting a separate secret.');
}

export const config: {
    jwtSecret: string;
    jwtExpiration: string;
    refreshTokenSecret: string;
    refreshTokenExpiration: string;
    databaseUrl: string;
    host: string;
    port: number;
    environment: string;
    allowedOrigins: string[];
    livekit: {
        url: string;
        apiUrl: string;
        apiKey: string;
        apiSecret: string;
    };
    admin: {
        createInitially: boolean;
        username: string;
        password: string;
    };
    inviteCodeExpiryHours: number;
} = {
    jwtSecret: JWT_SECRET,
    jwtExpiration: (process.env.JWT_EXPIRATION || '2h') as string,
    refreshTokenSecret: REFRESH_TOKEN_SECRET,
    refreshTokenExpiration: (process.env.REFRESH_TOKEN_EXPIRATION || '7d') as string,
    databaseUrl: DATABASE_URL,
    host: process.env.HOST || '0.0.0.0',
    port: parseInt(process.env.PORT || '3000', 10),
    environment: process.env.ENVIRONMENT || 'development',
    allowedOrigins: process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
        : ['http://localhost:3000', 'http://localhost:3001'],
    livekit: {
        url: process.env.LIVEKIT_URL || 'ws://localhost:7880',
        apiUrl: process.env.LIVEKIT_API_URL || 'http://localhost:7880',
        apiKey: process.env.LIVEKIT_API_KEY || 'devkey',
        apiSecret: process.env.LIVEKIT_API_SECRET || 'secret',
    },
    admin: {
        createInitially: process.env.CREATE_ADMIN_INITIALLY === 'true',
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123',
    },
    inviteCodeExpiryHours: parseInt(process.env.INVITE_CODE_EXPIRY_HOURS || '24', 10),
};

if (config.environment === 'production' && config.allowedOrigins.includes('*')) {
    logger.error('FATAL: Wildcard CORS (*) is not allowed in production. Exiting.');
    process.exit(1);
}
