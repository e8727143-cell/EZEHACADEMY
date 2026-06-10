import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const tokenSecurityKey = process.env.BUNNY_SECURITY_KEY?.trim() || 'test-key';
const videoId = 'test-video-id';
const libraryId = '12345';

const expirationInSeconds = 3600;
const expires = Math.floor(Date.now() / 1000) + expirationInSeconds;

const hashableString = tokenSecurityKey + videoId + expires;
const token = crypto.createHash('sha256').update(hashableString).digest('hex');

console.log(`https://iframe.mediadelivery.net/embed/${libraryId}/${videoId}?token=${token}&expires=${expires}`);
