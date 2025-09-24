/**
 * Client Management Types
 * 
 * Contains all TypeScript interfaces and types for client management functionality.
 */

export interface Client {
  id: string;
  contractorId: string;
  type: 'individual' | 'business' | 'property_manager';
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  address: ClientAddress;
  status: 'prospect' | 'active' | 'inactive' | 'former';
  priority: 'low' | 'medium' | 'high' | 'vip';
  source: string;
  tags: string[];
  notes: string;
  preferences: ClientPreferences;
  lifecycle: ClientLifecycle;
  financials: ClientFinancials;
  properties: Property[];
  createdAt: string;
  updatedAt: string;
}

export interface ClientAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface ClientPreferences {
  communicationMethod: 'email' | 'phone' | 'sms' | 'app';
  bestTimeToContact: string;
  serviceTypes: string[];
  budgetRange: [number, number];
  urgencyPreference: 'immediate' | 'scheduled' | 'flexible';
  paymentMethod: 'cash' | 'check' | 'card' | 'bank_transfer';
}

export interface ClientLifecycle {
  stage: 'lead' | 'prospect' | 'customer' | 'repeat_customer' | 'advocate';
  stageDate: string;
  totalJobs: number;
  totalValue: number;
  avgJobValue: number;
  lastJobDate?: string;
  nextFollowUp?: string;
  acquisitionDate?: string;
  lifetimeValue: number;
  satisfactionScore: number;
  retentionRisk: number;
}

export interface ClientFinancials {
  totalSpent: number;
  outstandingBalance: number;
  creditLimit?: number;
  paymentHistory: PaymentRecord[];
  averagePaymentTime: number;
  paymentRating: number;
}

export interface PaymentRecord {
  jobId: string;
  amount: number;
  dueDate: string;
  paidDate?: string;
  status: 'pending' | 'paid' | 'overdue' | 'partial';
  method: string;
}

export interface Property {
  id: string;
  clientId: string;
  type: 'residential' | 'commercial' | 'industrial';
  address: ClientAddress;
  size?: number;
  yearBuilt?: number;
  description?: string;
  features: string[];
  maintenanceHistory: MaintenanceRecord[];
  isActive: boolean;
  createdAt: string;
}

export interface MaintenanceRecord {
  jobId: string;
  date: string;
  serviceType: string;
  description: string;
  cost: number;
  contractor: string;
  rating?: number;
  notes?: string;
}

export interface ClientInteraction {
  id: string;
  clientId: string;
  contractorId: string;
  type: 'call' | 'email' | 'meeting' | 'job' | 'follow_up' | 'complaint' | 'compliment';
  subject: string;
  description: string;
  outcome?: string;
  nextAction?: string;
  scheduledDate?: string;
  completedDate?: string;
  duration?: number;
  attachments: string[];
  createdAt: string;
}

export interface ClientSegment {
  id: string;
  contractorId: string;
  name: string;
  description: string;
  criteria: SegmentCriteria;
  clientCount: number;
  avgValue: number;
  isActive: boolean;
  createdAt: string;
}

export interface SegmentCriteria {
  status?: Client['status'][];
  priority?: Client['priority'][];
  type?: Client['type'][];
  tags?: string[];
  lifecycleStage?: ClientLifecycle['stage'][];
  totalSpentRange?: [number, number];
  lastJobDateRange?: [string, string];
  location?: {
    city?: string;
    state?: string;
    radius?: number;
    center?: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface ClientAnalytics {
  contractorId: string;
  period: {
    start: string;
    end: string;
  };
  summary: {
    totalClients: number;
    activeClients: number;
    newClients: number;
    churnedClients: number;
    avgClientValue: number;
    totalRevenue: number;
    avgSatisfactionScore: number;
  };
  lifecycle: {
    leads: number;
    prospects: number;
    customers: number;
    repeatCustomers: number;
    advocates: number;
  };
  trends: {
    clientGrowth: number[];
    revenueByClient: number[];
    satisfactionTrend: number[];
    churnRate: number[];
  };
  topPerformers: Client[];
  atRiskClients: Client[];
  opportunities: Client[];
  lastCalculated: string;
}

export interface ClientFilters {
  status?: Client['status'][];
  priority?: Client['priority'][];
  type?: Client['type'][];
  tags?: string[];
  lifecycleStage?: ClientLifecycle['stage'][];
  source?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  location?: {
    city?: string;
    state?: string;
    radius?: number;
    center?: {
      latitude: number;
      longitude: number;
    };
  };
  financialRange?: {
    minSpent: number;
    maxSpent: number;
  };
}

export interface ClientSortOptions {
  field: 'firstName' | 'lastName' | 'status' | 'priority' | 'createdAt' | 'lastJobDate' | 'totalValue';
  direction: 'asc' | 'desc';
}

export interface CreateClientRequest {
  contractorId: string;
  type: Client['type'];
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  companyName?: string;
  address: ClientAddress;
  status?: Client['status'];
  priority?: Client['priority'];
  source: string;
  tags?: string[];
  notes?: string;
  preferences?: Partial<ClientPreferences>;
}

export interface UpdateClientRequest {
  id: string;
  updates: Partial<Pick<Client, 'firstName' | 'lastName' | 'email' | 'phone' | 'companyName' | 'address' | 'status' | 'priority' | 'tags' | 'notes' | 'preferences'>>;
}

export interface ClientSearchParams {
  query?: string;
  filters?: ClientFilters;
  sort?: ClientSortOptions;
  page?: number;
  limit?: number;
}

export interface ClientImportData {
  clients: Omit<CreateClientRequest, 'contractorId'>[];
  mapping: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    companyName?: string;
    address: string;
    status?: string;
    priority?: string;
    source?: string;
    tags?: string;
    notes?: string;
  };
  options: {
    skipDuplicates: boolean;
    updateExisting: boolean;
    defaultStatus: Client['status'];
    defaultPriority: Client['priority'];
  };
}

export interface ClientExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields: string[];
  filters?: ClientFilters;
  includeProperties: boolean;
  includeInteractions: boolean;
  includeFinancials: boolean;
}

export interface ClientCommunicationTemplate {
  id: string;
  contractorId: string;
  name: string;
  type: 'email' | 'sms' | 'letter';
  subject?: string;
  content: string;
  variables: string[];
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

export interface ClientFollowUpTask {
  id: string;
  clientId: string;
  contractorId: string;
  type: 'call' | 'email' | 'meeting' | 'quote' | 'check_in';
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  completedDate?: string;
  notes?: string;
  createdAt: string;
}
