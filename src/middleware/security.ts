import { Request, Response, NextFunction } from 'express';
const express = require('express');
const app = express();
const originalJson = express.json; 
export const safeJsonParser = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  express.json({
    limit: '10mb',
    strict: true,
    type: ['application/json', 'application/*+json'], // Allow JSON variants
    verify: (req: Request, res: Response, buf: Buffer, encoding: string) => {
      try {
        // Check if buffer exists and has content
        if (!buf || buf.length === 0) {
          return; // Empty body is valid for some requests
        }
        
        //const text = buf.toString(encoding || 'utf-8');
        const text = buf.toString('utf-8'); 
        
        // Skip empty bodies
        if (text.trim().length === 0) {
          return;
        }
        
        // Attempt to parse and store parsed data for potential reuse
        const parsed = JSON.parse(text);
        (req as any)._rawBody = buf; // Store original buffer
        (req as any)._parsedBody = parsed; // Store parsed data
      } catch (e) {
        const error = e instanceof Error ? e : new Error('Unknown JSON parsing error');
        throw new SyntaxError(`Invalid JSON: ${error.message}`);
      }
    }
  })(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof SyntaxError) {
        return res.status(400).json({ 
          error: 'Invalid JSON payload',
          details: err.message.replace('Invalid JSON: ', '')
        });
      }
      return res.status(500).json({ error: 'Internal server error during parsing' });
    }
    next();
  });
};

export const preventXSS = (req: Request, res: Response, next: NextFunction) => {
  // Only sanitize if body exists and is an object
  if (!req.body || typeof req.body !== 'object' || req.body === null) {
    return next();
  }

  const sanitize = (obj: any): any => {
    if (obj === null || obj === undefined) {
      return obj;
    }

    // Handle Date objects and other non-plain objects
    if (typeof obj !== 'object' || obj instanceof Date || obj instanceof RegExp) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => sanitize(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // More comprehensive XSS prevention
        sanitized[key] = value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = sanitize(value);
      } else {
        sanitized[key] = value; // Preserve numbers, booleans, etc.
      }
    }
    return sanitized;
  };

  try {
    req.body = sanitize(req.body);
    next();
  } catch (error) {
    console.error('XSS sanitization error:', error);
    next(); // Continue anyway rather than block the request
  }
};