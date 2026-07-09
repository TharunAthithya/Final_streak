import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  sub: string;
  email: string;
}

@Injectable()
export class AuthService {
  verifyToken(token: string): AuthenticatedUser {
    const secret = process.env.SUPABASE_JWT_SECRET;
    const isProdOrStaging = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
    const allowMock = process.env.ALLOW_DEV_MOCK_AUTH === 'true';

    try {
      if (isProdOrStaging) {
        if (!secret) {
          throw new UnauthorizedException('JWT Secret configuration missing in production/staging');
        }
        const decoded = jwt.verify(token, secret) as any;
        return {
          sub: decoded.sub,
          email: decoded.email,
        };
      }

      // Local development/testing environment
      if (secret) {
        // If a secret is provided in dev, verify it cryptographically
        const decoded = jwt.verify(token, secret) as any;
        return {
          sub: decoded.sub,
          email: decoded.email,
        };
      }

      if (!allowMock) {
        throw new UnauthorizedException('Mock authentication is disabled. Please configure SUPABASE_JWT_SECRET');
      }

      // Fallback decode only when ALLOW_DEV_MOCK_AUTH is true
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.sub) {
        return {
          sub: 'mock-auth-user-id-123',
          email: 'mock-user@example.com',
        };
      }
      return {
        sub: decoded.sub,
        email: decoded.email || 'mock-user@example.com',
      };
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
