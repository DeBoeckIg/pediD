import { requireAdminSession } from './session';
export async function requireAdmin() { return requireAdminSession(); }
