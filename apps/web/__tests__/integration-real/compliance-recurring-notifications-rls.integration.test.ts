// @vitest-environment node
/** Real-DB ownership checks for landlord compliance, recurring work, and notifications. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAuthenticatedClient,
  createServiceClient,
  isLocalSupabaseAvailable,
} from '../../test/integration/supabase-test-client';
import { createTestUser, type TestUser } from '../../test/integration/fixtures';

describe('compliance, recurring schedules, and notifications RLS (real DB)', () => {
  let ownerA: TestUser;
  let ownerB: TestUser;
  let ownerAClient: SupabaseClient;
  let ownerBClient: SupabaseClient;
  let propertyAId: string;
  let propertyBId: string;
  let certificateId: string;
  let maintenanceScheduleId: string;
  let recurringScheduleId: string;
  let notificationId: string;
  let queueId: string;

  beforeAll(async () => {
    if (!(await isLocalSupabaseAvailable())) {
      throw new Error('Local Supabase is required for ownership tests');
    }

    ownerA = await createTestUser({ role: 'homeowner' });
    ownerB = await createTestUser({ role: 'homeowner' });
    ownerAClient = await createAuthenticatedClient(
      ownerA.email,
      ownerA.password
    );
    ownerBClient = await createAuthenticatedClient(
      ownerB.email,
      ownerB.password
    );

    const service = createServiceClient();
    const { data: propertyA, error: propertyAError } = await service
      .from('properties')
      .insert({
        owner_id: ownerA.id,
        property_name: 'itest_compliance_property_a',
        property_type: 'residential',
        address: '1 Compliance Street',
      })
      .select('id')
      .single();
    if (propertyAError || !propertyA) throw new Error(propertyAError?.message);
    propertyAId = propertyA.id;

    const { data: propertyB, error: propertyBError } = await service
      .from('properties')
      .insert({
        owner_id: ownerB.id,
        property_name: 'itest_compliance_property_b',
        property_type: 'residential',
        address: '2 Compliance Street',
      })
      .select('id')
      .single();
    if (propertyBError || !propertyB) throw new Error(propertyBError?.message);
    propertyBId = propertyB.id;

    const { data: certificate, error: certificateError } = await service
      .from('compliance_certificates')
      .insert({
        property_id: propertyAId,
        owner_id: ownerA.id,
        cert_type: 'gas_safety',
        expiry_date: '2030-01-01',
        status: 'valid',
      })
      .select('id')
      .single();
    if (certificateError || !certificate)
      throw new Error(certificateError?.message);
    certificateId = certificate.id;

    const { data: maintenance, error: maintenanceError } = await service
      .from('recurring_maintenance_schedules')
      .insert({
        property_id: propertyAId,
        title: 'itest boiler service',
        category: 'gas',
        frequency: 'yearly',
        next_due_date: '2030-01-01',
        created_by: ownerA.id,
      })
      .select('id')
      .single();
    if (maintenanceError || !maintenance)
      throw new Error(maintenanceError?.message);
    maintenanceScheduleId = maintenance.id;

    const { data: recurring, error: recurringError } = await service
      .from('recurring_schedules')
      .insert({
        property_id: propertyAId,
        owner_id: ownerA.id,
        task_type: 'boiler_service',
        title: 'itest recurring boiler service',
        frequency: 'annual',
        next_due_date: '2030-01-01',
      })
      .select('id')
      .single();
    if (recurringError || !recurring) throw new Error(recurringError?.message);
    recurringScheduleId = recurring.id;

    const { data: notification, error: notificationError } = await service
      .from('notifications')
      .insert({
        user_id: ownerA.id,
        title: 'itest notice',
        message: 'itest message',
      })
      .select('id')
      .single();
    if (notificationError || !notification)
      throw new Error(notificationError?.message);
    notificationId = notification.id;

    const { data: queue, error: queueError } = await service
      .from('notification_queue')
      .insert({
        user_id: ownerA.id,
        notification_type: 'itest',
        priority: 'low',
        title: 'itest queued notice',
        message: 'itest queued message',
        scheduled_for: '2030-01-01T00:00:00Z',
      })
      .select('id')
      .single();
    if (queueError || !queue) throw new Error(queueError?.message);
    queueId = queue.id;
  }, 30_000);

  afterAll(async () => {
    const service = createServiceClient();
    if (queueId)
      await service.from('notification_queue').delete().eq('id', queueId);
    if (notificationId)
      await service.from('notifications').delete().eq('id', notificationId);
    if (recurringScheduleId)
      await service
        .from('recurring_schedules')
        .delete()
        .eq('id', recurringScheduleId);
    if (maintenanceScheduleId)
      await service
        .from('recurring_maintenance_schedules')
        .delete()
        .eq('id', maintenanceScheduleId);
    if (certificateId)
      await service
        .from('compliance_certificates')
        .delete()
        .eq('id', certificateId);
    if (propertyAId)
      await service.from('properties').delete().eq('id', propertyAId);
    if (propertyBId)
      await service.from('properties').delete().eq('id', propertyBId);
    await ownerA?.cleanup();
    await ownerB?.cleanup();
  });

  it('keeps compliance certificates and recurring schedules property-owner scoped', async () => {
    const ownCertificate = await ownerAClient
      .from('compliance_certificates')
      .select('id')
      .eq('id', certificateId)
      .single();
    expect(ownCertificate.error).toBeNull();
    const foreignCertificate = await ownerBClient
      .from('compliance_certificates')
      .select('id')
      .eq('id', certificateId)
      .maybeSingle();
    expect(foreignCertificate.data).toBeNull();

    const foreignMaintenance = await ownerBClient
      .from('recurring_maintenance_schedules')
      .select('id')
      .eq('id', maintenanceScheduleId)
      .maybeSingle();
    expect(foreignMaintenance.data).toBeNull();
    const foreignRecurring = await ownerBClient
      .from('recurring_schedules')
      .select('id')
      .eq('id', recurringScheduleId)
      .maybeSingle();
    expect(foreignRecurring.data).toBeNull();
  });

  it('keeps notifications and queued notifications recipient scoped', async () => {
    const ownNotification = await ownerAClient
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .single();
    expect(ownNotification.error).toBeNull();
    const foreignNotification = await ownerBClient
      .from('notifications')
      .select('id')
      .eq('id', notificationId)
      .maybeSingle();
    expect(foreignNotification.data).toBeNull();

    const ownQueue = await ownerAClient
      .from('notification_queue')
      .select('id')
      .eq('id', queueId)
      .single();
    expect(ownQueue.error).toBeNull();
    const foreignQueue = await ownerBClient
      .from('notification_queue')
      .select('id')
      .eq('id', queueId)
      .maybeSingle();
    expect(foreignQueue.data).toBeNull();
  });
});
