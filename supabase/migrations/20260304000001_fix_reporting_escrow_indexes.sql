-- Fix slow queries for contractor reporting and escrow screens
-- Adds missing indexes on escrow_transactions and messages tables

-- escrow_transactions: payee_id lookup (used by /api/contractor/escrows)
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_payee_id
  ON escrow_transactions (payee_id, created_at DESC)
  WHERE payee_id IS NOT NULL;

-- escrow_transactions: payee_id (contractor) + status (used by /api/contractor/marketing-stats)
-- Note: contractor is the payee in escrow_transactions; table has no contractor_id column.
CREATE INDEX IF NOT EXISTS idx_escrow_transactions_contractor_status
  ON escrow_transactions (payee_id, status)
  WHERE payee_id IS NOT NULL;

-- messages: sender_id index (used for filtering messages by sender)
-- Note: messages table uses thread-based model (sender_id + thread_id), not recipient_id.
-- message_threads.participant_ids already has a GIN index (idx_message_threads_participant_ids_gin).
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON messages (sender_id, created_at DESC)
  WHERE sender_id IS NOT NULL;
