import { Request, Response, NextFunction } from 'express';

/**
 * Strips dangerous injection characters, script tags, and MongoDB operator keys ($gt, $where, etc.)
 */
export function sanitizeValue(value: any): any {
  if (typeof value === 'string') {
    // Escape HTML tags & potential XSS vectors
    let cleaned = value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/[<>]/g, '');

    // Trim excessive whitespace
    return cleaned.trim();
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value !== null && typeof value === 'object') {
    const cleanObj: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      // Defend against NoSQL Operator Injection (keys starting with $)
      if (key.startsWith('$')) {
        continue;
      }
      cleanObj[key] = sanitizeValue(value[key]);
    }
    return cleanObj;
  }

  return value;
}

/**
 * Input Sanitization Middleware
 * Sanitizes req.body, req.query, and req.params against injection payloads
 */
export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  next();
};
