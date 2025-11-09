'use client';

import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Plus, Trash2 } from 'lucide-react';

export interface QuoteLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface QuoteLineItemsProps {
  lineItems: QuoteLineItem[];
  onChange: (items: QuoteLineItem[]) => void;
  subtotal: number;
  taxRate: number;
  onTaxRateChange: (rate: number) => void;
}

export function QuoteLineItems({
  lineItems,
  onChange,
  subtotal,
  taxRate,
  onTaxRateChange,
}: QuoteLineItemsProps) {
  const addLineItem = () => {
    const newItem: QuoteLineItem = {
      id: `item-${Date.now()}`,
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
    };
    onChange([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    onChange(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof QuoteLineItem, value: string | number) => {
    const updated = lineItems.map((item) => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, [field]: value };
      
      // Recalculate total when quantity or unitPrice changes
      if (field === 'quantity' || field === 'unitPrice') {
        updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
      }
      
      return updatedItem;
    });
    
    onChange(updated);
  };

  const taxAmount = (subtotal * taxRate) / 100;
  const totalAmount = subtotal + taxAmount;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{
          fontSize: theme.typography.fontSize.lg,
          fontWeight: theme.typography.fontWeight.semibold,
          color: theme.colors.textPrimary,
          margin: 0,
        }}>
          Line Items
        </h3>
        <Button
          variant="ghost"
          onClick={addLineItem}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          Add Item
        </Button>
      </div>

      {lineItems.length === 0 ? (
        <div style={{
          padding: theme.spacing[6],
          textAlign: 'center',
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.md,
          border: `1px dashed ${theme.colors.border}`,
        }}>
          <p style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
            margin: 0,
          }}>
            No line items added. Click "Add Item" to create a detailed breakdown.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
            gap: theme.spacing[3],
            padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md,
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textSecondary,
          }}>
            <span>Description</span>
            <span>Quantity</span>
            <span>Unit Price</span>
            <span>Total</span>
            <span></span>
          </div>

          {/* Line Items */}
          {lineItems.map((item) => (
            <div
              key={item.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr 40px',
                gap: theme.spacing[3],
                alignItems: 'center',
              }}
            >
              <Input
                value={item.description}
                onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                placeholder="Item description"
                style={{ fontSize: theme.typography.fontSize.sm }}
              />
              <Input
                type="number"
                value={item.quantity.toString()}
                onChange={(e) => updateLineItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                min="0"
                step="1"
                placeholder="1"
                style={{ fontSize: theme.typography.fontSize.sm }}
              />
              <Input
                type="number"
                value={item.unitPrice.toString()}
                onChange={(e) => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                placeholder="0.00"
                style={{ fontSize: theme.typography.fontSize.sm }}
              />
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textPrimary,
                textAlign: 'right',
              }}>
                £{item.total.toFixed(2)}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeLineItem(item.id)}
                aria-label="Remove item"
                className="p-1"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {lineItems.length > 0 && (
        <div style={{
          borderTop: `1px solid ${theme.colors.border}`,
          paddingTop: theme.spacing[4],
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[2],
          marginTop: theme.spacing[2],
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            <span>Subtotal:</span>
            <span style={{ fontWeight: theme.typography.fontWeight.medium }}>£{subtotal.toFixed(2)}</span>
          </div>
          
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}>
              Tax Rate (%):
            </span>
            <Input
              type="number"
              value={taxRate.toString()}
              onChange={(e) => onTaxRateChange(parseFloat(e.target.value) || 0)}
              min="0"
              max="100"
              step="0.01"
              style={{
                width: '100px',
                fontSize: theme.typography.fontSize.sm,
              }}
            />
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            <span>Tax Amount:</span>
            <span style={{ fontWeight: theme.typography.fontWeight.medium }}>£{taxAmount.toFixed(2)}</span>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            paddingTop: theme.spacing[2],
            borderTop: `1px solid ${theme.colors.border}`,
            marginTop: theme.spacing[1],
          }}>
            <span>Total:</span>
            <span>£{totalAmount.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

