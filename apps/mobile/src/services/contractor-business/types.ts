// =====================================================
// BUSINESS ANALYTICS & PERFORMANCE TYPES
// =====================================================

export interface BusinessMetrics {
  id: string;
  contractor_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  total_jobs: number;
  completed_jobs: number;
  cancelled_jobs: number;
  average_job_value: number;
  completion_rate: number;
  client_satisfaction: number;
  repeat_client_rate: number;
  response_time_avg: number; // minutes
  quote_conversion_rate: number;
  profit_margin: number;
  created_at: string;
  updated_at: string;
}

export interface FinancialSummary {
  monthly_revenue: number[];
  quarterly_growth: number;
  yearly_projection: number;
  outstanding_invoices: number;
  overdue_amount: number;
  profit_trends: {
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }[];
  tax_obligations: number;
  cash_flow_forecast: {
    week: string;
    projected_income: number;
    projected_expenses: number;
    net_flow: number;
  }[];
}

export interface ClientAnalytics {
  total_clients: number;
  new_clients_this_month: number;
  repeat_clients: number;
  client_lifetime_value: number;
  churn_rate: number;
  acquisition_channels: {
    channel: string;
    clients: number;
    conversion_rate: number;
    cost_per_acquisition: number;
  }[];
  client_satisfaction_trend: {
    month: string;
    rating: number;
    reviews_count: number;
  }[];
}

export interface MarketingInsights {
  profile_views: number;
  quote_requests: number;
  conversion_funnel: {
    stage: string;
    count: number;
    conversion_rate: number;
  }[];
  competitor_analysis: {
    average_pricing: number;
    market_position: string;
    rating_comparison: number;
  };
  seasonal_trends: {
    month: string;
    demand_score: number;
    optimal_pricing: number;
  }[];
  growth_opportunities: {
    service_type: string;
    demand_increase: number;
    revenue_potential: number;
  }[];
}

// =====================================================
// FINANCIAL MANAGEMENT TYPES
// =====================================================

export interface Invoice {
  id: string;
  contractor_id: string;
  job_id?: string;
  client_id: string;
  invoice_number: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  due_date: string;
  issue_date: string;
  paid_date?: string;
  notes?: string;
  line_items: InvoiceLineItem[];
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface ExpenseRecord {
  id: string;
  contractor_id: string;
  category: string;
  subcategory?: string;
  amount: number;
  description: string;
  date: string;
  receipt_url?: string;
  tax_deductible: boolean;
  vendor?: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentRecord {
  id: string;
  contractor_id: string;
  invoice_id?: string;
  amount: number;
  payment_method: string;
  payment_date: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

// =====================================================
// SCHEDULE & RESOURCE MANAGEMENT TYPES
// =====================================================

export interface ContractorSchedule {
  id: string;
  contractor_id: string;
  job_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  type: 'job' | 'consultation' | 'break' | 'personal';
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  location?: string;
  client_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceInventory {
  id: string;
  contractor_id: string;
  item_name: string;
  category: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  supplier?: string;
  last_restocked: string;
  minimum_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface EquipmentManagement {
  id: string;
  contractor_id: string;
  equipment_name: string;
  type: string;
  model?: string;
  serial_number?: string;
  purchase_date: string;
  purchase_price: number;
  current_value: number;
  condition: 'excellent' | 'good' | 'fair' | 'poor';
  last_maintenance: string;
  next_maintenance: string;
  maintenance_cost: number;
  location?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'retired';
  created_at: string;
  updated_at: string;
}

// =====================================================
// MARKETING & GROWTH TYPES
// =====================================================

export interface MarketingCampaign {
  id: string;
  contractor_id: string;
  campaign_name: string;
  type: 'email' | 'social' | 'paid_ads' | 'referral' | 'local_advertising';
  status: 'planning' | 'active' | 'paused' | 'completed';
  budget: number;
  spent: number;
  start_date: string;
  end_date: string;
  target_audience: string;
  goals: string[];
  metrics: {
    impressions?: number;
    clicks?: number;
    conversions?: number;
    cost_per_click?: number;
    conversion_rate?: number;
  };
  created_at: string;
  updated_at: string;
}

export interface LeadTracking {
  id: string;
  contractor_id: string;
  lead_source: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  service_requested: string;
  estimated_value: number;
  probability: number; // 0-100
  status: 'new' | 'contacted' | 'quoted' | 'negotiating' | 'won' | 'lost';
  notes?: string;
  follow_up_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewManagement {
  id: string;
  contractor_id: string;
  job_id?: string;
  client_name: string;
  rating: number;
  comment?: string;
  platform: 'internal' | 'google' | 'yelp' | 'facebook' | 'angie';
  response?: string;
  responded_at?: string;
  public: boolean;
  featured: boolean;
  created_at: string;
}