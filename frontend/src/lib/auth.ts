import { UserRole } from '../types';

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  tenant_id: string;
  tenant_name: string;
  tenant_plan: string;
}

const TOKEN_KEY = 'leadpulse_auth_token';
const USER_KEY = 'leadpulse_auth_user';

export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

export function getStoredUser(): AuthUser | null {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

export function saveAuthSession(token: string, user: AuthUser) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem('leadpulse_tenant_id', user.tenant_id);
  }
}

export function clearAuthSession() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }
}

export function canAccessModule(role: UserRole, tab: string): boolean {
  switch (role) {
    case 'SUPER_ADMIN':
      return true; // Unrestricted access
    case 'BUSINESS_OWNER':
      return tab !== 'tenants'; // Access to all modules within tenant
    case 'SALES_MANAGER':
      return ['dashboard', 'leads', 'emails', 'deals', 'companies', 'contacts', 'tasks', 'quotations', 'team'].includes(tab);
    case 'SALES_EXECUTIVE':
      return ['dashboard', 'leads', 'emails', 'deals', 'contacts', 'tasks', 'quotations'].includes(tab);
    case 'MARKETING_MANAGER':
      return ['dashboard', 'leads', 'emails', 'companies', 'contacts'].includes(tab);
    case 'VIEWER':
      return ['dashboard', 'leads', 'emails', 'deals', 'companies', 'contacts', 'tasks', 'quotations'].includes(tab);
    default:
      return false;
  }
}

export function canPerformAction(role: UserRole, action: 'CREATE' | 'EDIT' | 'DELETE' | 'ASSIGN' | 'EXPORT'): boolean {
  if (role === 'SUPER_ADMIN' || role === 'BUSINESS_OWNER') return true;
  if (role === 'SALES_MANAGER') return action !== 'DELETE';
  if (role === 'SALES_EXECUTIVE') return action === 'CREATE' || action === 'EDIT';
  if (role === 'MARKETING_MANAGER') return action !== 'DELETE';
  if (role === 'VIEWER') return false;
  return false;
}
