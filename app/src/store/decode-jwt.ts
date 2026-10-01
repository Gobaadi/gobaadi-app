import { AuthUser } from './authSlice';

interface DecodedJwt {
  sub: number;
  role: string;
  phone?: string;
  name?: string;
  exp: number;
}

/** Decodes (without verifying) a JWT payload for client-side UI hydration only. */
export function decodeJwt(token: string): DecodedJwt | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function jwtToAuthUser(token: string): AuthUser | null {
  const decoded = decodeJwt(token);
  if (!decoded) return null;
  if (decoded.exp * 1000 < Date.now()) return null;
  return { id: decoded.sub, phone: decoded.phone, role: decoded.role, name: decoded.name };
}
