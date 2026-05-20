'use client';

/**
 * Mint Editorial port of /contractor/subscription/payment-methods.
 *
 * Serif italic header, dark green default-card display (when a default
 * exists), dotted "Add a card" CTA, and an "Other methods" list for
 * non-default real cards. Every card shown is real data from the
 * `paymentMethods` prop — when the array is empty, the view renders
 * honest empty states rather than fabricated card examples.
 *
 * The dark default-card visual matches the design mock: warm-near-black
 * paper feel, default chip in the top-left, brand mark in the top-right,
 * masked card number, holder + expiry. Skipped entirely when no default
 * method has been added yet (we don't render a fake card).
 */

import React from 'react';
import { CreditCard, Plus, MoreHorizontal } from 'lucide-react';
import { PaymentMethodForm } from './PaymentMethodForm';

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_account';
  card?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  bank_account?: {
    bank_name: string;
    last4: string;
  };
  isDefault?: boolean;
}

interface MintEditorialPaymentMethodsViewProps {
  paymentMethods: PaymentMethod[];
}

function formatExpiry(month: number, year: number): string {
  const mm = String(month).padStart(2, '0');
  const yy = String(year).slice(-2);
  return `${mm}/${yy}`;
}

function methodLabel(method: PaymentMethod): string {
  if (method.card) {
    return `${method.card.brand} •••• ${method.card.last4}`;
  }
  if (method.bank_account) {
    return `${method.bank_account.bank_name} •••• ${method.bank_account.last4}`;
  }
  return 'Payment method';
}

function methodSub(method: PaymentMethod): string {
  if (method.card) {
    return `Expires ${formatExpiry(method.card.exp_month, method.card.exp_year)}`;
  }
  if (method.bank_account) {
    return 'Bank account';
  }
  return method.type;
}

