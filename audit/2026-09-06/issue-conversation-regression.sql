-- Isolated synthetic database only. No fixture persists.
BEGIN;
INSERT INTO auth.users(id,email) VALUES ('00000000-0000-4000-8000-000000008101','owner-issue-regression@example.invalid'),('00000000-0000-4000-8000-000000008102','contractor-issue-regression@example.invalid');
INSERT INTO profiles(id,email,role) VALUES ('00000000-0000-4000-8000-000000008101','owner-issue-regression@example.invalid','homeowner'),('00000000-0000-4000-8000-000000008102','contractor-issue-regression@example.invalid','contractor') ON CONFLICT DO NOTHING;
INSERT INTO properties(id,owner_id,property_name,address,property_type) VALUES ('00000000-0000-4000-8000-000000008103','00000000-0000-4000-8000-000000008101','Synthetic home','Synthetic address','residential');
INSERT INTO anonymous_report_tokens(id,owner_id,property_id) VALUES ('00000000-0000-4000-8000-000000008104','00000000-0000-4000-8000-000000008101','00000000-0000-4000-8000-000000008103');
INSERT INTO anonymous_reports(id,token_id,property_id,reporter_name,description,conversation_key_hash) VALUES ('00000000-0000-4000-8000-000000008105','00000000-0000-4000-8000-000000008104','00000000-0000-4000-8000-000000008103','Synthetic resident','Synthetic repair','synthetic-hash');
INSERT INTO appointments(id,contractor_id,client_id,title,appointment_date,start_time,end_time,status) VALUES ('00000000-0000-4000-8000-000000008106','00000000-0000-4000-8000-000000008102','00000000-0000-4000-8000-000000008101','Synthetic visit','2026-12-01','10:00','11:00','scheduled');
DO $$
DECLARE r uuid='00000000-0000-4000-8000-000000008105'; owner_key uuid='00000000-0000-4000-8000-000000008101'; outsider uuid='00000000-0000-4000-8000-000000008102'; message_key uuid='00000000-0000-4000-8000-000000008107'; visit uuid='00000000-0000-4000-8000-000000008106';
BEGIN
 BEGIN PERFORM report_conversation(r,NULL,'wrong'); RAISE EXCEPTION 'Wrong receipt accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM report_conversation(r,outsider,NULL); RAISE EXCEPTION 'Unassigned contractor accepted'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM report_conversation(r,NULL,'synthetic-hash',message_key,'Please confirm access');
 PERFORM report_conversation(r,NULL,'synthetic-hash',message_key,'Please confirm access');
 IF (SELECT count(*) FROM report_messages WHERE report_id=r)<>1 THEN RAISE EXCEPTION 'Duplicate message'; END IF;
 IF (SELECT count(*) FROM notification_queue WHERE metadata->>'reportId'=r::text)<>1 THEN RAISE EXCEPTION 'Duplicate notification'; END IF;
 BEGIN PERFORM report_conversation(r,NULL,'synthetic-hash',message_key,'Different message'); RAISE EXCEPTION 'Payload mismatch accepted'; EXCEPTION WHEN invalid_parameter_value THEN NULL; END;
 PERFORM report_conversation(r,owner_key,NULL);
 BEGIN PERFORM respond_to_visit(outsider,visit,'2026-12-01','10:00','11:00','confirmed'); RAISE EXCEPTION 'Wrong client confirmed'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 PERFORM respond_to_visit(owner_key,visit,'2026-12-01','10:00','11:00','confirmed');
 PERFORM respond_to_visit(owner_key,visit,'2026-12-01','10:00','11:00','confirmed');
 IF (SELECT count(*) FROM notification_queue WHERE metadata->>'appointmentId'=visit::text)<>1 THEN RAISE EXCEPTION 'Duplicate confirmation notice'; END IF;
 UPDATE appointments SET start_time='10:30' WHERE id=visit;
 IF (SELECT client_response FROM appointments WHERE id=visit)<>'pending' THEN RAISE EXCEPTION 'Reschedule retained confirmation'; END IF;
 BEGIN PERFORM respond_to_visit(owner_key,visit,'2026-12-01','10:00','11:00','confirmed'); RAISE EXCEPTION 'Stale confirmation accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 PERFORM respond_to_visit(owner_key,visit,'2026-12-01','10:30','11:00','confirmed');
 UPDATE appointments SET end_time='11:30' WHERE id=visit;
 IF (SELECT client_response FROM appointments WHERE id=visit)<>'pending' THEN RAISE EXCEPTION 'End-time change retained confirmation'; END IF;
 BEGIN PERFORM respond_to_visit(owner_key,visit,'2026-12-01','10:30','11:00','confirmed'); RAISE EXCEPTION 'Stale end time accepted'; EXCEPTION WHEN serialization_failure THEN NULL; END;
 UPDATE anonymous_reports SET status='acknowledged' WHERE id=r;
 IF NOT EXISTS(SELECT 1 FROM report_messages WHERE report_id=r AND author_role='system') THEN RAISE EXCEPTION 'Missing status history'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000008102',true);
SET LOCAL ROLE authenticated;
DO $$ BEGIN
 BEGIN
  UPDATE appointments SET client_response='confirmed' WHERE id='00000000-0000-4000-8000-000000008106';
  RAISE EXCEPTION 'Direct confirmation accepted';
 EXCEPTION WHEN insufficient_privilege THEN NULL;
 END;
END $$;
ROLLBACK;
