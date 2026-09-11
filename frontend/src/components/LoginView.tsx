'use client';

import React, { useState } from 'react';
import { Sparkles, Shield, Lock, Mail, ArrowRight, CheckCircle2, AlertCircle, Building2 } from 'lucide-react';
import { loginUser } from '../lib/api';
import { saveAuthSession, AuthUser } from '../lib/auth';
import { UserRole } from '../types';

interface LoginViewProps {
  onLoginSuccess: (user: AuthUser) => void;
}

const DEMO_ACCOUNTS: { role: UserRole; label: string; email: string; desc: string; icon: string }[] = [
  {
    role: 'SUPER_ADMIN',
    label: 'Super Admin',
    email: 'admin@scaloy.com',
    desc: 'Platform Owner · Cross-Tenant SaaS Registry',
    icon: '👑'
  },
  {
    role: 'BUSINESS_OWNER',
    label: 'Business Owner',
    email: 'owner@scaloy.com',
    desc: 'Scaloy Admin · Full Tenant Operations & Financials',
    icon: '🏢'
  },
  {
    role: 'SALES_MANAGER',
    label: 'Sales Manager',
    email: 'manager@scaloy.com',
    desc: 'Deals, Funnels, Quotes, Team Lead Allocation',
    icon: '📊'
  },
  {
    role: 'SALES_EXECUTIVE',
    label: 'Sales Executive',
    email: 'sales@scaloy.com',
    desc: 'Assigned Leads, Pipeline Deals, Follow-ups',
    icon: '🎯'
  },
  {
    role: 'MARKETING_MANAGER',
    label: 'Marketing Manager',
    email: 'marketing@scaloy.com',
    desc: 'Inbound Webhooks, Forms, Campaigns & Scoring',
    icon: '📣'
  },
  {
    role: 'BUSINESS_OWNER',
    label: 'Apex Logistics (Tenant 2)',
    email: 'owner@apexlogistics.com',
    desc: 'Isolated Client Workspace Demo',
    icon: '🚚'
  }
];

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('admin@scaloy.com');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await loginUser(email, password);
      if (res.token && res.user) {
        saveAuthSession(res.token, res.user);
        onLoginSuccess(res.user);
      } else {
        setError('Authentication failed. Please check credentials.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to authentication service.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('admin123');
    setError(null);
    setLoading(true);

    try {
      const res = await loginUser(demoEmail, 'admin123');
      if (res.token && res.user) {
        saveAuthSession(res.token, res.user);
        onLoginSuccess(res.user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate demo user.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-slate-900 to-emerald-950 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-12">
      {/* Brand Header */}
      <div className="text-center max-w-lg mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 text-white shadow-xl shadow-emerald-500/20 mb-4 border border-emerald-400/30">
          <Sparkles className="w-8 h-8 text-amber-300" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
          Lead<span className="text-emerald-400">Pulse</span> Enterprise
        </h1>
        <p className="mt-2 text-sm text-emerald-200/90 font-medium">
          Multi-Tenant B2B CRM & Lead Generation Platform with Role-Based Access Control
        </p>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden">
        {/* Top Header Strip */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black tracking-wide">Workspace Sign In</h2>
            <p className="text-xs text-emerald-100 font-medium">Authenticate to access your assigned modules</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-800/60 border border-emerald-400/40 flex items-center justify-center text-amber-300">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start space-x-2.5 text-xs font-semibold animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Work Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium text-slate-900 bg-slate-50/50 hover:bg-white transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-lg shadow-emerald-700/25 flex items-center justify-center space-x-2 transition transform active:scale-[0.99] disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying Credentials...</span>
            ) : (
              <>
                <span>Sign In with Role Security</span>
                <ArrowRight className="w-4 h-4 text-amber-300" />
              </>
            )}
          </button>
        </form>

        {/* Demo Roles Quick Login Tray */}
        <div className="px-6 sm:px-8 pb-7 pt-2 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Quick Role Switch (1-Click Demo Login)
            </span>
            <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full">
              PW: admin123
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickLogin(acc.email)}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:bg-emerald-50/40 text-left transition group shadow-2xs"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-base">{acc.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-800">
                      {acc.label}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[240px]">
                      {acc.desc}
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono text-emerald-600 font-bold group-hover:underline">
                  Log in →
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer System Specs */}
      <div className="mt-8 flex items-center space-x-6 text-xs text-emerald-200/70 font-medium">
        <div className="flex items-center space-x-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>PostgreSQL 18 Multi-Tenant Isolation</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <Shield className="w-4 h-4 text-amber-400" />
          <span>Strict RBAC Security Rules</span>
        </div>
      </div>
    </div>
  );
};
