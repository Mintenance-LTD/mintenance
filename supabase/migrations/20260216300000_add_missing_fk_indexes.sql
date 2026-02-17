-- ============================================================
-- Add Missing Foreign Key Indexes
-- ============================================================
-- PostgreSQL does NOT auto-index foreign key columns.
-- These indexes improve JOIN and WHERE performance on FK columns
-- that are frequently queried but lack indexes.
--
-- Already indexed (verified): messages.thread_id, messages.sender_id,
--   messages.receiver_id, message_threads.job_id, reviews.job_id,
--   reviews.reviewer_id, contractor_skills.contractor_id, properties.owner_id
-- ============================================================

-- reviews.reviewee_id - used for contractor profile rating queries
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id
  ON reviews(reviewee_id);

-- message_threads.participant_ids - UUID[] array, needs GIN for containment queries
-- Query pattern: WHERE auth.uid() = ANY(participant_ids)
CREATE INDEX IF NOT EXISTS idx_message_threads_participants
  ON message_threads USING GIN (participant_ids);

-- disputes foreign keys - used for job dispute lookups
CREATE INDEX IF NOT EXISTS idx_disputes_job_id
  ON disputes(job_id);
CREATE INDEX IF NOT EXISTS idx_disputes_raised_by
  ON disputes(raised_by);
CREATE INDEX IF NOT EXISTS idx_disputes_against
  ON disputes(against);

-- payment_methods.user_id - used for payment method selection
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_id
  ON payment_methods(user_id);

-- contractor_certifications.contractor_id - used for profile display
CREATE INDEX IF NOT EXISTS idx_contractor_certifications_contractor_id
  ON contractor_certifications(contractor_id);
