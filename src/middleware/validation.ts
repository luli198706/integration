import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      allowUnknown: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        type: detail.type
      }));

      return res.status(400).json({
        error: 'Validation failed',
        details: errorDetails
      });
    }

    req.body = value;
    next();
  };
};

// Schema definitions
export const productCreateSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).precision(2).required(),
  category: Joi.string().max(100).optional(),
  sku: Joi.string().max(50).optional(),
  manufacturer: Joi.string().max(100).optional()
});

export const productUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().max(1000).optional(),
  price: Joi.number().min(0).precision(2).optional(),
  category: Joi.string().max(100).optional(),
  sku: Joi.string().max(50).optional(),
  manufacturer: Joi.string().max(100).optional()
});

export const idempotencyKeySchema = Joi.object({
  'idempotency-key': Joi.string().min(1).max(255).required()
}).unknown(true);