export function MintEditorialPaymentMethodsView({
  paymentMethods,
}: MintEditorialPaymentMethodsViewProps) {
  const defaultMethod = paymentMethods.find((m) => m.isDefault) ?? null;
  const otherMethods = paymentMethods.filter((m) => !m.isDefault);

  return (
    <div className='col' style={{ gap: 24, maxWidth: 1120, margin: '0 auto', width: '100%' }}>
      {/* Header */}
      <div className='col' style={{ gap: 6 }}>
        <h1 className='t-h1' style={{ margin: 0 }}>
          Payment{' '}
          <em style={{ color: 'var(--me-brand)', fontStyle: 'italic' }}>methods</em>
        </h1>
        <p className='t-body' style={{ margin: 0 }}>
          Cards never shared with contractors. We use Stripe to store and
          charge.
        </p>
      </div>

      {/* Default + Add card row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 20,
        }}
        className='pm-default-row'
      >
        {/* Default card */}
        {defaultMethod ? (
          <DefaultCardDisplay method={defaultMethod} />
        ) : (
          <EmptyDefaultCard />
        )}

        {/* Add a card box */}
        <AddCardBox />
      </div>

      {/* Other methods (only if real entries exist) */}
      {otherMethods.length > 0 ? (
        <section className='col' style={{ gap: 12 }}>
          <h2 className='t-h3' style={{ margin: 0 }}>
            Other methods
          </h2>
          <div className='card' style={{ padding: 0, overflow: 'hidden' }}>
            {otherMethods.map((method, i) => (
              <div
                key={method.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  padding: '16px 20px',
                  borderTop:
                    i === 0 ? 'none' : '1px solid var(--me-line-2)',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'var(--me-bg-2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CreditCard
                    size={18}
                    strokeWidth={1.75}
                    color='var(--me-ink-2)'
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--me-ink)',
                    }}
                  >
                    {methodLabel(method)}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 12,
                      color: 'var(--me-ink-3)',
                    }}
                  >
                    {methodSub(method)}
                  </p>
                </div>
                <button
                  type='button'
                  aria-label='Manage method'
                  style={{
                    padding: 6,
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--me-ink-3)',
                  }}
                >
                  <MoreHorizontal size={18} strokeWidth={1.75} />
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {/* Add-card form (the existing Stripe form, kept below the polished
          hero — when integration ships, the form's "add" success will
          repopulate paymentMethods so the default/other sections light up.) */}
      <details className='card' style={{ padding: 20 }}>
        <summary
          style={{
            cursor: 'pointer',
            color: 'var(--me-ink-2)',
            fontSize: 14,
            fontWeight: 600,
            listStyle: 'none',
          }}
        >
          Advanced: add a payment method manually
        </summary>
        <div style={{ marginTop: 16 }}>
          <PaymentMethodForm />
        </div>
      </details>

      <style jsx global>{`
        @media (max-width: 800px) {
          .pm-default-row {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────── sub-components ───────────────────────── */

function DefaultCardDisplay({ method }: { method: PaymentMethod }) {
  const brand = method.card?.brand || (method.bank_account?.bank_name ?? 'CARD');
  const last4 = method.card?.last4 ?? method.bank_account?.last4 ?? '••••';
  const expiry = method.card
    ? formatExpiry(method.card.exp_month, method.card.exp_year)
    : null;

  return (
    <div
      style={{
        background:
          'linear-gradient(140deg, var(--me-mint-800, #1F4A40) 0%, var(--me-ink, #1A2520) 100%)',
        color: 'var(--me-on-brand)',
        borderRadius: 'var(--me-radius-card)',
        padding: '24px 28px',
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: 'var(--me-shadow-pop)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.55)',
            fontWeight: 600,
          }}
        >
          Default
        </span>
        <span
          style={{
            fontSize: 14,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          {brand}
        </span>
      </div>

      <p
        style={{
          margin: 0,
          fontSize: 24,
          letterSpacing: '0.18em',
          fontFamily: 'ui-monospace, monospace',
          color: 'rgba(255, 255, 255, 0.92)',
        }}
      >
        •••• •••• •••• {last4}
      </p>

      <div
        style={{
          display: 'flex',
          gap: 32,
        }}
      >
        {expiry ? (
          <div>
            <p
              style={{
                margin: 0,
                fontSize: 10,
                letterSpacing: 1.6,
                textTransform: 'uppercase',
                color: 'rgba(255, 255, 255, 0.55)',
              }}
            >
              Expires
            </p>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'rgba(255, 255, 255, 0.92)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {expiry}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyDefaultCard() {
  return (
    <div
      style={{
        background: 'var(--me-bg-2)',
        border: '1px dashed var(--me-line)',
        borderRadius: 'var(--me-radius-card)',
        padding: '24px 28px',
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: 'var(--me-surface)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
        }}
      >
        <CreditCard
          size={22}
          strokeWidth={1.5}
          color='var(--me-ink-3)'
        />
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--me-ink)',
        }}
      >
        No default method yet
      </p>
      <p
        style={{
          margin: '4px 0 0',
          fontSize: 12,
          color: 'var(--me-ink-3)',
        }}
      >
        Add a card to start receiving payouts.
      </p>
    </div>
  );
}

function AddCardBox() {
  return (
    <div
      style={{
        background: 'var(--me-surface)',
        border: '2px dashed var(--me-line)',
        borderRadius: 'var(--me-radius-card)',
        padding: '24px 28px',
        minHeight: 220,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 11,
          background: 'var(--me-bg-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          color: 'var(--me-ink-2)',
        }}
      >
        <Plus size={20} strokeWidth={1.75} />
      </div>
      <p
        style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--me-ink)',
        }}
      >
        Add a card
      </p>
      <p
        style={{
          margin: '4px 0 0',
          fontSize: 12,
          color: 'var(--me-ink-3)',
        }}
      >
        Visa, Mastercard, Amex · Apple/Google Pay
      </p>
      <p
        style={{
          margin: '12px 0 0',
          fontSize: 11,
          color: 'var(--me-ink-4)',
        }}
      >
        Open the form below to add via Stripe.
      </p>
    </div>
  );
}
