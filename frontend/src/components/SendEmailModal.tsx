'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Mail, Send, FileText, CheckCircle2, Eye, Sparkles, AlertCircle, ShieldCheck, ShieldAlert, Check } from 'lucide-react';
import { Lead, Quotation } from '../types';
import { sendEmail } from '../lib/api';

interface SendEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEmailSent: (msg?: string) => void;
  targetLead?: Lead | null;
  quotations: Quotation[];
  preselectedQuoteId?: string;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({
  isOpen,
  onClose,
  onEmailSent,
  targetLead,
  quotations,
  preselectedQuoteId
}) => {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [senderName, setSenderName] = useState('Enterprise Solutions Team');
  const [deliverabilityMode, setDeliverabilityMode] = useState<'HIGH_INBOX' | 'FULL_TRACKING'>('HIGH_INBOX');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState(preselectedQuoteId || '');
  const [template, setTemplate] = useState<'PROPOSAL' | 'THREAD_FOLLOWUP' | 'FOLLOWUP' | 'CUSTOM'>('PROPOSAL');
  const [previewMode, setPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedQuote = quotations.find((q) => q.id === selectedQuoteId);

  // Real-time Anti-Spam Scanner
  const spamAnalysis = useMemo(() => {
    const triggerWords = [
      'free', 'guarantee', 'guaranteed', '100%', 'urgent', 'act now', 'winner', 
      'risk-free', 'risk free', 'make money', 'cash bonus', 'cheap', 'lowest price', '$$$',
      'click below', 'no catch', 'congratulations'
    ];
    const fullText = `${subject} ${bodyText}`.toLowerCase();
    const foundTriggers = triggerWords.filter(w => fullText.includes(w));
    const isAllCapsSubject = subject.length > 5 && subject === subject.toUpperCase() && /[A-Z]/.test(subject);
    
    let score = 100;
    if (foundTriggers.length > 0) score -= foundTriggers.length * 15;
    if (isAllCapsSubject) score -= 30;
    if (score < 30) score = 30;

    return {
      score,
      foundTriggers,
      isAllCapsSubject,
      isOptimal: score >= 90
    };
  }, [subject, bodyText]);

  useEffect(() => {
    if (targetLead) {
      setRecipientEmail(targetLead.email || '');
      setRecipientName(`${targetLead.first_name} ${targetLead.last_name || ''}`.trim());
    }
    if (preselectedQuoteId) {
      setSelectedQuoteId(preselectedQuoteId);
    } else if (quotations.length > 0 && template === 'PROPOSAL' && !selectedQuoteId) {
      setSelectedQuoteId(quotations[0].id);
    }
  }, [targetLead, preselectedQuoteId, quotations, template, selectedQuoteId]);

  // Apply template defaults matching authentic executive emails
  useEffect(() => {
    const name = recipientName || targetLead?.first_name || 'Mark';
    const comp = targetLead?.company_name || 'your company';
    const qNum = selectedQuote ? selectedQuote.quote_number : 'QT-2026-002';
    const qAmt = selectedQuote ? `$${Number(selectedQuote.total_amount).toLocaleString()}` : '$65,000';

    if (template === 'PROPOSAL') {
      setSubject(`Enterprise ERP & Automation Platform - ${comp} [${qNum}]`);
      setBodyText(
        `Dear ${name},\n\n` +
        `I recently came across ${comp} and wanted to reach out regarding your business operations.\n\n` +
        `We are a dedicated technology team, and we have developed an enterprise operations & CRM management platform designed specifically for growing businesses in ${targetLead?.industry || 'your industry'}.\n\n` +
        `Looking at ${comp}'s operations, I believe there could be a strong fit. Our platform can help manage:\n` +
        `• Sales pipeline and multi-channel lead tracking\n` +
        `• Field planning, scheduling and team activity logs\n` +
        `• Resource management, machinery and asset tracking\n` +
        `• Digital quotations, commercial proposals and contract closing\n` +
        `• Financial records, approvals and real-time executive dashboards\n\n` +
        `Based on your requirements, our team has prepared an itemized commercial proposal valued at ${qAmt}.\n\n` +
        `I would be happy to give you a quick 20-minute demo and show how it could work specifically for ${comp}.\n\n` +
        `Would you be available for a short call this week or next?\n\n` +
        `Best regards,\n` +
        `Enterprise Solutions Team`
      );
    } else if (template === 'THREAD_FOLLOWUP') {
      // 2nd follow-up email with previous thread quote below (matches your exact screenshot)
      setSubject(`Re: Enterprise ERP & Automation Platform - ${comp}`);
      setBodyText(
        `Hi ${name},\n\n` +
        `Just following up on my previous email regarding our operations platform and its potential fit for ${comp}.\n\n` +
        `We've successfully delivered several large and complex software projects, and our platform is built using modern technologies with AI-powered capabilities to help businesses improve operational visibility, reporting and decision-making.\n\n` +
        `The platform is also fully customisable and cost-effective, so you only invest in the modules and features your operation actually needs.\n\n` +
        `I'd be happy to give you a quick 20-minute demo and show how it could work specifically for ${comp}.\n\n` +
        `Would you be available for a short call this week or next?\n\n` +
        `Best regards,\n` +
        `Enterprise Solutions Team\n\n` +
        `On Tue, Sep 8, 2026 at 4:52 PM Enterprise Solutions Team wrote:\n` +
        `Dear ${name},\n\n` +
        `I recently came across ${comp} and wanted to reach out regarding your operations.\n\n` +
        `We are a technology team, and we have developed an operations management platform designed specifically for field-based and growing enterprises.\n\n` +
        `Looking at ${comp}'s operations, I believe there could be a good fit. Our platform can help manage:\n` +
        `• Land and operational activities\n` +
        `• Field planning and scheduling\n` +
        `• Employees and team accountability\n` +
        `• Commercial proposals and executive reporting\n\n` +
        `We have attached an itemized commercial proposal valued at ${qAmt} [${qNum}].`
      );
    } else if (template === 'FOLLOWUP') {
      setSubject(`Quick Follow-up regarding ${comp}'s Growth Roadmap`);
      setBodyText(
        `Hi ${name},\n\n` +
        `I wanted to check in following up on our previous note. We recently helped several peers in ${targetLead?.industry || 'your sector'} increase their operational pipeline velocity by over 40%.\n\n` +
        `Would you be open to a quick 10-minute chat this Thursday or Friday to see if this aligns with ${comp}'s priorities?\n\n` +
        `Best regards,\n` +
        `Enterprise Solutions Team`
      );
    }
  }, [template, recipientName, targetLead, selectedQuote]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail || !subject || !bodyText) {
      setErrorMsg('Recipient email, subject, and message are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      // Clean, native corporate email formatting (matches Gmail/Outlook native look without fake cards)
      const formattedHtml = `
        <div style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.6; color: #222222; margin: 0; padding: 0;">
          ${bodyText.split('\n\n').map(p => {
            if (p.startsWith('On ') && p.includes('wrote:')) {
              return `<div style="margin: 22px 0 10px 0; color: #555555; font-size: 13px; border-left: 2px solid #cbd5e1; padding-left: 10px;">${p.replace(/\n/g, '<br/>')}</div>`;
            }
            if (p.includes('• ') || p.includes('- ')) {
              return `<div style="margin: 4px 0 12px 14px; font-size: 14px; line-height: 1.6;">${p.replace(/\n/g, '<br/>')}</div>`;
            }
            return `<p style="margin: 0 0 14px 0; font-size: 14px; line-height: 1.6;">${p.replace(/\n/g, '<br/>')}</p>`;
          }).join('')}
        </div>
      `;

      const res = await sendEmail({
        lead_id: targetLead?.id,
        quotation_id: selectedQuoteId || undefined,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject,
        body_html: formattedHtml,
        body_text: bodyText,
        sender_name: senderName,
        deliverability_mode: deliverabilityMode,
        track_opens: deliverabilityMode === 'FULL_TRACKING'
      });

      onEmailSent(res.message || 'Email successfully dispatched!');
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch email');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-emerald-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base flex items-center gap-2">
                Send 1-to-1 Corporate Outreach
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40 font-semibold">
                  {deliverabilityMode === 'HIGH_INBOX' ? '🛡️ Max Inbox Deliverability' : '📊 Full Tracking Active'}
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200/80">
                100% human-crafted format. RFC 2046 dual-format (Plain-Text + HTML) prevents automated spam filtering.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/50 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="m-6 mb-0 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Navigation Tabs (Compose vs Preview) */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50/50 gap-3">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`pb-2.5 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${
              !previewMode
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Compose Email</span>
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`pb-2.5 text-xs font-bold transition flex items-center space-x-1.5 border-b-2 ${
              previewMode
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Client Inbox Preview</span>
          </button>
        </div>

        {!previewMode ? (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            
            {/* Quick Template Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Smart Outreach Template</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplate('PROPOSAL')}
                  className={`px-3 py-2 text-xs rounded-xl border font-bold text-left transition ${
                    template === 'PROPOSAL'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📄 1st Proposal Pitch
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate('THREAD_FOLLOWUP')}
                  className={`px-3 py-2 text-xs rounded-xl border font-bold text-left transition ${
                    template === 'THREAD_FOLLOWUP'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🔄 Threaded Follow-up
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate('FOLLOWUP')}
                  className={`px-3 py-2 text-xs rounded-xl border font-bold text-left transition ${
                    template === 'FOLLOWUP'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ⚡ Quick Check-in
                </button>
                <button
                  type="button"
                  onClick={() => setTemplate('CUSTOM')}
                  className={`px-3 py-2 text-xs rounded-xl border font-bold text-left transition ${
                    template === 'CUSTOM'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✍️ Blank / Custom
                </button>
              </div>
            </div>

            {/* Sender Identity & Deliverability Mode */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-2xl">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  From / Sender Name *
                </label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="e.g. Jack | EVM ERP"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
                />
                <p className="text-[10px] text-slate-400 mt-1">Real human name ensures 1-to-1 inbox delivery</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deliverability Optimization *
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDeliverabilityMode('HIGH_INBOX')}
                    className={`px-2 py-1.5 text-[11px] rounded-xl font-bold border text-center transition flex items-center justify-center gap-1 ${
                      deliverabilityMode === 'HIGH_INBOX'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>🛡️ Max Inbox</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeliverabilityMode('FULL_TRACKING')}
                    className={`px-2 py-1.5 text-[11px] rounded-xl font-bold border text-center transition flex items-center justify-center gap-1 ${
                      deliverabilityMode === 'FULL_TRACKING'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>📊 Track All</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {deliverabilityMode === 'HIGH_INBOX'
                    ? 'Bypasses corporate spam firewalls (clean direct link, zero web-beacons)'
                    : 'Records 1x1 open pixel and click redirect engagement'}
                </p>
              </div>
            </div>

            {/* Recipient & Quote selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Work Email *</label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="decision_maker@company.com"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Recipient Name</label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Aarav Patel"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Attach Commercial Quotation */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  Attach Commercial Quotation (Generates Proposal Link)
                  {quotations.length > 0 && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-full">
                      {quotations.length} available
                    </span>
                  )}
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold">Optional</span>
              </label>
              <select
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-800 bg-white"
              >
                <option value="">No quotation attached (standard executive note)</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quote_number} — ${Number(q.total_amount).toLocaleString()} ({q.deal_title || 'Commercial Quote'})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Line */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subject Line *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Enter compelling subject..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
              />
            </div>

            {/* Anti-Spam Deliverability Health Banner */}
            <div className={`p-3 rounded-2xl border text-xs flex items-start space-x-2.5 ${
              spamAnalysis.isOptimal
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-300 text-amber-900'
            }`}>
              {spamAnalysis.isOptimal ? (
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="flex items-center justify-between font-bold">
                  <span>
                    {spamAnalysis.isOptimal
                      ? 'Inbox Deliverability Score: 100% (High Inbox Probability)'
                      : `Deliverability Warning (Score: ${spamAnalysis.score}%)`}
                  </span>
                  <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md font-black bg-white border border-current">
                    {deliverabilityMode === 'HIGH_INBOX' ? 'Direct Inbox Mode' : 'Tracked Mode'}
                  </span>
                </div>
                {spamAnalysis.isOptimal ? (
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    RFC 2046 Multipart (Plain-Text + HTML) enabled. Zero spam keywords detected.
                  </p>
                ) : (
                  <div className="text-[11px] text-amber-800 mt-0.5 space-y-0.5">
                    {spamAnalysis.foundTriggers.length > 0 && (
                      <p>
                        ⚠️ Spam trigger keywords detected: <strong>{spamAnalysis.foundTriggers.join(', ')}</strong>. Consider replacing them with neutral business terms.
                      </p>
                    )}
                    {spamAnalysis.isAllCapsSubject && (
                      <p>⚠️ Subject is in ALL CAPS. Most corporate spam filters penalize uppercase subjects.</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Message Body */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Message Content (Plain Text, Bullets & Quoted History Supported) *</span>
                <span className="text-[10px] text-slate-400">Renders as native 1-to-1 Gmail / Outlook text</span>
              </label>
              <textarea
                rows={10}
                required
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Compose direct, authentic corporate email..."
                className="w-full px-3 py-2.5 text-xs font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none leading-relaxed"
              />
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
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Outreach Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Client Inbox Preview (100% Authentic Gmail look) */
          <div className="p-6 space-y-4">
            <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs bg-white">
              <div className="bg-slate-50 p-3.5 border-b border-slate-200 text-xs space-y-1.5 font-sans">
                <div className="flex items-center justify-between">
                  <div><strong className="text-slate-500">From:</strong> {senderName} &lt;anil.infyx@gmail.com&gt;</div>
                  <span className="text-[10px] bg-slate-200/80 text-slate-600 font-semibold px-2 py-0.5 rounded-full">
                    {deliverabilityMode === 'HIGH_INBOX' ? '🛡️ Direct Inbox Delivery' : '📊 Tracking Mode'}
                  </span>
                </div>
                <div><strong className="text-slate-500">To:</strong> {recipientName || 'Client'} &lt;{recipientEmail || 'client@company.com'}&gt;</div>
                <div><strong className="text-slate-500">Subject:</strong> <span className="font-bold text-slate-800">{subject || 'No subject'}</span></div>
              </div>

              <div className="p-6 text-sm text-slate-800 space-y-3.5 leading-relaxed font-sans">
                {bodyText.split('\n\n').map((p, idx) => {
                  if (p.startsWith('On ') && p.includes('wrote:')) {
                    return (
                      <div key={idx} className="mt-4 pt-2 border-l-2 border-slate-300 pl-3 text-xs text-slate-600 font-sans">
                        <p className="whitespace-pre-line">{p}</p>
                      </div>
                    );
                  }
                  return (
                    <p key={idx} className="whitespace-pre-line text-sm leading-relaxed text-slate-900">{p}</p>
                  );
                })}

                {selectedQuoteId && (
                  <div className="my-4 pt-2">
                    <p className="text-sm font-sans text-slate-800">
                      You can review our full itemized commercial proposal and scope of work here:
                    </p>
                    <p className="mt-1">
                      👉 <span className="text-blue-600 font-semibold underline cursor-pointer hover:text-blue-800">
                        Review Commercial Proposal & Scope of Work [{selectedQuote?.quote_number || 'QT-2026'}] &rarr;
                      </span>
                    </p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between font-sans">
                  <span>Authentic 1-to-1 Executive Email Format</span>
                  <span className="flex items-center text-emerald-600 font-semibold">
                    {deliverabilityMode === 'HIGH_INBOX' ? (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Anti-Spam Clean Delivery (No Web Beacons)
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> 1x1 Tracking Pixel Active
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setPreviewMode(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition"
              >
                &larr; Back to Edit
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Confirm & Send Email</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
