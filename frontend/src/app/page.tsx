'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar, NavTab } from '../components/Sidebar';
import { TopNavbar } from '../components/TopNavbar';
import { LoginView } from '../components/LoginView';
import { TenantModal } from '../components/TenantModal';
import { LeadModal } from '../components/LeadModal';
import { DealModal } from '../components/DealModal';
import { TaskModal } from '../components/TaskModal';
import { QuoteModal } from '../components/QuoteModal';
import { CompanyModal } from '../components/CompanyModal';
import { TeamModal } from '../components/TeamModal';
import { ContactModal } from '../components/ContactModal';
import { SendEmailModal } from '../components/SendEmailModal';
import { SmtpSettingsModal } from '../components/SmtpSettingsModal';
import {
  Tenant, UserRole, User, Lead, Company, Contact, Deal, Task, Product, Quotation, AnalyticsDashboard, TrackedEmail, EmailStats
} from '../types';
import {
  AuthUser,
  getStoredUser,
  clearAuthSession,
  canAccessModule,
  canPerformAction
} from '../lib/auth';
import {
  fetchTenants,
  fetchLeads,
  updateLeadStage,
  convertLead,
  assignLead,
  uploadCsvLeads,
  deleteLead,
  triggerWebhook,
  fetchCompanies,
  fetchContacts,
  fetchDeals,
  updateDealStage,
  fetchTasks,
  toggleTaskStatus,
  fetchProducts,
  fetchQuotations,
  fetchUsers,
  fetchAnalytics,
  fetchTrackedEmails,
  fetchEmailStats,
  simulateEmailEvent,
  getActiveTenantId,
  setActiveTenantId,
  getActiveUserRole,
  setActiveUserRole
} from '../lib/api';
import {
  Users,
  Flame,
  DollarSign,
  Target,
  Plus,
  Search,
  CheckCircle2,
  Building,
  Mail,
  Phone,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  Send,
  Webhook,
  CheckSquare,
  FileSpreadsheet,
  Lock,
  UserPlus,
  Eye,
  MousePointerClick,
  ExternalLink,
  Sparkles,
  FileText,
  Server
} from 'lucide-react';

