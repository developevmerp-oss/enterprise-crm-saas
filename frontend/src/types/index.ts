export type UserRole =
  | 'SUPER_ADMIN'
  | 'BUSINESS_OWNER'
  | 'SALES_MANAGER'
  | 'SALES_EXECUTIVE'
  | 'MARKETING_MANAGER'
  | 'VIEWER';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name?: string;
  role: UserRole;
  team_name?: string;
  status: string;
  created_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name?: string;
  email: string;
  phone?: string;
  company_name: string;
  job_title?: string;
  website?: string;
  industry?: string;
  company_size?: string;
  source: string;
  status: string;
  score: number;
  budget: number;
  assigned_to?: string;
  assigned_to_name?: string;
  utm_source?: string;
  utm_campaign?: string;
  last_email_sent_at?: string;
  email_tracking_status?: 'NOT_SENT' | 'SENT' | 'OPENED' | 'CLICKED';
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  tenant_id: string;
  name: string;
  domain?: string;
  industry?: string;
  size?: string;
  phone?: string;
  address?: string;
  contact_count?: number;
  deal_count?: number;
  created_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  company_id?: string;
  company_name?: string;
  first_name: string;
  last_name?: string;
  email?: string;
  phone?: string;
  job_title?: string;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  probability: number;
  order_index: number;
  color: string;
}

export interface Pipeline {
  id: string;
  tenant_id: string;
  name: string;
  is_default: boolean;
  stages: PipelineStage[];
}

export interface Deal {
  id: string;
  tenant_id: string;
  title: string;
  company_id?: string;
  company_name?: string;
  contact_id?: string;
  contact_first_name?: string;
  contact_last_name?: string;
  pipeline_id: string;
  stage_id: string;
  stage_name?: string;
  stage_color?: string;
  amount: number;
  probability: number;
  expected_close_date?: string;
  status: string;
  created_at: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  due_date?: string;
  related_type?: string;
  related_id?: string;
  assignee_first_name?: string;
  assignee_last_name?: string;
  created_at: string;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  sku?: string;
  price: number;
  tax_rate: number;
  description?: string;
  created_at: string;
}

export interface Quotation {
  id: string;
  tenant_id: string;
  deal_id?: string;
  deal_title?: string;
  company_name?: string;
  quote_number: string;
  total_amount: number;
  items?: any;
  status: string;
  valid_until?: string;
  created_at: string;
}

export interface AnalyticsDashboard {
  totalLeads: number;
  hotLeads: number;
  totalBudget: number;
  totalPipelineValue: number;
  wonRevenue: number;
  winRate: string;
  companiesCount: number;
  contactsCount: number;
  pendingTasks: number;
  sourceBreakdown: Record<string, number>;
}

export interface TrackedEmail {
  id: string;
  tenant_id: string;
  lead_id?: string;
  deal_id?: string;
  quotation_id?: string;
  recipient_email: string;
  recipient_name?: string;
  sender_name?: string;
  subject: string;
  body_html: string;
  tracking_token: string;
  proposal_token?: string;
  status: 'SENT' | 'OPENED' | 'CLICKED' | 'ACCEPTED';
  sent_at: string;
  opened_at?: string;
  open_count: number;
  last_opened_at?: string;
  clicked_at?: string;
  click_count: number;
  last_clicked_at?: string;
  proposal_url?: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_company?: string;
  quote_number?: string;
  quote_amount?: number;
}

export interface EmailStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalAccepted: number;
  openRate: string;
  clickRate: string;
}

