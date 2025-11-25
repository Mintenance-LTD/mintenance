'use client';

import React, { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { PageLayout, PageHeader } from '@/components/ui/PageLayout';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card.unified';
import { Badge } from '@/components/ui/Badge.unified';
import { Printer, ArrowLeft, Mail } from 'lucide-react';

interface QuoteLineItem {
    description: string;
    quantity: number;
    unitPrice?: number;
    unit_price?: number; // Handle potential legacy/buggy data
    total: number;
}

interface Quote {
    id: string;
    quote_number: string;
    client_name: string;
    client_email: string;
    client_phone?: string;
    client_address?: string;
    title: string;
    description?: string;
    line_items: QuoteLineItem[];
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    total_amount: number;
    terms?: string;
    notes?: string;
    quote_date: string;
    valid_until?: string;
    status: string;
    created_at: string;
}

interface QuoteDetailsClientProps {
    quote: Quote;
}

export function QuoteDetailsClient({ quote }: QuoteDetailsClientProps) {
    const router = useRouter();
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        window.print();
    };

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value || 0);

    const getStatusTone = (status: string) => {
        switch (status) {
            case 'accepted': return 'success';
            case 'rejected': return 'error';
            case 'sent': return 'info';
            default: return 'neutral';
        }
    };

    return (
        <PageLayout
            sidebar={
                <div className="no-print">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                                <Button variant="primary" fullWidth onClick={handlePrint}>
                                    <Printer size={16} style={{ marginRight: theme.spacing[2] }} />
                                    Print / PDF
                                </Button>
                                <Button variant="secondary" fullWidth onClick={() => router.push('/contractor/quotes')}>
                                    <ArrowLeft size={16} style={{ marginRight: theme.spacing[2] }} />
                                    Back to Quotes
                                </Button>
                                {quote.status === 'draft' && (
                                    <Button variant="outline" fullWidth>
                                        <Mail size={16} style={{ marginRight: theme.spacing[2] }} />
                                        Send to Client
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            }
        >
            <div ref={printRef} className="print-content">
                <style jsx global>{`
          @media print {
            .no-print { display: none !important; }
            .print-content { width: 100%; }
            body { background: white; }
            /* Hide sidebar and other layout elements if possible, 
               but PageLayout might be tricky. 
               Ideally we'd have a print-specific layout. */
          }
        `}</style>

                <div style={{ marginBottom: theme.spacing[6], display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <h1 style={{ fontSize: theme.typography.fontSize['3xl'], fontWeight: 'bold', marginBottom: theme.spacing[2] }}>
                            Quote #{quote.quote_number}
                        </h1>
                        <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                            <Badge variant={getStatusTone(quote.status)}>{quote.status}</Badge>
                            <span style={{ color: theme.colors.textSecondary }}>
                                Created: {new Date(quote.created_at).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        {/* Company Logo/Info would go here */}
                        <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: 'bold' }}>Mintenance</h2>
                    </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing[8], marginBottom: theme.spacing[8] }}>
                    <Card>
                        <CardHeader><CardTitle>Client</CardTitle></CardHeader>
                        <CardContent>
                            <p><strong>{quote.client_name}</strong></p>
                            <p>{quote.client_email}</p>
                            <p>{quote.client_phone}</p>
                            <p>{quote.client_address}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader><CardTitle>Project</CardTitle></CardHeader>
                        <CardContent>
                            <p><strong>{quote.title}</strong></p>
                            <p>{quote.description}</p>
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader><CardTitle>Items</CardTitle></CardHeader>
                    <CardContent>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: `2px solid ${theme.colors.border}`, textAlign: 'left' }}>
                                    <th style={{ padding: theme.spacing[3] }}>Description</th>
                                    <th style={{ padding: theme.spacing[3], textAlign: 'right' }}>Qty</th>
                                    <th style={{ padding: theme.spacing[3], textAlign: 'right' }}>Unit Price</th>
                                    <th style={{ padding: theme.spacing[3], textAlign: 'right' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quote.line_items.map((item, i) => (
                                    <tr key={i} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                                        <td style={{ padding: theme.spacing[3] }}>{item.description}</td>
                                        <td style={{ padding: theme.spacing[3], textAlign: 'right' }}>{item.quantity}</td>
                                        <td style={{ padding: theme.spacing[3], textAlign: 'right' }}>
                                            {formatCurrency(item.unitPrice || item.unit_price || 0)}
                                        </td>
                                        <td style={{ padding: theme.spacing[3], textAlign: 'right' }}>
                                            {formatCurrency(item.total || (item.quantity * (item.unitPrice || item.unit_price || 0)))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div style={{ marginTop: theme.spacing[6], display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '300px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: theme.spacing[2] }}>
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(quote.subtotal)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: theme.spacing[2] }}>
                                    <span>Tax ({quote.tax_rate}%):</span>
                                    <span>{formatCurrency(quote.tax_amount)}</span>
                                </div>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    padding: theme.spacing[2],
                                    borderTop: `2px solid ${theme.colors.border}`,
                                    fontWeight: 'bold',
                                    fontSize: theme.typography.fontSize.lg
                                }}>
                                    <span>Total:</span>
                                    <span>{formatCurrency(quote.total_amount)}</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {(quote.notes || quote.terms) && (
                    <div style={{ marginTop: theme.spacing[8], display: 'grid', gap: theme.spacing[4] }}>
                        {quote.notes && (
                            <Card>
                                <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                                <CardContent><p>{quote.notes}</p></CardContent>
                            </Card>
                        )}
                        {quote.terms && (
                            <Card>
                                <CardHeader><CardTitle>Terms & Conditions</CardTitle></CardHeader>
                                <CardContent><p>{quote.terms}</p></CardContent>
                            </Card>
                        )}
                    </div>
                )}
            </div>
        </PageLayout>
    );
}
