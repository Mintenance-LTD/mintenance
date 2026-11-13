// Common data types used throughout the application
export interface Job {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface Bid {
  id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  message: string;
  status: string;
  created_at: string;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  [key: string]: unknown;
}
