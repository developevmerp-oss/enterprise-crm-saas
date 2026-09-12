import {
  Tenant, User, Lead, Company, Contact, Deal, Pipeline, Task, Product, Quotation, AnalyticsDashboard, UserRole, TrackedEmail, EmailStats
} from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5080/api/v1';

// Active session state stored in memory / localStorage
let activeTenantId = '11111111-1111-1111-1111-111111111111'; // Scaloy Growth default
let activeUserRole: UserRole = 'BUSINESS_OWNER';

export function getActiveTenantId(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('leadpulse_tenant_id');
    if (saved) return saved;
  }
  return activeTenantId;
}

export function setActiveTenantId(id: string) {
  activeTenantId = id;
  if (typeof window !== 'undefined') {
    localStorage.setItem('leadpulse_tenant_id', id);
  }
}

export function getActiveUserRole(): UserRole {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('leadpulse_user_role') as UserRole;
    if (saved) return saved;
  }
  return activeUserRole;
}

export function setActiveUserRole(role: UserRole) {
  activeUserRole = role;
  if (typeof window !== 'undefined') {
    localStorage.setItem('leadpulse_user_role', role);
  }
}

import { getAuthToken } from './auth';

function getHeaders(): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': getActiveTenantId(),
    'x-user-role': getActiveUserRole()
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 0. Auth API
export async function loginUser(email: string, password: string): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

