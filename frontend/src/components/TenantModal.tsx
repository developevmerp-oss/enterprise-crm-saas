'use client';

import React, { useState } from 'react';
import { X, Building2, Sparkles } from 'lucide-react';
import { createTenant } from '../lib/api';

interface TenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantCreated: () => void;
}

export const TenantModal: React.FC<TenantModalProps> = ({
  isOpen,
  onClose,
  onTenantCreated
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState('Pro Business');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !slug) {
      setErrorMsg('Business Name and Workspace Slug are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await createTenant({ name, slug, plan });
      onTenantCreated();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to onboard tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        <div className="bg-emerald-700 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-amber-300">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Onboard New Business Tenant</h3>
              <p className="text-[11px] text-emerald-100">
                Creates an isolated database workspace in PostgreSQL
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Business / Company Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Zenith Tech Solutions"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
              }}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Workspace Identifier (Slug) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. zenith-tech"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              SaaS Subscription Plan
            </label>
            <select
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="Starter Trial">Starter Trial</option>
              <option value="Pro Business">Pro Business ($99/mo)</option>
              <option value="Enterprise Growth">Enterprise Growth ($299/mo)</option>
              <option value="Custom Unlimited">Custom Unlimited</option>
            </select>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-300 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition disabled:opacity-50"
            >
              {isSubmitting ? 'Provisioning...' : 'Provision Tenant'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
