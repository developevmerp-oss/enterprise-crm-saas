'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Server,
  Send,
  CheckCircle2,
  AlertCircle,
  Key,
  Globe,
  Mail,
  Copy,
  Check,
  Sparkles,
  Info
} from 'lucide-react';
import { SmtpSettings, fetchEmailSettings, saveEmailSettings, testEmailSettings } from '../lib/api';

interface SmtpSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export const SmtpSettingsModal: React.FC<SmtpSettingsModalProps> = ({
  isOpen,
  onClose,
  onSettingsSaved
}) => {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [secure, setSecure] = useState(false);
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [fromName, setFromName] = useState('Enterprise Solutions Team');
  const [fromEmail, setFromEmail] = useState('');
  const [domain, setDomain] = useState('');
  const [testRecipient, setTestRecipient] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setStatusMessage(null);

    fetchEmailSettings()
      .then((data) => {
        if (data.smtp) {
          setHost(data.smtp.host || '');
          setPort(String(data.smtp.port || '587'));
          setSecure(!!data.smtp.secure);
          setUser(data.smtp.user || '');
          setPass(data.smtp.pass || '');
          setFromName(data.smtp.from_name || 'Enterprise Solutions Team');
          setFromEmail(data.smtp.from_email || data.smtp.user || '');
          setDomain(data.smtp.domain || (data.smtp.user?.split('@')[1] || ''));
        } else if (data.system_default) {
          setHost(data.system_default.host || '');
          setPort(String(data.system_default.port || '587'));
          setUser(data.system_default.from_email || '');
          setFromEmail(data.system_default.from_email || '');
          setFromName(data.system_default.from_name || 'Enterprise Solutions Team');
          setDomain(data.system_default.from_email?.split('@')[1] || '');
        }
      })
      .catch((err) => {
        setStatusMessage({ type: 'error', text: err.message || 'Failed to load SMTP settings' });
      })
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const applyPreset = (preset: 'GMAIL' | 'OUTLOOK' | 'ZOHO' | 'RESEND') => {
    if (preset === 'GMAIL') {
      setHost('smtp.gmail.com');
      setPort('587');
      setSecure(false);
    } else if (preset === 'OUTLOOK') {
      setHost('smtp.office365.com');
      setPort('587');
      setSecure(false);
    } else if (preset === 'ZOHO') {
      setHost('smtp.zoho.com');
      setPort('465');
      setSecure(true);
    } else if (preset === 'RESEND') {
      setHost('smtp.resend.com');
      setPort('587');
      setSecure(false);
      setUser('resend');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setStatusMessage(null);

      const payload: SmtpSettings = {
        host: host.trim(),
        port: parseInt(port || '587', 10),
        secure,
        user: user.trim(),
        pass: pass.trim(),
        from_name: fromName.trim(),
        from_email: fromEmail.trim() || user.trim(),
        domain: domain.trim() || (user.includes('@') ? user.split('@')[1] : '')
      };

      const res = await saveEmailSettings(payload);
      setStatusMessage({ type: 'success', text: res.message || 'Custom SMTP settings saved successfully!' });
      if (onSettingsSaved) onSettingsSaved();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to save SMTP settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setStatusMessage(null);

      const payload = {
        host: host.trim(),
        port: parseInt(port || '587', 10),
        secure,
        user: user.trim(),
        pass: pass.trim(),
        from_name: fromName.trim(),
        from_email: fromEmail.trim() || user.trim(),
        test_recipient: testRecipient.trim() || user.trim()
      };

      const res = await testEmailSettings(payload);
      setStatusMessage({
        type: 'success',
        text: `Handshake Passed! ${res.message}`
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'SMTP Connection Test Failed'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const detectedDomain = domain || (user.includes('@') ? user.split('@')[1] : 'yourdomain.com');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base flex items-center gap-2">
                Custom Domain & SMTP Deliverability Hub
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40">
                  Primary Inbox Engine
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                Connect your authentic business domain (e.g. info@evmerp.com) to achieve 98%+ Inbox placement.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {statusMessage && (
          <div className={`m-6 mb-0 p-3.5 rounded-2xl border text-xs flex items-start space-x-2.5 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Quick Provider Presets */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Select Your Email Provider Preset:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => applyPreset('GMAIL')}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 text-center transition"
              >
                Google / Gmail
              </button>
              <button
                type="button"
                onClick={() => applyPreset('OUTLOOK')}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 text-center transition"
              >
                Microsoft 365
              </button>
              <button
                type="button"
                onClick={() => applyPreset('ZOHO')}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 text-center transition"
              >
                Zoho Mail
              </button>
              <button
                type="button"
                onClick={() => applyPreset('RESEND')}
                className="px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-bold text-slate-700 text-center transition"
              >
                Resend / SendGrid
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            
            {/* Identity Group */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" />
                1. Outbound Corporate Identity
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">From / Sender Display Name *</label>
                  <input
                    type="text"
                    required
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    placeholder="e.g. Jack | EVM ERP"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">From Business Email *</label>
                  <input
                    type="email"
                    required
                    value={fromEmail}
                    onChange={(e) => {
                      setFromEmail(e.target.value);
                      if (e.target.value.includes('@')) {
                        setDomain(e.target.value.split('@')[1]);
                      }
                    }}
                    placeholder="e.g. info@evmerp.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium text-slate-900"
                  />
                </div>
              </div>
            </div>

            {/* SMTP Server Group */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-blue-600" />
                2. SMTP Server Credentials
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">SMTP Host Server *</label>
                  <input
                    type="text"
                    required
                    value={host}
                    onChange={(e) => setHost(e.target.value)}
                    placeholder="smtp.gmail.com or smtp.office365.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Port</label>
                  <input
                    type="text"
                    required
                    value={port}
                    onChange={(e) => setPort(e.target.value)}
                    placeholder="587 or 465"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Username / Email *</label>
                  <input
                    type="text"
                    required
                    value={user}
                    onChange={(e) => setUser(e.target.value)}
                    placeholder="info@evmerp.com"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Password / App Password *</span>
                    <span className="text-[10px] text-slate-400">Masked</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="secure_ssl"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="secure_ssl" className="text-xs text-slate-700 font-medium">
                  Use Direct SSL / TLS encryption (mandatory for port 465)
                </label>
              </div>
            </div>

            {/* Test Connection Probe Section */}
            <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-3">
              <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                3. Deliverability Test Probe
              </h4>
              <p className="text-[11px] text-emerald-800">
                Send an immediate live verification handshake to test your mail server credentials and SPF/DKIM acceptance.
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(e) => setTestRecipient(e.target.value)}
                  placeholder="Enter test recipient email (e.g. colleague@company.com)"
                  className="flex-1 px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting || !host || !user}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 disabled:bg-emerald-300 text-white font-bold text-xs rounded-xl transition flex items-center justify-center space-x-1.5 shrink-0"
                >
                  {isTesting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Probe Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* DNS Records Guide for 100% Inbox Placement */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  Recommended DNS Records for {detectedDomain}
                </h4>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  99% Inbox Delivery
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                To guarantee corporate filters (Microsoft 365 &amp; Google Workspace) never flag your emails as spam, ensure these TXT records exist in your domain DNS:
              </p>

              <div className="space-y-2 text-xs font-mono">
                {/* SPF */}
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-sans">SPF Record (TXT @)</div>
                    <div className="text-emerald-300">v=spf1 include:_spf.google.com ~all</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('v=spf1 include:_spf.google.com ~all', 'spf')}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    {copiedKey === 'spf' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* DMARC */}
                <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400 font-sans">DMARC Record (TXT _dmarc)</div>
                    <div className="text-emerald-300">v=DMARC1; p=none; sp=none;</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy('v=DMARC1; p=none; sp=none;', 'dmarc')}
                    className="text-slate-400 hover:text-white p-1"
                  >
                    {copiedKey === 'dmarc' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Save Corporate SMTP Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
