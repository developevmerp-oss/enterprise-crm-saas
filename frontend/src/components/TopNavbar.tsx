'use client';

import React from 'react';
import {
  Building2,
  Shield,
  Plus,
  Database,
  RefreshCw,
  LogOut,
  UserCheck
} from 'lucide-react';
import { Tenant, UserRole } from '../types';
import { AuthUser } from '../lib/auth';

interface TopNavbarProps {
  tenants: Tenant[];
  activeTenantId: string;
  onSelectTenant: (id: string) => void;
  onOpenNewTenant: () => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
  onRefresh: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  tenants,
  activeTenantId,
  onSelectTenant,
  onOpenNewTenant,
  currentUser,
  onLogout,
  onRefresh
}) => {
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';

  const getRoleBadgeStyle = (role?: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'BUSINESS_OWNER':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'SALES_MANAGER':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'SALES_EXECUTIVE':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'MARKETING_MANAGER':
        return 'bg-pink-100 text-pink-900 border-pink-300';
      case 'VIEWER':
        return 'bg-slate-100 text-slate-700 border-slate-300';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN': return '👑';
      case 'BUSINESS_OWNER': return '🏢';
      case 'SALES_MANAGER': return '📊';
      case 'SALES_EXECUTIVE': return '🎯';
      case 'MARKETING_MANAGER': return '📣';
      case 'VIEWER': return '👁️';
      default: return '👤';
    }
  };

  const userInitials = currentUser
    ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase()
    : 'U';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      
      {/* Left: Tenant Switcher (Super Admin) or Tenant Label (Tenant Members) */}
      <div className="flex items-center space-x-3">
        {isSuperAdmin ? (
          <div className="flex items-center space-x-2 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200">
            <Building2 className="w-4 h-4 text-emerald-600 ml-1" />
            <span className="text-xs font-bold text-slate-500 hidden sm:inline">Tenant Switcher:</span>
            <select
              value={activeTenantId}
              onChange={(e) => onSelectTenant(e.target.value)}
              className="bg-white px-2.5 py-1 rounded-lg text-xs font-bold text-slate-800 border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xs"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.plan})
                </option>
              ))}
            </select>

            {/* Onboard new tenant button */}
            <button
              onClick={onOpenNewTenant}
              title="Onboard New Tenant Business"
              className="p-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Workspace: <strong className="text-slate-900">{currentUser?.tenant_name || 'Primary Workspace'}</strong></span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
              {currentUser?.tenant_plan || 'Active'}
            </span>
          </div>
        )}
      </div>

      {/* Right: Authenticated User Profile, Role Badge, Database Status & Sign Out */}
      <div className="flex items-center space-x-3">
        {/* Database Status Indicator */}
        <div className="hidden xl:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-300 text-xs font-bold">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>PostgreSQL 18</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
        </div>

        {/* Authenticated User Profile Pill */}
        {currentUser && (
          <div className="flex items-center space-x-2.5 bg-slate-50/90 pl-2 pr-3 py-1 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-700 text-white font-black text-xs flex items-center justify-center shadow-xs">
              {userInitials}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-extrabold text-slate-800 flex items-center space-x-1.5">
                <span>{currentUser.first_name} {currentUser.last_name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-black ${getRoleBadgeStyle(currentUser.role)}`}>
                  {getRoleIcon(currentUser.role)} {currentUser.role}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-medium">
                {currentUser.email}
              </div>
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-2 rounded-xl text-slate-500 hover:text-emerald-700 bg-white border border-slate-200 hover:bg-slate-50 transition shadow-xs"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Sign Out Button */}
        <button
          onClick={onLogout}
          title="Sign Out"
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200 text-xs font-bold transition shadow-xs"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>

    </header>
  );
};

