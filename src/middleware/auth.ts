import { Request, Response, NextFunction } from 'express';
const jwt = require('jsonwebtoken');
import { config } from '../config/config';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Authorization header required' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Bearer token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || config.jwtSecret;
    if (!secret) {
      throw new Error('JWT secret not configured');
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const optionalJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader) {
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    try {
      const secret = process.env.JWT_SECRET || config.jwtSecret;
      if (secret) {
        const decoded = jwt.verify(token, secret);
        req.user = decoded;
      }
    } catch (error) {
      // Silently fail for optional auth
    }
  }
  
  next();
};