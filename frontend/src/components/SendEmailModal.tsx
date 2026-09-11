'use client';

import React, { useState, useEffect } from 'react';
import { X, Mail, Send, FileText, CheckCircle2, Eye, Sparkles, AlertCircle } from 'lucide-react';
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
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [selectedQuoteId, setSelectedQuoteId] = useState(preselectedQuoteId || '');
  const [template, setTemplate] = useState<'PROPOSAL' | 'FOLLOWUP' | 'CUSTOM'>('PROPOSAL');
  const [previewMode, setPreviewMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedQuote = quotations.find((q) => q.id === selectedQuoteId);

  useEffect(() => {
    if (targetLead) {
      setRecipientEmail(targetLead.email || '');
      setRecipientName(`${targetLead.first_name} ${targetLead.last_name || ''}`.trim());
    }
    if (preselectedQuoteId) {
      setSelectedQuoteId(preselectedQuoteId);
    }
  }, [targetLead, preselectedQuoteId]);

  // Apply template defaults
  useEffect(() => {
    const name = recipientName || targetLead?.first_name || 'Valued Client';
    const comp = targetLead?.company_name || 'your company';

    if (template === 'PROPOSAL') {
      const qNum = selectedQuote ? selectedQuote.quote_number : 'QT-2026';
      const qAmt = selectedQuote ? `$${Number(selectedQuote.total_amount).toLocaleString()}` : '$25,000';

      setSubject(`Official Commercial Proposal & Scope of Work - ${comp} [${qNum}]`);
      setBodyText(
        `Dear ${name},\n\n` +
        `Thank you for taking the time to explore how our enterprise solutions can accelerate growth for ${comp}.\n\n` +
        `Based on our technical discovery discussions, our team has prepared an itemized commercial proposal valued at ${qAmt}.\n\n` +
        `You can securely review the full scope of deliverables, SLA guarantees, and itemized terms using the interactive proposal link below.\n\n` +
        `Best regards,\n` +
        `Scaloy Enterprise Growth Team`
      );
    } else if (template === 'FOLLOWUP') {
      setSubject(`Quick Follow-up regarding ${comp}'s CRM & Growth Roadmap`);
      setBodyText(
        `Hi ${name},\n\n` +
        `I wanted to check in following up on our previous correspondence. We have helped several peers in ${targetLead?.industry || 'your sector'} increase their sales pipeline velocity by over 40%.\n\n` +
        `Would you have 15 minutes this Thursday or Friday for a brief walkthrough?\n\n` +
        `Looking forward to connecting,\n` +
        `Enterprise Sales Team`
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

      // Convert newlines to paragraphs for HTML body
      const formattedHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <div style="border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 20px;">
            <span style="font-size: 18px; font-weight: 800; color: #065f46; letter-spacing: -0.5px;">Scaloy Digital Enterprise</span>
          </div>
          ${bodyText.split('\n\n').map(p => `<p style="margin: 0 0 16px 0;">${p.replace(/\n/g, '<br/>')}</p>`).join('')}
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
            Sent securely via Scaloy Multi-Tenant CRM SaaS Cloud
          </div>
        </div>
      `;

      const res = await sendEmail({
        lead_id: targetLead?.id,
        quotation_id: selectedQuoteId || undefined,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject,
        body_html: formattedHtml,
        sender_name: 'Scaloy Enterprise Sales'
      });

      onEmailSent(res.message || 'Tracked email successfully dispatched!');
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
                Send Tracked Outreach & Proposal
                <span className="text-[10px] bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/40">
                  Open & Click Detection Active
                </span>
              </h3>
              <p className="text-[11px] text-emerald-200/80">
                Inbox opens are tracked via invisible 1x1 pixels. Proposal clicks record client engagement in real time.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-emerald-300 hover:text-white p-1 rounded-lg hover:bg-emerald-800/50 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tab switcher: Compose vs Preview */}
        <div className="flex border-b border-slate-200 px-6 pt-3 bg-slate-50/50 gap-3">
          <button
            type="button"
            onClick={() => setPreviewMode(false)}
            className={`pb-2 text-xs font-bold transition border-b-2 ${
              !previewMode
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ✏️ Compose Message
          </button>
          <button
            type="button"
            onClick={() => setPreviewMode(true)}
            className={`pb-2 text-xs font-bold transition border-b-2 flex items-center space-x-1 ${
              previewMode
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
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
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplate('PROPOSAL')}
                  className={`px-3 py-2 text-xs rounded-xl border font-bold text-left transition ${
                    template === 'PROPOSAL'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  📄 Commercial Proposal
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
                  ⚡ Discovery Follow-up
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
                <span>Attach Commercial Quotation (Generates Tracked Proposal Link)</span>
                <span className="text-[11px] text-emerald-700 font-semibold">Optional</span>
              </label>
              <select
                value={selectedQuoteId}
                onChange={(e) => setSelectedQuoteId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold text-slate-800 bg-white"
              >
                <option value="">No quotation attached (standard email tracking only)</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quote_number} — ${Number(q.total_amount).toLocaleString()} ({q.deal_title || 'Direct Quote'})
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
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

            {/* Body */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Message Content *</label>
              <textarea
                required
                rows={7}
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Write your email body..."
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-sans"
              />
            </div>

            {/* Tracking Badge notice */}
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center space-x-2 text-[11px] text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Smart Delivery:</strong> An invisible 1x1 transparent tracking pixel will be automatically inserted into the footer. If a quotation is attached, a secure redirect link will track when the client views your proposal.
              </span>
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
                    <span>Send Tracked Email</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Client Inbox Preview */
          <div className="p-6 space-y-4">
            <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-xs bg-white">
              <div className="bg-slate-100 p-3 border-b border-slate-200 text-xs space-y-1">
                <div><strong className="text-slate-500">To:</strong> {recipientName || 'Client'} &lt;{recipientEmail || 'client@company.com'}&gt;</div>
                <div><strong className="text-slate-500">From:</strong> Scaloy Enterprise Sales &lt;sales@scaloy.com&gt;</div>
                <div><strong className="text-slate-500">Subject:</strong> <span className="font-bold text-slate-800">{subject || 'No subject'}</span></div>
              </div>

              <div className="p-6 text-xs text-slate-800 space-y-3 leading-relaxed font-sans">
                {bodyText.split('\n\n').map((p, idx) => (
                  <p key={idx} className="whitespace-pre-line">{p}</p>
                ))}

                {selectedQuoteId && (
                  <div className="my-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <div className="text-xs font-black text-emerald-900">Commercial Proposal Attached</div>
                    <div className="text-[11px] text-emerald-700">
                      Quote: {selectedQuote?.quote_number || 'QT-2026'} · Total Value: <strong>${Number(selectedQuote?.total_amount || 0).toLocaleString()}</strong>
                    </div>
                    <div>
                      <span className="inline-block px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-xs text-xs">
                        📄 Review Commercial Proposal & Pricing &rarr;
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">Tracked Redirect: records client click & timestamps engagement</div>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Sent via Scaloy Multi-Tenant CRM SaaS</span>
                  <span className="flex items-center text-emerald-600 font-bold">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> 1x1 Open Pixel Active
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
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Now</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
