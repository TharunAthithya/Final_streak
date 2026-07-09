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
    try {
      if (secret) {
        // Strict verification in production/staging environments
        const decoded = jwt.verify(token, secret) as any;
        return {
          sub: decoded.sub,
          email: decoded.email,
        };
      } else {
        // Fallback for local development/testing without live credentials
        const decoded = jwt.decode(token) as any;
        if (!decoded || !decoded.sub) {
          // Fallback user if token parsing fails but secret is absent
          return {
            sub: 'mock-auth-user-id-123',
            email: 'mock-user@example.com',
          };
        }
        return {
          sub: decoded.sub,
          email: decoded.email || 'mock-user@example.com',
        };
      }
    } catch (err) {
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}
