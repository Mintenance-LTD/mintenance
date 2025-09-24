-- ⚠️ SECURITY CRITICAL: Row Level Security (RLS) Policies
-- These policies enforce data access controls at the database level
-- Apply these to your Supabase project via SQL Editor

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE escrow_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE contractor_endorsements ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view public contractor profiles" ON users
    FOR SELECT USING (role = 'contractor');

-- Jobs table policies
CREATE POLICY "Homeowners can view/edit their own jobs" ON jobs
    FOR ALL USING (auth.uid() = homeowner_id);

CREATE POLICY "Contractors can view available jobs" ON jobs
    FOR SELECT USING (
        status IN ('posted', 'bidding_open') OR
        contractor_id = auth.uid()
    );

CREATE POLICY "Assigned contractors can update job status" ON jobs
    FOR UPDATE USING (
        auth.uid() = contractor_id AND
        status IN ('assigned', 'in_progress')
    );

-- Bids table policies
CREATE POLICY "Contractors can view/create their own bids" ON bids
    FOR ALL USING (auth.uid() = contractor_id);

CREATE POLICY "Homeowners can view bids on their jobs" ON bids
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = bids.job_id
            AND jobs.homeowner_id = auth.uid()
        )
    );

-- Messages table policies
CREATE POLICY "Users can view messages they sent or received" ON messages
    FOR SELECT USING (
        auth.uid() = sender_id OR
        auth.uid() = receiver_id
    );

CREATE POLICY "Users can send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Reviews table policies
CREATE POLICY "Users can view reviews about them or by them" ON reviews
    FOR SELECT USING (
        auth.uid() = reviewer_id OR
        auth.uid() = reviewed_id
    );

CREATE POLICY "Users can create reviews for completed jobs" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id AND
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = reviews.job_id
            AND jobs.status = 'completed'
            AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
        )
    );

-- Escrow transactions policies
CREATE POLICY "Users can view their own transactions" ON escrow_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM jobs
            WHERE jobs.id = escrow_transactions.job_id
            AND (jobs.homeowner_id = auth.uid() OR jobs.contractor_id = auth.uid())
        )
    );

-- Contractor profiles policies
CREATE POLICY "Anyone can view contractor profiles" ON contractor_profiles
    FOR SELECT USING (true);

CREATE POLICY "Contractors can update their own profile" ON contractor_profiles
    FOR ALL USING (auth.uid() = user_id);

-- Contractor skills policies
CREATE POLICY "Anyone can view contractor skills" ON contractor_skills
    FOR SELECT USING (true);

CREATE POLICY "Contractors can manage their own skills" ON contractor_skills
    FOR ALL USING (auth.uid() = contractor_id);

-- Contractor matches policies
CREATE POLICY "Homeowners can view their matches" ON contractor_matches
    FOR SELECT USING (auth.uid() = homeowner_id);

CREATE POLICY "Contractors can view matches about them" ON contractor_matches
    FOR SELECT USING (auth.uid() = contractor_id);

CREATE POLICY "Homeowners can create matches" ON contractor_matches
    FOR INSERT WITH CHECK (auth.uid() = homeowner_id);

-- Contractor posts policies
CREATE POLICY "Anyone can view contractor posts" ON contractor_posts
    FOR SELECT USING (true);

CREATE POLICY "Contractors can manage their own posts" ON contractor_posts
    FOR ALL USING (auth.uid() = contractor_id);

-- Contractor follows policies
CREATE POLICY "Users can view their follows" ON contractor_follows
    FOR SELECT USING (
        auth.uid() = follower_id OR
        auth.uid() = following_id
    );

CREATE POLICY "Users can manage their own follows" ON contractor_follows
    FOR ALL USING (auth.uid() = follower_id);

-- Contractor endorsements policies
CREATE POLICY "Anyone can view endorsements" ON contractor_endorsements
    FOR SELECT USING (true);

CREATE POLICY "Users can create endorsements" ON contractor_endorsements
    FOR INSERT WITH CHECK (
        auth.uid() = endorser_id AND
        auth.uid() != contractor_id -- Can't endorse yourself
    );

-- Security functions
CREATE OR REPLACE FUNCTION check_user_role(required_role text)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Additional security constraints
ALTER TABLE users ADD CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
ALTER TABLE users ADD CONSTRAINT valid_role CHECK (role IN ('homeowner', 'contractor', 'admin'));
ALTER TABLE jobs ADD CONSTRAINT positive_budget CHECK (budget > 0);
ALTER TABLE bids ADD CONSTRAINT positive_amount CHECK (amount > 0);
ALTER TABLE escrow_transactions ADD CONSTRAINT positive_amount CHECK (amount > 0);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_homeowner_id ON jobs(homeowner_id);
CREATE INDEX IF NOT EXISTS idx_jobs_contractor_id ON jobs(contractor_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_bids_job_id ON bids(job_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_job_id ON messages(job_id);

-- Audit triggers for sensitive operations
CREATE OR REPLACE FUNCTION audit_sensitive_changes()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_log (
        table_name,
        operation,
        user_id,
        old_data,
        new_data,
        timestamp
    ) VALUES (
        TG_TABLE_NAME,
        TG_OP,
        auth.uid(),
        CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        NOW()
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_escrow_transactions ON escrow_transactions;
CREATE TRIGGER audit_escrow_transactions
    AFTER INSERT OR UPDATE OR DELETE ON escrow_transactions
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

DROP TRIGGER IF EXISTS audit_user_changes ON users;
CREATE TRIGGER audit_user_changes
    AFTER UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_changes();

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    user_id UUID REFERENCES users(id),
    old_data JSONB,
    new_data JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on audit log
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" ON audit_log
    FOR SELECT USING (check_user_role('admin'));

-- Comments for documentation
COMMENT ON TABLE users IS 'User accounts with role-based access control';
COMMENT ON TABLE jobs IS 'Job postings with homeowner/contractor assignment';
COMMENT ON TABLE bids IS 'Contractor bids on jobs';
COMMENT ON TABLE messages IS 'Direct messages between users for specific jobs';
COMMENT ON TABLE reviews IS 'User reviews and ratings';
COMMENT ON TABLE escrow_transactions IS 'Payment transactions with escrow protection';
COMMENT ON TABLE audit_log IS 'Security audit trail for sensitive operations';