export default function EnterpriseApp() {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [activeTenantId, setActiveTenantIdState] = useState<string>('11111111-1111-1111-1111-111111111111');
  const [userRole, setUserRoleState] = useState<UserRole>('BUSINESS_OWNER');

  // Domain data
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsDashboard | null>(null);
  const [trackedEmails, setTrackedEmails] = useState<TrackedEmail[]>([]);
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null);

  // Modals state
  const [isTenantModalOpen, setIsTenantModalOpen] = useState(false);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isQuoteModalOpen, setIsQuoteModalOpen] = useState(false);
  const [isCompanyModalOpen, setIsCompanyModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isSendEmailModalOpen, setIsSendEmailModalOpen] = useState(false);
  const [isSmtpModalOpen, setIsSmtpModalOpen] = useState(false);
  const [emailTargetLead, setEmailTargetLead] = useState<Lead | null>(null);
  const [emailPreselectedQuoteId, setEmailPreselectedQuoteId] = useState<string | undefined>(undefined);

  // Search & Filter
  const [leadSearch, setLeadSearch] = useState('');
  const [emailSearch, setEmailSearch] = useState('');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleOpenSendEmail = (lead?: Lead, quoteId?: string) => {
    setEmailTargetLead(lead || null);
    setEmailPreselectedQuoteId(quoteId);
    setIsSendEmailModalOpen(true);
  };

  const loadData = useCallback(async () => {
    try {
      const [tList, lList, cList, ctList, dList, taskList, pList, qList, uList, aData, eList, eStats] = await Promise.all([
        fetchTenants(),
        fetchLeads(),
        fetchCompanies(),
        fetchContacts(),
        fetchDeals(),
        fetchTasks(),
        fetchProducts(),
        fetchQuotations(),
        fetchUsers(),
        fetchAnalytics(),
        fetchTrackedEmails(),
        fetchEmailStats()
      ]);

      setTenants(tList);
      setLeads(lList);
      setCompanies(cList);
      setContacts(ctList);
      setDeals(dList);
      setTasks(taskList);
      setProducts(pList);
      setQuotations(qList);
      setUsers(uList);
      setAnalytics(aData);
      setTrackedEmails(eList);
      setEmailStats(eStats);
    } catch (err: any) {
      console.error('Error loading CRM data:', err);
    }
  }, []);

  // Initialize Auth state on mount
  useEffect(() => {
    const user = getStoredUser();
    if (user) {
      setCurrentUser(user);
      setActiveTenantId(user.tenant_id);
      setActiveTenantIdState(user.tenant_id);
      setActiveUserRole(user.role);
      setUserRoleState(user.role);
    }
    setAuthInitialized(true);
  }, []);

  // Fetch data when authenticated or active tenant changes
  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, activeTenantId, loadData]);

  // Ensure active tab is allowed for current role
  useEffect(() => {
    if (currentUser && !canAccessModule(currentUser.role, activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab]);

  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveTenantId(user.tenant_id);
    setActiveTenantIdState(user.tenant_id);
    setActiveUserRole(user.role);
    setUserRoleState(user.role);
    setActiveTab('dashboard');
    showToast(`Welcome, ${user.first_name}! Logged in as ${user.role}`);
    setTimeout(() => loadData(), 50);
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
    showToast('Signed out of workspace.');
  };

  const handleSelectTenant = (id: string) => {
    setActiveTenantId(id);
    setActiveTenantIdState(id);
    showToast(`Switched workspace to: ${tenants.find(t => t.id === id)?.name || id}`);
    setTimeout(() => loadData(), 50);
  };

  const activeTenantName = currentUser
    ? (currentUser.role === 'SUPER_ADMIN'
        ? (tenants.find(t => t.id === activeTenantId)?.name || currentUser.tenant_name)
        : currentUser.tenant_name)
    : 'Scaloy Digital Growth';

  // Kanban deals group by stage
  const stages = [
    { id: '77777777-7777-7777-7777-777777777771', name: 'New Leads', color: 'emerald' },
    { id: '77777777-7777-7777-7777-777777777772', name: 'Discovery Call', color: 'blue' },
    { id: '77777777-7777-7777-7777-777777777773', name: 'Qualified Fit', color: 'amber' },
    { id: '77777777-7777-7777-7777-777777777774', name: 'Proposal Sent', color: 'purple' },
    { id: '77777777-7777-7777-7777-777777777775', name: 'Closed Won', color: 'emerald' }
  ];

  // If loading auth state
  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-emerald-400 font-bold text-sm">Securing LeadPulse Session...</span>
        </div>
      </div>
    );
  }

  // If not authenticated, display real Login View
  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 selection:bg-emerald-200">
      
      {/* 1. Left Multi-Tenant Navigation Sidebar with RBAC Filtering */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userRole={currentUser.role}
        tenantName={activeTenantName}
      />

      {/* 2. Main Work Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Navbar with Authenticated User Details & Sign Out */}
        <TopNavbar
          tenants={tenants}
          activeTenantId={activeTenantId}
          onSelectTenant={handleSelectTenant}
          onOpenNewTenant={() => setIsTenantModalOpen(true)}
          currentUser={currentUser}
          onLogout={handleLogout}
          onRefresh={loadData}
        />

        {/* Dynamic Toast Alert */}
        {toastMsg && (
          <div className="fixed bottom-6 right-6 z-50 bg-emerald-800 text-white px-4 py-2.5 rounded-2xl shadow-xl border border-emerald-600 flex items-center space-x-2 text-xs font-bold animate-in slide-in-from-bottom duration-200">
            <CheckCircle2 className="w-4 h-4 text-amber-300" />
            <span>{toastMsg}</span>
          </div>
        )}

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto overflow-y-auto">
          
          {/* TAB 1: EXECUTIVE DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Top Banner */}
              <div className="bg-gradient-to-r from-emerald-800 to-emerald-900 rounded-3xl p-6 text-white shadow-md flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-amber-950 font-black text-xs uppercase tracking-wider">
                      {activeTenantName}
                    </span>
                    <span className="text-xs text-emerald-200">
                      Multi-Tenant PostgreSQL 18
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                    Lead Generation & Revenue Operating System
                  </h2>
                  <p className="text-xs text-emerald-100 mt-1 max-w-xl">
                    Complete funnel visibility: prospect acquisition, automatic fit scoring, deal pipeline, and commercial quotations.
                  </p>
                </div>
                {canPerformAction(currentUser.role, 'CREATE') && (
                  <div className="hidden md:flex flex-col items-end space-y-2">
                    <button
                      onClick={() => setIsLeadModalOpen(true)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      + Add New Lead
                    </button>
                    <button
                      onClick={() => setIsDealModalOpen(true)}
                      className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-bold rounded-xl shadow-xs transition"
                    >
                      + Create Deal
                    </button>
                  </div>
                )}
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Total Leads Captured</span>
                    <Users className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900">
                    {analytics?.totalLeads ?? leads.length}
                  </div>
                  <p className="mt-1 text-xs text-emerald-700 font-semibold">
                    Across all channels
                  </p>
                </div>

                <div className="bg-gradient-to-br from-amber-50/60 to-white rounded-2xl p-5 border-2 border-amber-300 shadow-xs">
                  <div className="flex justify-between text-xs font-bold text-amber-900 uppercase">
                    <span className="flex items-center">
                      <Flame className="w-4 h-4 text-amber-500 mr-1 fill-amber-400" />
                      Hot Prospects (≥80)
                    </span>
                    <span className="text-xs bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded font-black">🔥</span>
                  </div>
                  <div className="mt-3 text-3xl font-black text-amber-950">
                    {analytics?.hotLeads ?? leads.filter(l => l.score >= 80).length}
                  </div>
                  <p className="mt-1 text-xs text-amber-800 font-bold">
                    High budget decision makers
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Pipeline Deal Value</span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900">
                    ${(analytics?.totalPipelineValue ?? 0).toLocaleString()}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Active qualified opportunities
                  </p>
                </div>

                <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase">
                    <span>Action Items Pending</span>
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900">
                    {tasks.filter(t => t.status !== 'COMPLETED').length}
                  </div>
                  <p className="mt-1 text-xs text-emerald-700 font-semibold">
                    Follow-ups scheduled
                  </p>
                </div>
              </div>

              {/* Funnel Overview & Recent Leads Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Acquisition Sources */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
                  <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center">
                    <Target className="w-4 h-4 mr-2 text-emerald-600" />
                    Lead Acquisition Channels
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(analytics?.sourceBreakdown || {}).map(([src, cnt]) => (
                      <div key={src} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                        <span className="text-xs font-bold text-slate-800">{src}</span>
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                          {cnt} Prospects
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Priority Follow-ups */}
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center">
                      <Clock className="w-4 h-4 mr-2 text-amber-500" />
                      Immediate Action Items
                    </h3>
                    {canPerformAction(currentUser.role, 'CREATE') && (
                      <button
                        onClick={() => setIsTaskModalOpen(true)}
                        className="text-xs font-bold text-emerald-700 hover:underline"
                      >
                        + Schedule
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    {tasks.slice(0, 3).map((task) => (
                      <div key={task.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="font-bold text-xs text-slate-900 block">{task.title}</span>
                          <span className="text-[11px] text-slate-500">{task.description || 'Priority follow-up'}</span>
                        </div>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${
                          task.priority === 'URGENT' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: LEADS GENERATION & INGESTION */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search prospects by name, company, email or title..."
                    value={leadSearch}
                    onChange={(e) => setLeadSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer px-3 py-2 text-xs font-bold bg-white text-emerald-800 border border-emerald-300 rounded-xl hover:bg-emerald-50 transition flex items-center space-x-1.5 shadow-2xs">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                    <span>📁 Import CSV</span>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const res = await uploadCsvLeads(file);
                            showToast(res.message || 'Leads imported from CSV!');
                            loadData();
                          } catch (err: any) {
                            showToast(err.message || 'Failed to import CSV');
                          }
                        }
                      }}
                    />
                  </label>

                  <button
                    onClick={() => {
                      triggerWebhook({
                        name: 'Vikram SolarTech',
                        email: `inbound_${Date.now().toString().slice(-4)}@solartech.in`,
                        company: 'SolarTech Renewables',
                        title: 'Chief Operating Officer',
                        budget: 42000
                      }).then(() => {
                        showToast('Captured inbound lead via Webhook!');
                        loadData();
                      });
                    }}
                    className="px-3 py-2 text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 rounded-xl hover:bg-amber-200 transition flex items-center space-x-1"
                  >
                    <Webhook className="w-3.5 h-3.5" />
                    <span>⚡ Inbound Lead</span>
                  </button>

                  {canPerformAction(currentUser.role, 'CREATE') && (
                    <button
                      onClick={() => setIsLeadModalOpen(true)}
                      className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
                    >
                      + Add Prospect
                    </button>
                  )}
                </div>
              </div>

              {/* Leads Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 uppercase font-bold text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Company & Contact</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Channel</th>
                      <th className="py-3 px-4 text-center">Fit Score</th>
                      <th className="py-3 px-4">Assigned To</th>
                      <th className="py-3 px-4">Stage</th>
                      <th className="py-3 px-4 text-right">Value</th>
                      <th className="py-3 px-4 text-center">Lifecycle Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leads
                      .filter(l => !leadSearch || `${l.first_name} ${l.company_name} ${l.email} ${l.job_title}`.toLowerCase().includes(leadSearch.toLowerCase()))
                      .map((lead) => (
                        <tr key={lead.id} className="hover:bg-emerald-50/30 transition">
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900">{lead.company_name}</span>
                              {lead.email_tracking_status === 'CLICKED' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-purple-100 text-purple-800 border border-purple-300">
                                  <Target className="w-2.5 h-2.5 mr-1 text-purple-600" /> Clicked Proposal
                                </span>
                              ) : lead.email_tracking_status === 'OPENED' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <Eye className="w-2.5 h-2.5 mr-1 text-emerald-600" /> Opened
                                </span>
                              ) : lead.email_tracking_status === 'SENT' ? (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                                  <Mail className="w-2.5 h-2.5 mr-1" /> Sent
                                </span>
                              ) : null}
                            </div>
                            <div className="text-slate-500 text-[11px]">{lead.first_name} {lead.last_name || ''} · {lead.email}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-700">{lead.job_title || 'N/A'}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold border border-slate-200 text-[10px]">
                              {lead.source}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2.5 py-1 rounded-full font-black text-xs ${
                              lead.score >= 80 ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            }`}>
                              {lead.score >= 80 ? '🔥 ' : ''}{lead.score} / 100
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {currentUser.role === 'SALES_MANAGER' || currentUser.role === 'BUSINESS_OWNER' ? (
                              <select
                                value={lead.assigned_to || ''}
                                onChange={(e) => {
                                  const selectedUser = users.find(u => u.id === e.target.value);
                                  assignLead(lead.id, e.target.value, selectedUser ? `${selectedUser.first_name} ${selectedUser.last_name || ''}`.trim() : 'Unassigned')
                                    .then(() => {
                                      showToast('Lead assigned to team member');
                                      loadData();
                                    });
                                }}
                                className="bg-white border border-slate-300 text-[11px] rounded-lg px-2 py-1 font-semibold text-slate-700 focus:ring-1 focus:ring-emerald-500"
                              >
                                <option value="">Assign rep...</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.first_name} ({u.role})</option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-slate-600 font-medium">
                                {lead.assigned_to_name || 'Unassigned'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={lead.status}
                              disabled={!canPerformAction(currentUser.role, 'EDIT')}
                              onChange={(e) => {
                                updateLeadStage(lead.id, e.target.value).then(() => {
                                  showToast(`Lead status updated to ${e.target.value}`);
                                  loadData();
                                });
                              }}
                              className="bg-emerald-50 text-emerald-900 border border-emerald-200 text-xs font-bold rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                            >
                              <option value="NEW">NEW</option>
                              <option value="CONTACTED">CONTACTED</option>
                              <option value="QUALIFIED">QUALIFIED</option>
                              <option value="CONVERTED">CONVERTED</option>
                              <option value="LOST">LOST</option>
                            </select>
                          </td>
                          <td className="py-3 px-4 text-right font-black text-slate-900">
                            ${Number(lead.budget || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleOpenSendEmail(lead)}
                                title="Send Tracked Email or Proposal to this lead"
                                className="px-2 py-1 text-[11px] font-bold text-emerald-800 hover:text-white bg-emerald-50 hover:bg-emerald-700 border border-emerald-300 rounded-lg shadow-2xs transition flex items-center space-x-1"
                              >
                                <Mail className="w-3 h-3" />
                                <span>Email</span>
                              </button>
                              {lead.status === 'QUALIFIED' ? (
                                <button
                                  onClick={() => {
                                    convertLead(lead.id).then(() => {
                                      showToast(`🚀 Lead converted to Opportunity Deal & Company!`);
                                      loadData();
                                    });
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-amber-950 rounded-lg shadow-xs transition flex items-center space-x-1"
                                >
                                  <span>🚀 Convert</span>
                                </button>
                              ) : lead.status === 'CONVERTED' ? (
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                                  ✓ Converted
                                </span>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: EMAIL OUTREACH & PROPOSAL TRACKING */}
          {activeTab === 'emails' && (
            <div className="space-y-6">
              
              {/* Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-black text-slate-900">Email Outreach & Proposal Tracker</h2>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Live Pixel & Click Detection
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Real-time detection when prospects open emails in their inbox and click on your commercial proposals.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsSmtpModalOpen(true)}
                    className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 border border-slate-700"
                    title="Configure Custom Business Domain & SMTP Server"
                  >
                    <Server className="w-4 h-4 text-emerald-400" />
                    <span>⚙️ Corporate Domain / SMTP</span>
                  </button>
                  <button
                    onClick={() => loadData()}
                    className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-xl border border-slate-200 transition"
                    title="Refresh live tracking data"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                  {canPerformAction(currentUser.role, 'CREATE') && (
                    <button
                      onClick={() => handleOpenSendEmail()}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                    >
                      <Mail className="w-4 h-4" />
                      <span>+ Compose Tracked Email</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Deliverability & Corporate Domain Status Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-4 rounded-2xl text-white shadow-xs border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300 shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">Outbound Email Deliverability Engine</span>
                      <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40 font-semibold">
                        Dual Plain-Text + HTML Active
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Send from your verified corporate domain (e.g. info@evmerp.com) with SPF, DKIM &amp; DMARC to guarantee 98%+ Primary Inbox placement.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsSmtpModalOpen(true)}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shrink-0"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Configure Domain SMTP</span>
                </button>
              </div>

              {/* 4 Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Total Outbound Sent</span>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {emailStats?.totalSent || 0}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">Dispatched to prospects</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Inbox Open Rate</span>
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-emerald-800">{emailStats?.openRate || '0%'}</span>
                    <span className="text-xs text-slate-500">({emailStats?.totalOpened || 0} opened)</span>
                  </div>
                  <div className="text-[11px] text-emerald-700 font-semibold mt-1">Detected via 1x1 tracking pixel</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Proposal Click-Through</span>
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <MousePointerClick className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline space-x-2">
                    <span className="text-2xl font-black text-purple-900">{emailStats?.clickRate || '0%'}</span>
                    <span className="text-xs text-slate-500">({emailStats?.totalClicked || 0} clicks)</span>
                  </div>
                  <div className="text-[11px] text-purple-700 font-semibold mt-1">Viewed proposal document</div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">Proposals Approved</span>
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-2 text-2xl font-black text-amber-900">
                    {emailStats?.totalAccepted || 0}
                  </div>
                  <div className="text-[11px] text-amber-700 font-semibold mt-1">Closed & signed online</div>
                </div>
              </div>

              {/* Testing Sandbox Tool */}
              <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-5 rounded-2xl text-white shadow-md border border-slate-800">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      <h4 className="font-bold text-sm text-white">Live Tracking Sandbox & Simulator</h4>
                    </div>
                    <p className="text-xs text-slate-300 mt-1">
                      Test open and proposal click tracking instantly without waiting for external email inboxes.
                    </p>
                  </div>

                  {trackedEmails.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={async () => {
                          const latest = trackedEmails[0];
                          try {
                            const res = await simulateEmailEvent(latest.tracking_token, 'open');
                            showToast('👁️ Simulated client opening email from inbox! (+10 Fit Score)');
                            loadData();
                          } catch (err: any) {
                            showToast(err.message || 'Simulation failed');
                          }
                        }}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Simulate Inbox Open</span>
                      </button>

                      <button
                        onClick={async () => {
                          const latest = trackedEmails[0];
                          try {
                            const res = await simulateEmailEvent(latest.tracking_token, 'click');
                            showToast('🎯 Simulated client clicking Proposal link! (+20 Fit Score)');
                            loadData();
                          } catch (err: any) {
                            showToast(err.message || 'Simulation failed');
                          }
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                      >
                        <MousePointerClick className="w-3.5 h-3.5" />
                        <span>Simulate Proposal Click</span>
                      </button>

                      {trackedEmails[0]?.proposal_token && (
                        <button
                          onClick={() => {
                            const latest = trackedEmails[0];
                            window.open(`/proposal/${latest.proposal_token}`, '_blank');
                          }}
                          className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-emerald-300 font-bold text-xs rounded-xl border border-emerald-400/30 transition flex items-center space-x-1"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Client Proposal View</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium">Send an email first to enable simulation</span>
                  )}
                </div>
              </div>

              {/* Tracked Outbound Emails Table */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search sent emails by recipient or subject..."
                      value={emailSearch}
                      onChange={(e) => setEmailSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-white"
                    />
                  </div>
                  <div className="text-xs text-slate-500 font-semibold">
                    Showing {trackedEmails.filter(e => !emailSearch || `${e.recipient_email} ${e.recipient_name} ${e.subject}`.toLowerCase().includes(emailSearch.toLowerCase())).length} emails
                  </div>
                </div>

                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 border-b border-slate-200 uppercase font-bold text-slate-600 text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Recipient & Company</th>
                      <th className="py-3 px-4">Subject Line</th>
                      <th className="py-3 px-4">Proposal Attached</th>
                      <th className="py-3 px-4 text-center">Live Tracking Status</th>
                      <th className="py-3 px-4 text-center">Opens</th>
                      <th className="py-3 px-4 text-center">Clicks</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {trackedEmails.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400 text-xs">
                          No tracked emails sent yet. Click <strong>"+ Compose Tracked Email"</strong> above or send an email from any lead row.
                        </td>
                      </tr>
                    ) : (
                      trackedEmails
                        .filter(e => !emailSearch || `${e.recipient_email} ${e.recipient_name} ${e.subject}`.toLowerCase().includes(emailSearch.toLowerCase()))
                        .map((em) => (
                          <tr key={em.id} className="hover:bg-slate-50/50 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{em.recipient_name || em.recipient_email}</div>
                              <div className="text-slate-500 text-[11px]">{em.recipient_email} {em.lead_company ? `· ${em.lead_company}` : ''}</div>
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-800 max-w-xs truncate">
                              {em.subject}
                            </td>
                            <td className="py-3 px-4">
                              {em.proposal_token ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {em.quote_number || 'Proposal'} {em.quote_amount ? `($${Number(em.quote_amount).toLocaleString()})` : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">Direct Message</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {em.status === 'ACCEPTED' ? (
                                <span className="px-2.5 py-1 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  🏆 Proposal Approved
                                </span>
                              ) : em.status === 'CLICKED' ? (
                                <span className="px-2.5 py-1 rounded-full font-black text-[10px] bg-purple-100 text-purple-900 border border-purple-300">
                                  🎯 Proposal Clicked ({em.click_count}x)
                                </span>
                              ) : em.status === 'OPENED' ? (
                                <span className="px-2.5 py-1 rounded-full font-black text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                                  👁️ Opened ({em.open_count}x)
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                  ✉️ Delivered
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-700">
                              {em.open_count > 0 ? (
                                <span className="text-emerald-700 font-bold">{em.open_count}</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-700">
                              {em.click_count > 0 ? (
                                <span className="text-purple-700 font-black">{em.click_count}</span>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end space-x-1.5">
                                {em.proposal_token && (
                                  <a
                                    href={`/proposal/${em.proposal_token}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                                    title="Open Public Proposal Portal"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                                <button
                                  onClick={async () => {
                                    try {
                                      await simulateEmailEvent(em.tracking_token, 'open');
                                      showToast(`Simulated open for ${em.recipient_email}!`);
                                      loadData();
                                    } catch (err: any) {
                                      showToast(err.message);
                                    }
                                  }}
                                  className="px-2 py-1 text-[10px] font-bold text-slate-700 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 rounded-lg transition"
                                  title="Simulate open"
                                >
                                  + Open
                                </button>
                                {em.proposal_token && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        await simulateEmailEvent(em.tracking_token, 'click');
                                        showToast(`Simulated proposal click for ${em.recipient_email}!`);
                                        loadData();
                                      } catch (err: any) {
                                        showToast(err.message);
                                      }
                                    }}
                                    className="px-2 py-1 text-[10px] font-bold text-purple-700 hover:text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                                    title="Simulate click"
                                  >
                                    + Click
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB 3: DEALS PIPELINE (KANBAN) */}
          {activeTab === 'deals' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Visual Sales Pipeline (Kanban)</h2>
                  <p className="text-xs text-slate-500">Multi-stage deal flow with weighted probability values</p>
                </div>
                {canPerformAction(currentUser.role, 'CREATE') && (
                  <button
                    onClick={() => setIsDealModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    + Add Opportunity
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 overflow-x-auto pb-4">
                {stages.map((st, sIndex) => {
                  const stageDeals = deals.filter(d => d.stage_id === st.id || (!d.stage_id && st.name === 'New Leads'));
                  const stageTotal = stageDeals.reduce((sum, d) => sum + Number(d.amount || 0), 0);
                  const nextStage = stages[sIndex + 1];

                  return (
                    <div key={st.id} className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200 flex flex-col min-w-[220px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-xs text-slate-800">{st.name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white text-[11px] font-bold text-slate-600 border border-slate-200">
                          {stageDeals.length}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mb-3 font-semibold">
                        Stage: ${stageTotal.toLocaleString()}
                      </div>

                      <div className="space-y-2.5 flex-1 overflow-y-auto">
                        {stageDeals.map((deal) => (
                          <div key={deal.id} className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition flex flex-col justify-between">
                            <div>
                              <h4 className="font-bold text-xs text-slate-900">{deal.title}</h4>
                              <div className="text-[11px] text-slate-500 mt-0.5">{deal.company_name || 'B2B Account'}</div>
                              <div className="mt-2 flex items-center justify-between text-xs">
                                <span className="font-black text-emerald-800">${Number(deal.amount || 0).toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                                  {deal.probability}% Win
                                </span>
                              </div>
                            </div>

                            {/* Kanban Quick Advancement Actions */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                              {nextStage ? (
                                <button
                                  onClick={() => {
                                    updateDealStage(deal.id, nextStage.id).then(() => {
                                      showToast(`Deal advanced to ${nextStage.name}!`);
                                      loadData();
                                    });
                                  }}
                                  className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 transition"
                                >
                                  Advance &rarr;
                                </button>
                              ) : (
                                <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                  🏆 Won
                                </span>
                              )}

                              <button
                                onClick={() => setIsQuoteModalOpen(true)}
                                title="Create Quotation for Deal"
                                className="text-[10px] text-amber-800 hover:text-amber-900 font-bold hover:underline"
                              >
                                + Quote
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: B2B COMPANIES & ACCOUNTS */}
          {activeTab === 'companies' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">B2B Company Directory</h2>
                  <p className="text-xs text-slate-500">Corporate accounts and key account intelligence</p>
                </div>
                {canPerformAction(currentUser.role, 'CREATE') && (
                  <button
                    onClick={() => setIsCompanyModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add B2B Company</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {companies.map((c) => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 font-black flex items-center justify-center text-sm">
                        {c.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{c.name}</h4>
                        <span className="text-xs text-slate-400">{c.domain || 'Verified Account'}</span>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div>Industry: <span className="font-semibold text-slate-800">{c.industry}</span></div>
                      <div>Size: <span className="font-semibold text-slate-800">{c.size}</span></div>
                      <div>Location: <span className="font-semibold text-slate-800">{c.address || 'Global'}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: DECISION MAKERS / CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Decision Makers Directory</h2>
                  <p className="text-xs text-slate-500">Verified executives, founders, and department heads</p>
                </div>
                {canPerformAction(currentUser.role, 'CREATE') && (
                  <button
                    onClick={() => setIsContactModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Add Decision Maker</span>
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {contacts.map((ct) => (
                  <div key={ct.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
                    <h4 className="font-bold text-sm text-slate-900">{ct.first_name} {ct.last_name || ''}</h4>
                    <span className="text-xs font-bold text-emerald-700 block">{ct.job_title}</span>
                    <span className="text-xs text-slate-500 block mb-2">{ct.company_name}</span>
                    <div className="text-xs text-slate-600 space-y-0.5 border-t border-slate-100 pt-2">
                      <div className="flex items-center text-slate-500"><Mail className="w-3 h-3 mr-1" /> {ct.email}</div>
                      {ct.phone && <div className="flex items-center text-slate-500"><Phone className="w-3 h-3 mr-1" /> {ct.phone}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: TASKS & FOLLOW-UPS */}
          {activeTab === 'tasks' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Tasks & Follow-up Reminders</h2>
                  <p className="text-xs text-slate-500">Scheduled sales calls, demos, and contract reviews</p>
                </div>
                {canPerformAction(currentUser.role, 'CREATE') && (
                  <button
                    onClick={() => setIsTaskModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    + Schedule Task
                  </button>
                )}
              </div>

              <div className="space-y-2.5">
                {tasks.map((task) => (
                  <div key={task.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        checked={task.status === 'COMPLETED'}
                        disabled={!canPerformAction(currentUser.role, 'EDIT')}
                        onChange={() => {
                          const newStatus = task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED';
                          toggleTaskStatus(task.id, newStatus).then(() => {
                            showToast(`Task marked as ${newStatus}`);
                            loadData();
                          });
                        }}
                        className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <h4 className={`font-bold text-xs ${task.status === 'COMPLETED' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </h4>
                        <p className="text-[11px] text-slate-500">{task.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${
                        task.priority === 'URGENT' ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-amber-100 text-amber-800 border-amber-300'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: QUOTES & PRODUCTS */}
          {activeTab === 'quotations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Commercial Quotations & Products</h2>
                  <p className="text-xs text-slate-500">Official proposals, product pricing tiers, and tax calculations</p>
                </div>
                {canPerformAction(currentUser.role, 'CREATE') && (
                  <button
                    onClick={() => setIsQuoteModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    + Generate Quotation
                  </button>
                )}
              </div>

              {/* Product Catalog Cards */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Service & Product Catalog</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map(p => (
                    <div key={p.id} className="bg-white p-4 rounded-2xl border border-slate-200">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-xs text-slate-900">{p.name}</span>
                        <span className="font-black text-emerald-800 text-sm">${Number(p.price).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Generated Quotations */}
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Issued Quotations</h3>
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                      <tr>
                        <th className="p-3">Quote #</th>
                        <th className="p-3">Deal / Opportunity</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 text-right">Total Amount</th>
                        <th className="p-3 text-center">Tracked Outreach</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {quotations.map(q => (
                        <tr key={q.id}>
                          <td className="p-3 font-mono font-bold text-emerald-800">{q.quote_number}</td>
                          <td className="p-3 font-semibold text-slate-700">{q.deal_title || 'Direct Quote'}</td>
                          <td className="p-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-bold">{q.status}</span></td>
                          <td className="p-3 text-right font-black text-slate-900">${Number(q.total_amount).toLocaleString()}</td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleOpenSendEmail(undefined, q.id)}
                              className="px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:text-white bg-emerald-50 hover:bg-emerald-600 border border-emerald-300 rounded-lg shadow-2xs transition inline-flex items-center space-x-1"
                            >
                              <Mail className="w-3 h-3" />
                              <span>Send Proposal</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: TEAM & RBAC */}
          {activeTab === 'team' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Team Members & Role-Based Access (RBAC)</h2>
                  <p className="text-xs text-slate-500">Configured permissions for {activeTenantName}</p>
                </div>
                {canPerformAction(currentUser.role, 'CREATE') && (
                  <button
                    onClick={() => setIsTeamModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>+ Add Team Member</span>
                  </button>
                )}
              </div>
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                    <tr>
                      <th className="p-3">User Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">RBAC Role</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map(u => (
                      <tr key={u.id}>
                        <td className="p-3 font-bold text-slate-900">{u.first_name} {u.last_name || ''}</td>
                        <td className="p-3 text-slate-600">{u.email}</td>
                        <td className="p-3">
                          <span className="px-2.5 py-1 rounded-lg font-black text-[10px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3"><span className="text-emerald-700 font-bold">Active</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 9: MULTI-TENANT SAAS MANAGEMENT */}
          {activeTab === 'tenants' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-900">Multi-Tenant Business Registry</h2>
                  <p className="text-xs text-slate-500">Manage client business tenants with complete data isolation</p>
                </div>
                {currentUser.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => setIsTenantModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                  >
                    + Onboard Client Business
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tenants.map(t => (
                  <div key={t.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-base text-slate-900">{t.name}</h4>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                          {t.plan}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-mono">Workspace Slug: {t.slug}</div>
                      <div className="text-xs text-slate-400 mt-1">Tenant ID: {t.id}</div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-emerald-700 font-bold">● Isolated PostgreSQL Database</span>
                      <button
                        onClick={() => handleSelectTenant(t.id)}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition"
                      >
                        Enter Workspace &rarr;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Modals */}
      <TenantModal
        isOpen={isTenantModalOpen}
        onClose={() => setIsTenantModalOpen(false)}
        onTenantCreated={() => {
          showToast('New client business tenant onboarded!');
          loadData();
        }}
      />

      <LeadModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        onLeadCreated={() => {
          showToast('Lead captured and scored!');
          loadData();
        }}
      />

      <DealModal
        isOpen={isDealModalOpen}
        onClose={() => setIsDealModalOpen(false)}
        onDealCreated={() => {
          showToast('New sales deal opportunity created!');
          loadData();
        }}
        companies={companies}
        contacts={contacts}
      />

      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onTaskCreated={() => {
          showToast('Follow-up task scheduled!');
          loadData();
        }}
      />

      <QuoteModal
        isOpen={isQuoteModalOpen}
        onClose={() => setIsQuoteModalOpen(false)}
        onQuoteCreated={() => {
          showToast('Commercial quotation generated!');
          loadData();
        }}
        products={products}
        deals={deals}
      />

      <SendEmailModal
        isOpen={isSendEmailModalOpen}
        onClose={() => setIsSendEmailModalOpen(false)}
        onEmailSent={(msg) => {
          showToast(msg || 'Tracked email successfully dispatched!');
          loadData();
        }}
        targetLead={emailTargetLead}
        quotations={quotations}
        preselectedQuoteId={emailPreselectedQuoteId}
      />

      <CompanyModal
        isOpen={isCompanyModalOpen}
        onClose={() => setIsCompanyModalOpen(false)}
        onCompanyCreated={() => {
          showToast('New B2B company added!');
          loadData();
        }}
      />

      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onContactCreated={() => {
          showToast('New decision maker contact added!');
          loadData();
        }}
        companies={companies}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onUserCreated={() => {
          showToast('New team member invited and activated!');
          loadData();
        }}
      />

      <SmtpSettingsModal
        isOpen={isSmtpModalOpen}
        onClose={() => setIsSmtpModalOpen(false)}
        onSettingsSaved={() => {
          showToast('Corporate domain SMTP configuration updated!');
          loadData();
        }}
      />

    </div>
  );
}
