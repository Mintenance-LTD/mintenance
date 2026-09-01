// @vitest-environment node
/** Real-DB isolation tests for the private beta data boundaries. */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createAnonClient,
  createAuthenticatedClient,
  createServiceClient,
  isLocalSupabaseAvailable,
} from '../../test/integration/supabase-test-client';
import {
  createTestJob,
  createTestUser,
  type TestJob,
  type TestUser,
} from '../../test/integration/fixtures';

describe('cross-user data isolation (real DB)', () => {
  let homeownerA: TestUser;
  let homeownerB: TestUser;
  let contractorA: TestUser;
  let contractorB: TestUser;
  let admin: TestUser;
  let jobA: TestJob;
  let jobB: TestJob;
  let homeownerAClient: SupabaseClient;
  let homeownerBClient: SupabaseClient;
  let contractorAClient: SupabaseClient;
  let contractorBClient: SupabaseClient;
  let adminClient: SupabaseClient;
  let propertyAId: string;
  let propertyBId: string;
  let messageBId: string;
  let documentBId: string;
  let tokenBId: string;
  let reportBId: string;

  beforeAll(async () => {
    if (!(await isLocalSupabaseAvailable())) {
      throw new Error(
        'Local Supabase is required for cross-user isolation tests'
      );
    }

    homeownerA = await createTestUser({ role: 'homeowner' });
    homeownerB = await createTestUser({ role: 'homeowner' });
    contractorA = await createTestUser({ role: 'contractor' });
    contractorB = await createTestUser({ role: 'contractor' });
    admin = await createTestUser({ role: 'admin' });
    jobA = await createTestJob({
      homeowner_id: homeownerA.id,
      status: 'draft',
    });
    jobB = await createTestJob({
      homeowner_id: homeownerB.id,
      status: 'draft',
    });

    homeownerAClient = await createAuthenticatedClient(
      homeownerA.email,
      homeownerA.password
    );
    homeownerBClient = await createAuthenticatedClient(
      homeownerB.email,
      homeownerB.password
    );
    contractorAClient = await createAuthenticatedClient(
      contractorA.email,
      contractorA.password
    );
    contractorBClient = await createAuthenticatedClient(
      contractorB.email,
      contractorB.password
    );
    adminClient = await createAuthenticatedClient(admin.email, admin.password);

    const { data: propertyA, error: propertyAError } = await homeownerAClient
      .from('properties')
      .insert({
        owner_id: homeownerA.id,
        property_name: 'itest_property_a',
        property_type: 'residential',
        address: '1 Test Street',
      })
      .select('id')
      .single();
    if (propertyAError || !propertyA) throw new Error(propertyAError?.message);
    propertyAId = propertyA.id;

    const { data: propertyB, error: propertyBError } = await homeownerBClient
      .from('properties')
      .insert({
        owner_id: homeownerB.id,
        property_name: 'itest_property_b',
        property_type: 'residential',
        address: '2 Test Street',
      })
      .select('id')
      .single();
    if (propertyBError || !propertyB) throw new Error(propertyBError?.message);
    propertyBId = propertyB.id;

    const { data: message, error: messageError } = await homeownerBClient
      .from('messages')
      .insert({
        job_id: jobB.id,
        sender_id: homeownerB.id,
        receiver_id: contractorB.id,
        content: 'itest_private_message_b',
      })
      .select('id')
      .single();
    if (messageError || !message) throw new Error(messageError?.message);
    messageBId = message.id;

    const { data: document, error: documentError } = await contractorBClient
      .from('contractor_documents')
      .insert({
        contractor_id: contractorB.id,
        name: 'itest_private_document_b.pdf',
        category: 'insurance',
        file_type: 'application/pdf',
        size_bytes: 10,
        storage_path: `itest/${contractorB.id}/private-document.pdf`,
      })
      .select('id')
      .single();
    if (documentError || !document) throw new Error(documentError?.message);
    documentBId = document.id;

    const service = createServiceClient();
    const { data: token, error: tokenError } = await service
      .from('anonymous_report_tokens')
      .insert({
        owner_id: homeownerB.id,
        property_id: propertyBId,
        token: `itest_token_${Date.now()}`,
      })
      .select('id')
      .single();
    if (tokenError || !token) throw new Error(tokenError?.message);
    tokenBId = token.id;

    const { data: report, error: reportError } = await service
      .from('anonymous_reports')
      .insert({
        token_id: tokenBId,
        property_id: propertyBId,
        reporter_name: 'itest reporter',
        category: 'general',
        description: 'itest private report',
        urgency: 'medium',
      })
      .select('id')
      .single();
    if (reportError || !report) throw new Error(reportError?.message);
    reportBId = report.id;
  }, 30_000);

  afterAll(async () => {
    const service = createServiceClient();
    if (reportBId)
      await service.from('anonymous_reports').delete().eq('id', reportBId);
    if (tokenBId)
      await service.from('anonymous_report_tokens').delete().eq('id', tokenBId);
    if (documentBId)
      await service.from('contractor_documents').delete().eq('id', documentBId);
    if (messageBId)
      await service.from('messages').delete().eq('id', messageBId);
    if (propertyAId)
      await service.from('properties').delete().eq('id', propertyAId);
    if (propertyBId)
      await service.from('properties').delete().eq('id', propertyBId);
    await jobA?.cleanup();
    await jobB?.cleanup();
    await homeownerA?.cleanup();
    await homeownerB?.cleanup();
    await contractorA?.cleanup();
    await contractorB?.cleanup();
    await admin?.cleanup();
  });

  it('isolates private properties for SELECT, UPDATE, DELETE, and INSERT', async () => {
    const own = await homeownerAClient
      .from('properties')
      .select('id')
      .eq('id', propertyAId)
      .single();
    expect(own.error).toBeNull();
    expect(own.data?.id).toBe(propertyAId);

    const foreign = await homeownerAClient
      .from('properties')
      .select('id')
      .eq('id', propertyBId)
      .maybeSingle();
    expect(foreign.data).toBeNull();

    const update = await homeownerAClient
      .from('properties')
      .update({ property_name: 'hacked' })
      .eq('id', propertyBId)
      .select('id', { count: 'exact', head: true });
    expect(update.error === null && (update.count ?? 0) > 0).toBe(false);

    const remove = await homeownerAClient
      .from('properties')
      .delete()
      .eq('id', propertyBId)
      .select('id', { count: 'exact', head: true });
    expect(remove.error === null && (remove.count ?? 0) > 0).toBe(false);

    const forgedInsert = await homeownerAClient.from('properties').insert({
      owner_id: homeownerB.id,
      property_name: 'itest_forged',
      property_type: 'residential',
      address: 'forged',
    });
    expect(forgedInsert.error).not.toBeNull();
  });

  it('isolates private jobs and keeps marketplace visibility contractor-only', async () => {
    const homeownerRead = await homeownerAClient
      .from('jobs')
      .select('id')
      .eq('id', jobB.id)
      .maybeSingle();
    expect(homeownerRead.data).toBeNull();

    const homeownerWrite = await homeownerAClient
      .from('jobs')
      .update({ title: 'hacked' })
      .eq('id', jobB.id)
      .select('id', { count: 'exact', head: true });
    expect(
      homeownerWrite.error === null && (homeownerWrite.count ?? 0) > 0
    ).toBe(false);

    const contractorRead = await contractorAClient
      .from('jobs')
      .select('id')
      .eq('id', jobB.id)
      .maybeSingle();
    expect(contractorRead.data).toBeNull();

    const posted = await createServiceClient()
      .from('jobs')
      .update({ status: 'posted' })
      .eq('id', jobB.id);
    expect(posted.error).toBeNull();
    const contractorMarketplaceRead = await contractorAClient
      .from('jobs')
      .select('id')
      .eq('id', jobB.id)
      .maybeSingle();
    expect(contractorMarketplaceRead.data?.id).toBe(jobB.id);

    const contractorWrite = await contractorAClient
      .from('jobs')
      .update({ title: 'contractor_hacked' })
      .eq('id', jobB.id)
      .select('id', { count: 'exact', head: true });
    expect(
      contractorWrite.error === null && (contractorWrite.count ?? 0) > 0
    ).toBe(false);

    // Phase 3.5 assigned-job gate: the assigned contractor keeps access, but
    // a different contractor must not be able to read or mutate the job.
    const service = createServiceClient();
    const postedForAssignment = await service
      .from('jobs')
      .update({ status: 'posted' })
      .eq('id', jobA.id);
    expect(postedForAssignment.error).toBeNull();

    const assigned = await service
      .from('jobs')
      .update({ contractor_id: contractorA.id, status: 'assigned' })
      .eq('id', jobA.id);
    expect(assigned.error).toBeNull();

    const assignedContractorRead = await contractorAClient
      .from('jobs')
      .select('id, contractor_id, status')
      .eq('id', jobA.id)
      .single();
    expect(assignedContractorRead.error).toBeNull();
    expect(assignedContractorRead.data).toMatchObject({
      id: jobA.id,
      contractor_id: contractorA.id,
      status: 'assigned',
    });

    const otherContractorRead = await contractorBClient
      .from('jobs')
      .select('id')
      .eq('id', jobA.id)
      .maybeSingle();
    expect(otherContractorRead.data).toBeNull();

    const assignedContractorWrite = await contractorAClient
      .from('jobs')
      .update({ title: 'itest_assigned_contractor_update' })
      .eq('id', jobA.id)
      .select('id', { count: 'exact', head: true });
    expect(
      assignedContractorWrite.error === null &&
        (assignedContractorWrite.count ?? 0) > 0
    ).toBe(true);

    const otherContractorWrite = await contractorBClient
      .from('jobs')
      .update({ title: 'itest_other_contractor_hacked' })
      .eq('id', jobA.id)
      .select('id', { count: 'exact', head: true });
    expect(
      otherContractorWrite.error === null &&
        (otherContractorWrite.count ?? 0) > 0
    ).toBe(false);

    const ownerAssignedRead = await homeownerAClient
      .from('jobs')
      .select('id, contractor_id, status')
      .eq('id', jobA.id)
      .single();
    expect(ownerAssignedRead.error).toBeNull();
    expect(ownerAssignedRead.data?.contractor_id).toBe(contractorA.id);
  });

  it('isolates messages and contractor documents across users', async () => {
    const messageRead = await homeownerAClient
      .from('messages')
      .select('id')
      .eq('id', messageBId)
      .maybeSingle();
    expect(messageRead.data).toBeNull();
    const messageUpdate = await homeownerAClient
      .from('messages')
      .update({ content: 'hacked' })
      .eq('id', messageBId)
      .select('id', { count: 'exact', head: true });
    expect(messageUpdate.error === null && (messageUpdate.count ?? 0) > 0).toBe(
      false
    );
    const messageDelete = await homeownerAClient
      .from('messages')
      .delete()
      .eq('id', messageBId)
      .select('id', { count: 'exact', head: true });
    expect(messageDelete.error === null && (messageDelete.count ?? 0) > 0).toBe(
      false
    );

    const documentRead = await contractorAClient
      .from('contractor_documents')
      .select('id')
      .eq('id', documentBId)
      .maybeSingle();
    expect(documentRead.data).toBeNull();
    const documentUpdate = await contractorAClient
      .from('contractor_documents')
      .update({ name: 'hacked' })
      .eq('id', documentBId)
      .select('id', { count: 'exact', head: true });
    expect(
      documentUpdate.error === null && (documentUpdate.count ?? 0) > 0
    ).toBe(false);
    const documentDelete = await contractorAClient
      .from('contractor_documents')
      .delete()
      .eq('id', documentBId)
      .select('id', { count: 'exact', head: true });
    expect(
      documentDelete.error === null && (documentDelete.count ?? 0) > 0
    ).toBe(false);
  });

  it('does not expose unrelated tenant report tokens or reports, while admin access works', async () => {
    const tokenRead = await homeownerAClient
      .from('anonymous_report_tokens')
      .select('id')
      .eq('id', tokenBId)
      .maybeSingle();
    expect(tokenRead.data).toBeNull();
    const reportRead = await homeownerAClient
      .from('anonymous_reports')
      .select('id')
      .eq('id', reportBId)
      .maybeSingle();
    expect(reportRead.data).toBeNull();

    const adminToken = await adminClient
      .from('anonymous_report_tokens')
      .select('id')
      .eq('id', tokenBId)
      .single();
    expect(adminToken.error).toBeNull();
    const adminReport = await adminClient
      .from('anonymous_reports')
      .select('id')
      .eq('id', reportBId)
      .single();
    expect(adminReport.error).toBeNull();

    const anonToken = await createAnonClient()
      .from('anonymous_report_tokens')
      .select('id')
      .eq('id', tokenBId)
      .maybeSingle();
    expect(anonToken.data).toBeNull();
  });
});
