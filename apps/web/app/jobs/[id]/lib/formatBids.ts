/**
 * Bid formatting for the job detail page. Extracted from page.tsx to keep that
 * server component under the 500-line limit and to isolate the shape the client
 * BidCard / JobDetailsProfessional components consume.
 */

export interface BidWithContractor {
  id: string;
  status: string;
  amount?: number;
  description?: string;
  created_at: string;
  contractor_id: string;
  quote_id?: string;
  // 2026-05-13 BidCard upgrade: comparison axes beyond price. Homeowners need
  // schedule + warranty visibility to weigh bids properly; previously these
  // were on the bid but never surfaced.
  estimated_duration_days?: number | null;
  proposed_start_date?: string | null;
  warranty_months?: number | null;
  materials_included?: boolean | null;
  lineItems?: Array<{
    id: string;
    description: string;
    type?: 'labor' | 'material' | 'equipment';
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  quote?: {
    id?: string;
    subtotal?: number | null;
    tax_rate?: number | null;
    tax_amount?: number | null;
    total_amount?: number | null;
    terms?: string | null;
    quote_number?: string | null;
  } | null;
  contractor?: {
    id: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
    email?: string;
    phone?: string;
    profile_image_url?: string;
    admin_verified?: boolean;
    license_number?: string;
    rating?: number;
    portfolioImages?: Array<{
      url: string;
      title?: string;
      category?: string;
    }>;
  };
}

/**
 * Map raw bid+contractor rows into the shape the client components consume.
 *
 * PII leak fix (2026-07-10 audit): every pending bidder's email/phone used to be
 * serialized into the homeowner's page payload (visible in the RSC stream)
 * before any bid was accepted — a contact-info leak and platform-
 * disintermediation vector. Contact happens via the auto-created message
 * thread, so email/phone are neither fetched (see the bids query in page.tsx)
 * nor emitted here.
 */
export function formatBidsForClient(bids: BidWithContractor[]) {
  return bids.map((bid) => ({
    id: bid.id,
    amount: bid.amount || 0,
    description: bid.description,
    status: bid.status,
    created_at: bid.created_at,
    quote_id: bid.quote_id,
    estimatedDurationDays: bid.estimated_duration_days ?? null,
    proposedStartDate: bid.proposed_start_date ?? null,
    warrantyMonths: bid.warranty_months ?? null,
    materialsIncluded: bid.materials_included ?? null,
    lineItems: bid.lineItems?.map((li) => ({
      ...li,
      type: li.type || ('labor' as const),
    })),
    quote: bid.quote
      ? {
          subtotal: bid.quote.subtotal ?? null,
          taxRate: bid.quote.tax_rate ?? null,
          taxAmount: bid.quote.tax_amount ?? null,
          totalAmount: bid.quote.total_amount ?? null,
          terms: bid.quote.terms ?? null,
          quoteNumber: bid.quote.quote_number ?? null,
        }
      : null,
    contractor: {
      id: bid.contractor?.id || '',
      first_name: bid.contractor?.first_name,
      last_name: bid.contractor?.last_name,
      company_name: bid.contractor?.company_name,
      email: '',
      phone: null,
      profile_image_url: bid.contractor?.profile_image_url,
      admin_verified: bid.contractor?.admin_verified,
      license_number: bid.contractor?.license_number,
    },
  }));
}
