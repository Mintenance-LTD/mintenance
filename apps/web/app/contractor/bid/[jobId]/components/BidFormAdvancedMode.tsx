'use client';

import React from 'react';
import { Lightbulb } from 'lucide-react';
import { PricingBreakdown } from '@/components/ui/PricingBreakdown';
import type { LineItem } from './bidSubmissionTypes';

interface BidFormAdvancedModeProps {
  lineItems: LineItem[];
  taxRate: number;
  taxAmount: number;
  subtotal: number;
  totalAmount: number;
  laborTotal: number;
  materialTotal: number;
  equipmentTotal: number;
  platformFeeRate: number;
  platformFee: number;
  youWillReceive: number;
  terms: string;
  jobBudget?: string;
  onAddLineItem: () => void;
  onUpdateLineItem: (id: string, field: keyof LineItem, value: string | number) => void;
  onRemoveLineItem: (id: string) => void;
  onTaxRateChange: (rate: number) => void;
  onTermsChange: (terms: string) => void;
}

export function BidFormAdvancedMode({
  lineItems, taxRate, taxAmount, subtotal, totalAmount,
  laborTotal, materialTotal, equipmentTotal,
  platformFeeRate, platformFee, youWillReceive, terms, jobBudget,
  onAddLineItem, onUpdateLineItem, onRemoveLineItem, onTaxRateChange, onTermsChange,
}: BidFormAdvancedModeProps) {
  const jobBudgetNum = jobBudget ? parseFloat(jobBudget) : NaN;
  const exceedsBudget = !isNaN(jobBudgetNum) && totalAmount > jobBudgetNum;
  const excess = exceedsBudget ? totalAmount - jobBudgetNum : 0;

  return (
    <div className="space-y-6">
      {/* Line Items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-gray-700">Line Items</label>
          <button onClick={onAddLineItem} className="text-teal-600 hover:text-teal-700 font-medium text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Item
          </button>
        </div>

        <div className="space-y-3">
          {lineItems.map((item) => (
            <div key={item.id} className="grid grid-cols-12 gap-2 p-3 bg-gray-50 rounded-lg">
              <select
                value={item.type}
                onChange={(e) => onUpdateLineItem(item.id, 'type', e.target.value as 'labor' | 'material' | 'equipment')}
                className="col-span-2 px-2 py-2 border border-gray-300 rounded-lg text-sm font-medium"
              >
                <option value="labor">Labor</option>
                <option value="material">Material</option>
                <option value="equipment">Equipment</option>
              </select>
              <input type="text" value={item.description} onChange={(e) => onUpdateLineItem(item.id, 'description', e.target.value)} placeholder="Description" className="col-span-4 px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              <input type="number" value={item.quantity} onChange={(e) => onUpdateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} placeholder="Qty" className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" min="0" />
              <input type="number" value={item.unitPrice} onChange={(e) => onUpdateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} placeholder="£ Price" className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg text-sm" step="0.01" min="0" />
              <div className="col-span-1 px-2 py-2 bg-white rounded-lg text-sm font-medium flex items-center justify-end">£{item.total.toFixed(2)}</div>
              <button onClick={() => onRemoveLineItem(item.id)} className="col-span-1 flex items-center justify-center text-rose-600 hover:text-rose-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Cost Breakdown */}
        {lineItems.length > 0 && (
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-xl p-5 mt-4">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Cost Breakdown
            </h4>
            <div className="space-y-2">
              {laborTotal > 0 && (
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-sm text-gray-700">Labor</span></div>
                  <span className="text-sm font-semibold text-gray-900">£{laborTotal.toFixed(2)}</span>
                </div>
              )}
              {materialTotal > 0 && (
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-amber-500" /><span className="text-sm text-gray-700">Materials</span></div>
                  <span className="text-sm font-semibold text-gray-900">£{materialTotal.toFixed(2)}</span>
                </div>
              )}
              {equipmentTotal > 0 && (
                <div className="flex justify-between items-center p-2 bg-white rounded-lg">
                  <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-sm text-gray-700">Equipment</span></div>
                  <span className="text-sm font-semibold text-gray-900">£{equipmentTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t-2 border-teal-200">
                <span className="text-sm font-semibold text-gray-900">Subtotal</span>
                <span className="text-base font-bold text-teal-600">£{subtotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tax Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Tax Rate (%)</label>
          <input type="number" value={taxRate} onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)} className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500" step="0.1" min="0" />
        </div>
      </div>

      {/* Budget Warning */}
      {exceedsBudget && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-rose-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-rose-900 mb-1">Budget Exceeded</h4>
              <p className="text-sm text-rose-800 mb-2">
                Your total bid (£{totalAmount.toFixed(2)}) exceeds the job budget (£{jobBudgetNum.toFixed(2)}) by £{excess.toFixed(2)}.
                {taxAmount > 0 ? ' This includes ' + taxRate + '% tax (£' + taxAmount.toFixed(2) + ').' : ''}
                {lineItems.length > 0 ? ' This includes ' + lineItems.length + ' line item(s).' : ''}
              </p>
              {taxAmount > 0 && (
                <p className="text-xs text-rose-700 mb-2 font-medium">
                  <Lightbulb className="w-4 h-4 inline-block mr-1" /> Maximum base amount (before tax): £{(jobBudgetNum / (1 + taxRate / 100)).toFixed(2)}
                </p>
              )}
              <p className="text-xs text-rose-700">Please adjust your bid amount to stay within the budget before submitting.</p>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Summary */}
      <PricingBreakdown
        items={[
          ...lineItems.map((item) => ({ id: item.id, label: item.description || 'Line item', amount: item.total })),
          { id: 'tax', label: 'VAT (' + taxRate + '%)', amount: taxAmount },
        ]}
        subtotal={subtotal}
        total={totalAmount}
        currency="£"
        className="border border-gray-200"
        showSubtotal={true}
      />

      {/* Platform Fee Breakdown */}
      {lineItems.length > 0 && totalAmount > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
          <h4 className="text-sm font-medium text-teal-900 mb-4">Your Earnings</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-teal-700">Total bid amount</span>
              <span className="text-sm font-medium text-teal-900">£{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-teal-700">Platform fee ({platformFeeRate}%)</span>
              <span className="text-sm font-medium text-rose-600">-£{platformFee.toFixed(2)}</span>
            </div>
            <div className="pt-3 border-t border-teal-300">
              <div className="flex justify-between items-center">
                <span className="text-base font-semibold text-teal-900">You&apos;ll receive</span>
                <span className="text-lg font-bold text-emerald-600">£{youWillReceive.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Terms & Conditions (Optional)</label>
        <textarea
          value={terms}
          onChange={(e) => onTermsChange(e.target.value)}
          placeholder="Payment terms, warranty, or special conditions..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          maxLength={2000}
        />
      </div>
    </div>
  );
}