// 1. Tenants API
export async function fetchTenants(): Promise<Tenant[]> {
  const res = await fetch(`${API_BASE}/tenants`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createTenant(payload: { name: string; slug: string; plan?: string }): Promise<Tenant> {
  const res = await fetch(`${API_BASE}/tenants`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create tenant');
  return data.data;
}

// 2. Leads API
export async function fetchLeads(params?: { search?: string; status?: string; source?: string; tier?: string }): Promise<Lead[]> {
  const q = new URLSearchParams();
  if (params?.search) q.append('search', params.search);
  if (params?.status) q.append('status', params.status);
  if (params?.source) q.append('source', params.source);
  if (params?.tier) q.append('tier', params.tier);

  const res = await fetch(`${API_BASE}/leads?${q.toString()}`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createLead(payload: Partial<Lead>): Promise<Lead> {
  const res = await fetch(`${API_BASE}/leads`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create lead');
  return data.data;
}

export async function updateLeadStage(id: string, status: string): Promise<Lead> {
  const res = await fetch(`${API_BASE}/leads/${id}/stage`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update stage');
  return data.data;
}

export async function assignLead(id: string, userId: string, userName: string): Promise<Lead> {
  const res = await fetch(`${API_BASE}/leads/${id}/assign`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ user_id: userId, user_name: userName })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to assign lead');
  return data.data;
}

export async function convertLead(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/leads/${id}/convert`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to convert lead');
  return data.data;
}

export async function deleteLead(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/leads/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to delete lead');
}

export async function triggerWebhook(payload: Record<string, any>): Promise<any> {
  const res = await fetch(`${API_BASE}/leads/webhook`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Webhook failed');
  return data;
}

export async function uploadCsvLeads(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/leads/import`, {
    method: 'POST',
    headers: {
      'x-tenant-id': getActiveTenantId(),
      'x-user-role': getActiveUserRole()
    },
    body: formData
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'CSV import failed');
  return data;
}

// 3. Companies & Contacts API
export async function fetchCompanies(): Promise<Company[]> {
  const res = await fetch(`${API_BASE}/companies`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createCompany(payload: Partial<Company>): Promise<Company> {
  const res = await fetch(`${API_BASE}/companies`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create company');
  return data.data;
}

export async function fetchContacts(): Promise<Contact[]> {
  const res = await fetch(`${API_BASE}/contacts`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createContact(payload: Partial<Contact>): Promise<Contact> {
  const res = await fetch(`${API_BASE}/contacts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create contact');
  return data.data;
}

// 4. Pipelines & Deals API
export async function fetchPipelines(): Promise<Pipeline[]> {
  const res = await fetch(`${API_BASE}/deals/pipelines`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function fetchDeals(): Promise<Deal[]> {
  const res = await fetch(`${API_BASE}/deals`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createDeal(payload: Partial<Deal>): Promise<Deal> {
  const res = await fetch(`${API_BASE}/deals`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create deal');
  return data.data;
}

export async function updateDealStage(id: string, stage_id: string, status?: string): Promise<Deal> {
  const res = await fetch(`${API_BASE}/deals/${id}/stage`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ stage_id, status })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to update deal stage');
  return data.data;
}

// 5. Tasks API
export async function fetchTasks(): Promise<Task[]> {
  const res = await fetch(`${API_BASE}/tasks`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createTask(payload: Partial<Task>): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to schedule task');
  return data.data;
}

export async function toggleTaskStatus(id: string, status: string): Promise<Task> {
  const res = await fetch(`${API_BASE}/tasks/${id}/status`, {
    method: 'PATCH',
    headers: getHeaders(),
    body: JSON.stringify({ status })
  });
  const data = await res.json();
  return data.data;
}

// 6. Products & Quotations API
export async function fetchProducts(): Promise<Product[]> {
  const res = await fetch(`${API_BASE}/quotations/products`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createProduct(payload: Partial<Product>): Promise<Product> {
  const res = await fetch(`${API_BASE}/quotations/products`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add product');
  return data.data;
}

export async function fetchQuotations(): Promise<Quotation[]> {
  const res = await fetch(`${API_BASE}/quotations`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createQuotation(payload: Partial<Quotation>): Promise<Quotation> {
  const res = await fetch(`${API_BASE}/quotations`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to create quotation');
  return data.data;
}

// 7. Users & Team API
export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function createUser(payload: Partial<User> & { password?: string }): Promise<User> {
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to add user');
  return data.data;
}

// 8. Analytics API
export async function fetchAnalytics(): Promise<AnalyticsDashboard> {
  const res = await fetch(`${API_BASE}/analytics/dashboard`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data;
}

// 9. Email Outreach & Tracking API
export async function sendEmail(payload: {
  lead_id?: string;
  deal_id?: string;
  quotation_id?: string;
  recipient_email: string;
  recipient_name?: string;
  subject: string;
  body_html: string;
  body_text?: string;
  sender_name?: string;
  track_opens?: boolean;
  deliverability_mode?: 'FULL_TRACKING' | 'HIGH_INBOX';
}): Promise<{ success: boolean; message: string; data: TrackedEmail }> {
  const res = await fetch(`${API_BASE}/emails/send`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to send email');
  return data;
}

export async function fetchTrackedEmails(params?: { lead_id?: string; quotation_id?: string; status?: string }): Promise<TrackedEmail[]> {
  const q = new URLSearchParams();
  if (params?.lead_id) q.append('lead_id', params.lead_id);
  if (params?.quotation_id) q.append('quotation_id', params.quotation_id);
  if (params?.status) q.append('status', params.status);

  const res = await fetch(`${API_BASE}/emails?${q.toString()}`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || [];
}

export async function fetchEmailStats(): Promise<EmailStats> {
  const res = await fetch(`${API_BASE}/emails/stats`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  return data.data || { totalSent: 0, totalOpened: 0, totalClicked: 0, totalAccepted: 0, openRate: '0%', clickRate: '0%' };
}

export async function simulateEmailEvent(tracking_token: string, event: 'open' | 'click'): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/emails/simulate`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ tracking_token, event })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Simulation failed');
  return data;
}

export interface SmtpSettings {
  host: string;
  port: number | string;
  secure?: boolean;
  user: string;
  pass?: string;
  from_name?: string;
  from_email?: string;
  domain?: string;
}

export async function fetchEmailSettings(): Promise<{
  tenant_name: string;
  is_custom_configured: boolean;
  smtp: SmtpSettings | null;
  system_default: {
    configured: boolean;
    host: string;
    port: string;
    from_name: string;
    from_email: string;
  };
}> {
  const res = await fetch(`${API_BASE}/emails/settings`, { headers: getHeaders(), cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to fetch email settings');
  return data.data;
}

export async function saveEmailSettings(payload: SmtpSettings): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/emails/settings`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to save email settings');
  return data;
}

export async function testEmailSettings(payload: SmtpSettings & { test_recipient?: string }): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/emails/settings/test`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'SMTP test probe failed');
  return data;
}

// 10. Public Client Proposal Portal API
export async function fetchPublicProposal(token: string): Promise<any> {
  const res = await fetch(`${API_BASE}/emails/public/proposal/${token}`, { cache: 'no-store' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to load proposal');
  return data.data;
}

export async function acceptPublicProposal(token: string, payload: { signer_name?: string; notes?: string }): Promise<any> {
  const res = await fetch(`${API_BASE}/emails/public/proposal/${token}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Failed to accept proposal');
  return data;
}

