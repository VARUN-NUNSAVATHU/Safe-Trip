import { Request, Response, NextFunction } from 'express';

export type UserRole = 'user' | 'admin' | 'moderator';

/**
 * Role-Based Access Control (RBAC) Middleware
 * Restricts sensitive administrative or bulk management endpoints
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        success: false,
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required before role verification.',
      });
      return;
    }

    const userRole = user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({
        success: false,
        statusCode: 403,
        error: 'Forbidden',
        message: `Access denied. Role '${userRole}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`,
      });
      return;
    }

    next();
  };
};
