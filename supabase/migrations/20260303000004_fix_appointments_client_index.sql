-- Add missing client_id index on appointments table
-- Required for homeowner queries in /api/appointments (currently a full table scan)
CREATE INDEX IF NOT EXISTS idx_appointments_client_id_status
  ON appointments (client_id, status)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_client_date
  ON appointments (client_id, appointment_date)
  WHERE client_id IS NOT NULL;
