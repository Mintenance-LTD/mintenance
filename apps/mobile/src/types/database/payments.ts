/**
 * Payment and Financial Tables
 * 
 * This module contains all database types related to payments,
 * escrow transactions, and financial management.
 */

export type PaymentTables = {
  escrow_transactions: {
    Row: {
      id: string
      job_id: string
      homeowner_id: string
      contractor_id: string
      amount: number
      status: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed'
      stripe_payment_intent_id: string | null
      stripe_transfer_id: string | null
      created_at: string
      updated_at: string
      completed_at: string | null
      refunded_at: string | null
      dispute_reason: string | null
      platform_fee: number | null
      contractor_payout: number | null
    }
    Insert: {
      id?: string
      job_id: string
      homeowner_id: string
      contractor_id: string
      amount: number
      status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed'
      stripe_payment_intent_id?: string | null
      stripe_transfer_id?: string | null
      created_at?: string
      updated_at?: string
      completed_at?: string | null
      refunded_at?: string | null
      dispute_reason?: string | null
      platform_fee?: number | null
      contractor_payout?: number | null
    }
    Update: {
      id?: string
      job_id?: string
      homeowner_id?: string
      contractor_id?: string
      amount?: number
      status?: 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'disputed'
      stripe_payment_intent_id?: string | null
      stripe_transfer_id?: string | null
      created_at?: string
      updated_at?: string
      completed_at?: string | null
      refunded_at?: string | null
      dispute_reason?: string | null
      platform_fee?: number | null
      contractor_payout?: number | null
    }
    Relationships: [
      {
        foreignKeyName: "escrow_transactions_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "escrow_transactions_homeowner_id_fkey"
        columns: ["homeowner_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "escrow_transactions_contractor_id_fkey"
        columns: ["contractor_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
  homeowner_expenses: {
    Row: {
      id: string
      homeowner_id: string
      job_id: string | null
      category: string
      description: string
      amount: number
      expense_date: string
      created_at: string
      updated_at: string
      receipt_url: string | null
      is_tax_deductible: boolean | null
    }
    Insert: {
      id?: string
      homeowner_id: string
      job_id?: string | null
      category: string
      description: string
      amount: number
      expense_date: string
      created_at?: string
      updated_at?: string
      receipt_url?: string | null
      is_tax_deductible?: boolean | null
    }
    Update: {
      id?: string
      homeowner_id?: string
      job_id?: string | null
      category?: string
      description?: string
      amount?: number
      expense_date?: string
      created_at?: string
      updated_at?: string
      receipt_url?: string | null
      is_tax_deductible?: boolean | null
    }
    Relationships: [
      {
        foreignKeyName: "homeowner_expenses_homeowner_id_fkey"
        columns: ["homeowner_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "homeowner_expenses_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
    ]
  }
  home_investments: {
    Row: {
      id: string
      homeowner_id: string
      job_id: string | null
      investment_type: 'renovation' | 'maintenance' | 'upgrade' | 'repair'
      description: string
      amount: number
      expected_roi: number | null
      investment_date: string
      created_at: string
      updated_at: string
      completion_date: string | null
      actual_roi: number | null
    }
    Insert: {
      id?: string
      homeowner_id: string
      job_id?: string | null
      investment_type: 'renovation' | 'maintenance' | 'upgrade' | 'repair'
      description: string
      amount: number
      expected_roi?: number | null
      investment_date: string
      created_at?: string
      updated_at?: string
      completion_date?: string | null
      actual_roi?: number | null
    }
    Update: {
      id?: string
      homeowner_id?: string
      job_id?: string | null
      investment_type?: 'renovation' | 'maintenance' | 'upgrade' | 'repair'
      description?: string
      amount?: number
      expected_roi?: number | null
      investment_date?: string
      created_at?: string
      updated_at?: string
      completion_date?: string | null
      actual_roi?: number | null
    }
    Relationships: [
      {
        foreignKeyName: "home_investments_homeowner_id_fkey"
        columns: ["homeowner_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
      {
        foreignKeyName: "home_investments_job_id_fkey"
        columns: ["job_id"]
        isOneToOne: false
        referencedRelation: "jobs"
        referencedColumns: ["id"]
      },
    ]
  }
  monthly_budgets: {
    Row: {
      id: string
      homeowner_id: string
      month: number
      year: number
      total_budget: number
      spent_amount: number | null
      remaining_amount: number | null
      created_at: string
      updated_at: string
      budget_categories: Record<string, number> | null
    }
    Insert: {
      id?: string
      homeowner_id: string
      month: number
      year: number
      total_budget: number
      spent_amount?: number | null
      remaining_amount?: number | null
      created_at?: string
      updated_at?: string
      budget_categories?: Record<string, number> | null
    }
    Update: {
      id?: string
      homeowner_id?: string
      month?: number
      year?: number
      total_budget?: number
      spent_amount?: number | null
      remaining_amount?: number | null
      created_at?: string
      updated_at?: string
      budget_categories?: Record<string, number> | null
    }
    Relationships: [
      {
        foreignKeyName: "monthly_budgets_homeowner_id_fkey"
        columns: ["homeowner_id"]
        isOneToOne: false
        referencedRelation: "users"
        referencedColumns: ["id"]
      },
    ]
  }
}
