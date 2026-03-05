export const BUSINESS_SUITE_KEYS = {
  all: ["business-suite"] as const,
  metrics: (contractorId: string, period?: string) => ["business-suite", "metrics", contractorId, period] as const,
  financial: (contractorId: string) => ["business-suite", "financial", contractorId] as const,
  clients: (contractorId: string) => ["business-suite", "clients", contractorId] as const,
  marketing: (contractorId: string) => ["business-suite", "marketing", contractorId] as const,
  invoices: (contractorId: string, status?: string) => ["business-suite", "invoices", contractorId, status] as const,
  expenses: (contractorId: string, period?: string) => ["business-suite", "expenses", contractorId, period] as const,
  schedule: (contractorId: string, date?: string) => ["business-suite", "schedule", contractorId, date] as const,
  inventory: (contractorId: string) => ["business-suite", "inventory", contractorId] as const,
  campaigns: (contractorId: string) => ["business-suite", "campaigns", contractorId] as const,
  goals: (contractorId: string) => ["business-suite", "goals", contractorId] as const,
};
