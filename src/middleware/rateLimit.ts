import rateLimit from 'express-rate-limit';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // stricter limit for auth endpoints
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
});

export const writeOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // limit write operations more strictly
  message: 'Too many write operations, please try again later.',
  standardHeaders: true,
});