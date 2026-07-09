export interface AuthenticatedUser {
    sub: string;
    email: string;
}
export declare class AuthService {
    verifyToken(token: string): AuthenticatedUser;
}
