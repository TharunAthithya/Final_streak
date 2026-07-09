import { AuthService } from './auth.service';
import { UnauthorizedException } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken');

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
    delete process.env.SUPABASE_JWT_SECRET;
  });

  it('should return mock user when no token is present and secret is absent', () => {
    (jwt.decode as jest.Mock).mockReturnValue(null);
    const result = authService.verifyToken('invalid-token');
    expect(result.sub).toBe('mock-auth-user-id-123');
    expect(result.email).toBe('mock-user@example.com');
  });

  it('should decode user sub and email when secret is absent and token is decodable', () => {
    (jwt.decode as jest.Mock).mockReturnValue({ sub: 'user-123', email: 'test@example.com' });
    const result = authService.verifyToken('valid-decoded-token');
    expect(result.sub).toBe('user-123');
    expect(result.email).toBe('test@example.com');
  });

  it('should strictly verify token when secret is present', () => {
    process.env.SUPABASE_JWT_SECRET = 'my-secret-key';
    (jwt.verify as jest.Mock).mockReturnValue({ sub: 'verified-user-123', email: 'verified@example.com' });

    const result = authService.verifyToken('strictly-signed-token');
    expect(jwt.verify).toHaveBeenCalledWith('strictly-signed-token', 'my-secret-key');
    expect(result.sub).toBe('verified-user-123');
    expect(result.email).toBe('verified@example.com');
  });

  it('should throw UnauthorizedException when verification fails and secret is present', () => {
    process.env.SUPABASE_JWT_SECRET = 'my-secret-key';
    (jwt.verify as jest.Mock).mockImplementation(() => {
      throw new Error('signature verification failed');
    });

    expect(() => authService.verifyToken('invalid-signed-token')).toThrow(UnauthorizedException);
  });
});
