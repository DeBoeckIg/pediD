import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const secret = () => new TextEncoder().encode(process.env.ADMIN_SESSION_SECRET!);
export async function issueAdminSession() { return new SignJWT({ role: 'admin' }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('8h').sign(secret()); }
export async function requireAdminSession() { const token = (await cookies()).get('pedid_admin_session')?.value; if (!token) throw new Error('Unauthorized'); try { const { payload } = await jwtVerify(token, secret()); if (payload.role !== 'admin') throw new Error(); return payload; } catch { throw new Error('Unauthorized'); } }
