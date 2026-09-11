'use client';

import React, { useState } from 'react';
import { X, FileText, Plus } from 'lucide-react';
import { Product, Deal } from '../types';
import { createQuotation } from '../lib/api';

interface QuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuoteCreated: () => void;
  products: Product[];
  deals: Deal[];
}

export const QuoteModal: React.FC<QuoteModalProps> = ({
  isOpen,
  onClose,
  onQuoteCreated,
  products,
  deals
}) => {
  const [dealId, setDealId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [discount, setDiscount] = useState(0);
  const [validUntil, setValidUntil] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
  const unitPrice = selectedProduct ? Number(selectedProduct.price) : 10000;
  const subtotal = unitPrice * quantity;
  const total = Math.max(subtotal - discount, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await createQuotation({
        deal_id: dealId || undefined,
        total_amount: total,
        valid_until: validUntil || undefined,
        items: [
          {
            product_name: selectedProduct?.name || 'Custom Solution',
            unit_price: unitPrice,
            quantity,
            discount,
            total
          }
        ] as any
      });
      onQuoteCreated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
        
        <div className="bg-emerald-700 px-6 py-5 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Generate Commercial Quotation</h3>
            <p className="text-[11px] text-emerald-100">
              Create official quote with itemized products & discounts
            </p>
          </div>
          <button onClick={onClose} className="text-emerald-100 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Link to Opportunity / Deal</label>
            <select
              value={dealId}
              onChange={(e) => setDealId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">Select Deal</option>
              {deals.map(d => (
                <option key={d.id} value={d.id}>{d.title} (${Number(d.amount).toLocaleString()})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Product / Service Item</label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none font-semibold"
            >
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name} - ${Number(p.price).toLocaleString()}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Commercial Discount ($)</label>
              <input
                type="number"
                min="0"
                value={discount}
                onChange={(e) => setDiscount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Valid Until Date</label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Quotation Summary Box */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center justify-between">
            <span className="text-slate-500 font-semibold">Total Quotation Value:</span>
            <span className="text-base font-black text-emerald-800">
              ${total.toLocaleString()}
            </span>
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
              {isSubmitting ? 'Generating...' : 'Create Quotation'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
