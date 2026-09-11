'use client';

import React, { useState } from 'react';
import { X, UserPlus, Mail, Lock, Shield, User, Sparkles } from 'lucide-react';
import { createUser } from '../lib/api';
import { UserRole } from '../types';

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

const ROLE_OPTIONS: { id: UserRole; title: string; desc: string; badgeColor: string }[] = [
  {
    id: 'BUSINESS_OWNER',
    title: 'Business Owner',
    desc: 'Full tenant administration & financial control',
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300'
  },
  {
    id: 'SALES_MANAGER',
    title: 'Sales Manager',
    desc: 'Pipeline overview, deal closing, team lead allocation',
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300'
  },
  {
    id: 'SALES_EXECUTIVE',
    title: 'Sales Executive',
    desc: 'Manage assigned leads, pipeline stages, and follow-up tasks',
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300'
  },
  {
    id: 'MARKETING_MANAGER',
    title: 'Marketing Manager',
    desc: 'Lead generation, inbound webhooks, forms, and fit scoring',
    badgeColor: 'bg-pink-100 text-pink-900 border-pink-300'
  },
  {
    id: 'VIEWER',
    title: 'Viewer (Read-Only)',
    desc: 'Audit view across CRM without modification rights',
    badgeColor: 'bg-slate-100 text-slate-800 border-slate-300'
  }
];

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  onUserCreated
}) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('admin123');
  const [role, setRole] = useState<UserRole>('SALES_EXECUTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await createUser({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        role
      });
      onUserCreated();
      onClose();
      // Reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPassword('admin123');
      setRole('SALES_EXECUTIVE');
    } catch (err: any) {
      setError(err.message || 'Failed to add team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-black text-base">Add Workspace Team Member</h3>
              <p className="text-xs text-emerald-100">Grant role-based access to your CRM organization</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-emerald-100 hover:text-white hover:bg-emerald-800/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                First Name *
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g. Siddharth"
                  className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="e.g. Mehta"
                className="w-full px-3 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Work Email Address *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="siddharth@scaloy.com"
                className="w-full pl-9 pr-3 py-2.5 text-xs font-semibold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Login Password *
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Initial password for login"
                className="w-full pl-9 pr-3 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50"
              />
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">
              Default preset: admin123 (User can log in immediately after creation)
            </span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Assigned RBAC Role *
            </label>
            <div className="space-y-2">
              {ROLE_OPTIONS.map((opt) => (
                <label
                  key={opt.id}
                  className={`flex items-start p-2.5 rounded-xl border cursor-pointer transition ${
                    role === opt.id
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-2xs'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={opt.id}
                    checked={role === opt.id}
                    onChange={() => setRole(opt.id)}
                    className="mt-1 mr-3 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-slate-800">{opt.title}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-black ${opt.badgeColor}`}>
                        {opt.id}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{loading ? 'Adding Member...' : 'Create & Activate Team Member'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
