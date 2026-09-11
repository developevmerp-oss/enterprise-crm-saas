'use client';

import React from 'react';
import {
  BarChart3,
  Flame,
  Kanban,
  Building2,
  Users2,
  CheckSquare,
  FileText,
  ShieldAlert,
  Globe2,
  Sparkles,
  ChevronRight,
  Lock,
  Mail
} from 'lucide-react';
import { UserRole } from '../types';
import { canAccessModule } from '../lib/auth';

export type NavTab =
  | 'dashboard'
  | 'leads'
  | 'emails'
  | 'deals'
  | 'companies'
  | 'contacts'
  | 'tasks'
  | 'quotations'
  | 'team'
  | 'tenants';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  userRole: UserRole;
  tenantName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userRole,
  tenantName
}) => {
  const allNavItems = [
    { id: 'dashboard' as NavTab, label: 'Executive Dashboard', icon: BarChart3 },
    { id: 'leads' as NavTab, label: 'Lead Gen & Ingestion', icon: Flame, badge: 'Scoring' },
    { id: 'emails' as NavTab, label: 'Email & Proposal Tracker', icon: Mail, badge: 'Live Pixel' },
    { id: 'deals' as NavTab, label: 'Sales Funnel (Kanban)', icon: Kanban },
    { id: 'companies' as NavTab, label: 'B2B Companies', icon: Building2 },
    { id: 'contacts' as NavTab, label: 'Decision Makers', icon: Users2 },
    { id: 'tasks' as NavTab, label: 'Tasks & Follow-ups', icon: CheckSquare },
    { id: 'quotations' as NavTab, label: 'Quotes & Products', icon: FileText },
    { id: 'team' as NavTab, label: 'Team & RBAC Roles', icon: ShieldAlert },
    { id: 'tenants' as NavTab, label: 'Multi-Tenant SaaS', icon: Globe2 }
  ];

  // Strictly filter items based on user role permissions
  const authorizedNavItems = allNavItems.filter((item) => canAccessModule(userRole, item.id));

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col flex-shrink-0 min-h-screen">
      {/* Brand Logo */}
      <div className="p-5 border-b border-slate-100 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center text-white shadow-md shadow-emerald-700/20">
          <Sparkles className="w-5 h-5 text-amber-300" />
        </div>
        <div>
          <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
            Lead<span className="text-emerald-600">Pulse</span>
          </h1>
          <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase mt-1 inline-block">
            Enterprise SaaS
          </span>
        </div>
      </div>

      {/* Active Workspace Info */}
      <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-100">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
          Current Workspace
        </span>
        <div className="flex items-center justify-between mt-0.5">
          <span className="text-xs font-bold text-emerald-900 truncate max-w-[170px]">
            {tenantName}
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Accessible Modules ({authorizedNavItems.length})
        </div>

        {authorizedNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/20'
                  : 'text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/60'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-amber-300' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && !isActive && (
                <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded font-bold">
                  {item.badge}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-white/80" />}
            </button>
          );
        })}

        {/* Modules hidden due to RBAC */}
        {allNavItems.length - authorizedNavItems.length > 0 && (
          <div className="pt-3 px-3">
            <div className="p-2 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-[10px] text-slate-400 flex items-center space-x-1.5">
              <Lock className="w-3 h-3 text-slate-400 flex-shrink-0" />
              <span>{allNavItems.length - authorizedNavItems.length} modules restricted by RBAC</span>
            </div>
          </div>
        )}
      </nav>

      {/* User Role Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-semibold">Active Role:</span>
          <span className="px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-900 border border-emerald-300 text-[10px]">
            {userRole}
          </span>
        </div>
      </div>
    </aside>
  );
};

