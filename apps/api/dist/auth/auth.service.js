"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt = require("jsonwebtoken");
let AuthService = class AuthService {
    verifyToken(token) {
        const secret = process.env.SUPABASE_JWT_SECRET;
        const isProdOrStaging = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'staging';
        const allowMock = process.env.ALLOW_DEV_MOCK_AUTH === 'true';
        try {
            if (isProdOrStaging) {
                if (!secret) {
                    throw new common_1.UnauthorizedException('JWT Secret configuration missing in production/staging');
                }
                const decoded = jwt.verify(token, secret);
                return {
                    sub: decoded.sub,
                    email: decoded.email,
                };
            }
            if (secret) {
                const decoded = jwt.verify(token, secret);
                return {
                    sub: decoded.sub,
                    email: decoded.email,
                };
            }
            if (!allowMock) {
                throw new common_1.UnauthorizedException('Mock authentication is disabled. Please configure SUPABASE_JWT_SECRET');
            }
            const decoded = jwt.decode(token);
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
        }
        catch (err) {
            if (err instanceof common_1.UnauthorizedException) {
                throw err;
            }
            throw new common_1.UnauthorizedException('Invalid or expired authentication token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)()
], AuthService);
//# sourceMappingURL=auth.service.js.map