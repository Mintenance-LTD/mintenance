import { serverSupabase } from '@/lib/api/supabaseServer';

/** Called before delivery; a notification never acknowledges an incident. */
export async function shouldDeliverEmergencyReport(
  type: string,
  metadata: Record<string, unknown>,
  userId: string
): Promise<boolean> {
  if (type !== 'emergency_report') return true;
  if (
    typeof metadata.emergency_report_id !== 'string' ||
    typeof metadata.emergency_cycle !== 'string'
  )
    return false;
  const { data, error } = await serverSupabase.rpc(
    'should_deliver_emergency_report',
    {
      p_report: metadata.emergency_report_id,
      p_actor: userId,
      p_cycle: metadata.emergency_cycle,
    }
  );
  if (error) throw new Error('Emergency assignment could not be verified');
  return data === true;
}

export async function advanceEmergencyReports(): Promise<number> {
  const { data, error } = await serverSupabase.rpc('advance_emergency_reports');
  if (error) throw new Error('Emergency report escalation failed');
  return data ?? 0;
}
