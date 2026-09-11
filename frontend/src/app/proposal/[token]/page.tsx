'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  FileText,
  CheckCircle2,
  Building,
  Calendar,
  Clock,
  ShieldCheck,
  DollarSign,
  Send,
  Download,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { fetchPublicProposal, acceptPublicProposal } from '../../../lib/api';

export default function PublicProposalPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [proposalData, setProposalData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Acceptance Modal
  const [isAcceptModalOpen, setIsAcceptModalOpen] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [signerNotes, setSignerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [acceptSuccess, setAcceptSuccess] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchPublicProposal(token)
      .then((data) => {
        setProposalData(data);
        if (data?.email?.recipient_name) {
          setSignerName(data.email.recipient_name);
        }
        if (data?.quotation?.status === 'ACCEPTED' || data?.email?.status === 'ACCEPTED') {
          setAcceptSuccess(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load proposal. Link may have expired.');
        setLoading(false);
      });
  }, [token]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      setIsSubmitting(true);
      await acceptPublicProposal(token, {
        signer_name: signerName || proposalData?.email?.recipient_name || 'Client',
        notes: signerNotes
      });
      setAcceptSuccess(true);
      setIsAcceptModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to accept proposal');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-emerald-400 font-bold text-sm tracking-wide">Loading Secure Commercial Proposal...</p>
        </div>
      </div>
    );
  }

  if (error || !proposalData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900">Proposal Unavailable</h2>
          <p className="text-xs text-slate-500">{error || 'This link may have expired or been deactivated.'}</p>
        </div>
      </div>
    );
  }

  const { quotation, email, lead, tenant_name, tenant_settings } = proposalData;
  const items = Array.isArray(quotation?.items)
    ? quotation.items
    : typeof quotation?.items === 'string'
    ? JSON.parse(quotation.items)
    : [];

  const currency = tenant_settings?.currency || 'USD';
  const totalAmount = Number(quotation?.total_amount || 0);

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 py-10 px-4 sm:px-6 font-sans selection:bg-emerald-200">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Verification & Trust Banner */}
        <div className="bg-emerald-900 text-white px-6 py-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md border border-emerald-700">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-semibold">
              Verified Enterprise Proposal from <strong>{tenant_name}</strong>
            </span>
          </div>
          <div className="flex items-center space-x-2 text-xs text-emerald-200">
            <span>Proposal Ref:</span>
            <span className="font-mono bg-emerald-800/80 px-2 py-0.5 rounded text-white font-bold">
              {quotation?.quote_number || 'QT-ENTERPRISE'}
            </span>
          </div>
        </div>

        {/* Proposal Document Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          
          {/* Header */}
          <div className="p-8 sm:p-10 border-b border-slate-200 flex flex-col sm:flex-row justify-between gap-6 bg-gradient-to-b from-slate-50/50 to-white">
            <div>
              <div className="text-xs font-black uppercase text-emerald-700 tracking-wider mb-1">
                Commercial Quotation & Agreement
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                {tenant_name}
              </h1>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                Tailored cloud architecture, scalable CRM integration, and SLA-backed deliverables.
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1 text-xs">
              <div className="text-slate-400 font-semibold uppercase text-[10px]">Prepared Exclusively For</div>
              <div className="font-black text-slate-900 text-base">
                {email?.recipient_name || lead?.first_name || 'Valued Client'}
              </div>
              <div className="font-bold text-emerald-800">{lead?.company_name || 'Enterprise Client'}</div>
              <div className="text-slate-500">{email?.recipient_email || lead?.email}</div>
              {quotation?.valid_until && (
                <div className="text-[11px] text-amber-800 font-semibold pt-1 flex items-center sm:justify-end gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Valid until: {new Date(quotation.valid_until).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Proposal Status Banner */}
          {acceptSuccess ? (
            <div className="bg-emerald-50 border-y border-emerald-200 px-8 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3 text-emerald-900">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Proposal Accepted & Approved!</h4>
                  <p className="text-xs text-emerald-700">Thank you for partnering with us. Your account executive has been notified to commence onboarding.</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-emerald-600 text-white font-black text-xs rounded-xl shadow-xs">
                Active Agreement
              </span>
            </div>
          ) : null}

          {/* Itemized Deliverables Table */}
          <div className="p-8 sm:p-10 space-y-6">
            <h3 className="font-black text-sm uppercase text-slate-400 tracking-wider">
              Itemized Scope of Services & Deliverables
            </h3>

            <div className="rounded-2xl border border-slate-200 overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600 text-[11px]">
                  <tr>
                    <th className="p-4">Solution / Deliverable</th>
                    <th className="p-4 text-center">Qty</th>
                    <th className="p-4 text-right">Unit Price</th>
                    <th className="p-4 text-right">Discount</th>
                    <th className="p-4 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.length > 0 ? (
                    items.map((it: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-4">
                          <div className="font-bold text-slate-900 text-xs">{it.product_name || 'Custom Solution Package'}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{it.description || 'Full enterprise deployment, configuration & support.'}</div>
                        </td>
                        <td className="p-4 text-center font-bold text-slate-700">{it.quantity || 1}</td>
                        <td className="p-4 text-right font-medium text-slate-700">${Number(it.unit_price || totalAmount).toLocaleString()}</td>
                        <td className="p-4 text-right text-emerald-700 font-semibold">{it.discount ? `-$${Number(it.discount).toLocaleString()}` : '—'}</td>
                        <td className="p-4 text-right font-black text-slate-900">${Number(it.total || totalAmount).toLocaleString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="p-4">
                        <div className="font-bold text-slate-900">Enterprise Growth Solution License</div>
                        <div className="text-[11px] text-slate-500">Includes complete CRM deployment, lead pipeline ingestion, and dedicated onboarding.</div>
                      </td>
                      <td className="p-4 text-center font-bold">1</td>
                      <td className="p-4 text-right">${totalAmount.toLocaleString()}</td>
                      <td className="p-4 text-right text-emerald-700">—</td>
                      <td className="p-4 text-right font-black">${totalAmount.toLocaleString()}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Total Calculation */}
            <div className="flex justify-end pt-4">
              <div className="w-full max-w-xs space-y-2 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Deliverables Subtotal:</span>
                  <span className="font-semibold text-slate-800">${totalAmount.toLocaleString()} {currency}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Applicable Enterprise Tax (18%):</span>
                  <span className="font-semibold text-slate-800">Included</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-black text-slate-900">
                  <span>Total Investment:</span>
                  <span className="text-emerald-700 font-black">${totalAmount.toLocaleString()} {currency}</span>
                </div>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-2">
              <h4 className="font-bold text-slate-800 flex items-center space-x-1.5">
                <HelpCircle className="w-4 h-4 text-emerald-600" />
                <span>Commercial Terms & Execution</span>
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-500">
                <li>Payment terms: Net 30 days upon agreement execution and onboarding kickoff.</li>
                <li>Full confidential data protection adhering to enterprise ISO/IEC 27001 and SOC 2 security standards.</li>
                <li>Includes 24/7 priority customer success manager and dedicated engineer SLA.</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 flex items-center space-x-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Proposal dispatched on {new Date(email?.sent_at || Date.now()).toLocaleDateString()}</span>
              </div>

              <div className="flex items-center space-x-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 shadow-xs transition flex items-center justify-center space-x-1.5 flex-1 sm:flex-initial"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download / Print</span>
                </button>

                {!acceptSuccess ? (
                  <button
                    type="button"
                    onClick={() => setIsAcceptModalOpen(true)}
                    className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-lg transition flex items-center justify-center space-x-2 flex-1 sm:flex-initial"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept & Approve Proposal</span>
                  </button>
                ) : (
                  <span className="px-6 py-2.5 bg-emerald-100 text-emerald-900 border border-emerald-300 font-black text-xs rounded-xl flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Approved Online</span>
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400">
          Powered by <strong>{tenant_name}</strong> · Powered by Enterprise B2B SaaS Engine
        </div>

      </div>

      {/* Acceptance Modal */}
      {isAcceptModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-emerald-800 px-6 py-4 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Approve Commercial Proposal</h3>
                <p className="text-[11px] text-emerald-200">Officially authorize this proposal agreement</p>
              </div>
              <button onClick={() => setIsAcceptModalOpen(false)} className="text-emerald-200 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleAccept} className="p-6 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Authorized Signer Name *</label>
                <input
                  type="text"
                  required
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Comments or PO Reference</label>
                <textarea
                  rows={3}
                  value={signerNotes}
                  onChange={(e) => setSignerNotes(e.target.value)}
                  placeholder="Add any specific onboarding dates or purchase order number..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl text-[11px] text-emerald-900 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  By clicking approve, you agree to the commercial deliverables and terms outlined in Proposal {quotation?.quote_number}.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAcceptModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5"
                >
                  {isSubmitting ? (
                    <span>Approving...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirm & Approve</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
