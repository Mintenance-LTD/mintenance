/**
 * /invoices/[invoiceId] — DEPRECATED, redirects to canonical surface.
 *
 * 2026-04-30 audit P1: this page used to render entirely from a
 * hardcoded MOCK invoice (`INV-2025-001234`, fake contractor and
 * customer details, fake line items) regardless of the URL's
 * `invoiceId`. A user landing here from a notification or email saw
 * convincing-looking data that had no relationship to their actual
 * invoice — a real trust + safety risk.
 *
 * The canonical web invoice surface is `/payments/invoice/[invoiceId]`,
 * which fetches the real invoice via `/api/contractor/invoices/pay`.
 * This page now permanently redirects there so existing inbound links
 * (notification emails, push payloads, copy/paste shares) keep
 * working without ever showing mock data.
 */
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Invoice | Mintenance',
  robots: { index: false, follow: false },
};

export default async function InvoiceDeepLinkPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = await params;
  redirect(`/payments/invoice/${invoiceId}`);
}
