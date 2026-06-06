/**
 * ClientRepository unit tests.
 * Drives the shared chainable supabase mock; covers CRUD, the getClients
 * filter/search/sort/pagination builder, lifecycle update, interactions,
 * import (skip/import/error), export (csv/xlsx/json/unsupported) and tasks.
 */

import { ClientRepository } from '../ClientRepository';
import { __setMockData, __resetSupabaseMock } from '../../../config/supabase';
import type {
  CreateClientRequest,
  ClientSearchParams,
  ClientImportData,
  ClientExportOptions,
} from '../types';

const repo = new ClientRepository();

beforeEach(() => {
  __resetSupabaseMock();
});

const newClientRequest = (): CreateClientRequest =>
  ({
    contractorId: 'c1',
    type: 'individual',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
  }) as unknown as CreateClientRequest;

describe('createClient', () => {
  it('inserts and returns the new client', async () => {
    __setMockData({ id: 'cl1', first_name: 'Ada' });
    const result = await repo.createClient(newClientRequest());
    expect(result).toEqual({ id: 'cl1', first_name: 'Ada' });
  });

  it('throws when the insert errors', async () => {
    __setMockData(null);
    await expect(repo.createClient(newClientRequest())).rejects.toBeDefined();
  });
});

describe('getClients', () => {
  it('returns clients + total with no params', async () => {
    __setMockData([{ id: 'cl1' }, { id: 'cl2' }]);
    const result = await repo.getClients('c1');
    expect(result.clients).toHaveLength(2);
    expect(result.total).toBe(0); // mock does not surface count
  });

  it('applies every filter, search, sort and pagination branch', async () => {
    __setMockData([{ id: 'cl1' }]);
    const params: ClientSearchParams = {
      filters: {
        status: ['active'],
        priority: ['high'],
        type: ['individual'],
        tags: ['gold'],
        lifecycleStage: ['customer'],
        source: ['referral'],
        dateRange: { start: '2026-01-01', end: '2026-02-01' },
        financialRange: { minSpent: 0, maxSpent: 1000 },
      },
      query: 'ada',
      sort: { field: 'first_name', direction: 'asc' },
      page: 2,
      limit: 10,
    } as unknown as ClientSearchParams;
    const result = await repo.getClients('c1', params);
    expect(result.clients).toHaveLength(1);
  });
});

describe('getClientById / updateClient / deleteClient', () => {
  it('getClientById returns the row', async () => {
    __setMockData({ id: 'cl1' });
    expect(await repo.getClientById('cl1')).toEqual({ id: 'cl1' });
  });

  it('updateClient returns the updated row', async () => {
    __setMockData({ id: 'cl1', notes: 'updated' });
    const result = await repo.updateClient({
      id: 'cl1',
      updates: { notes: 'updated' },
    } as never);
    expect(result).toEqual({ id: 'cl1', notes: 'updated' });
  });

  it('deleteClient resolves', async () => {
    await expect(repo.deleteClient('cl1')).resolves.toBeUndefined();
  });
});

describe('updateClientLifecycle', () => {
  it('merges the stage onto the existing lifecycle', async () => {
    __setMockData({ id: 'cl1', lifecycle: { stage: 'lead', totalJobs: 2 } });
    const result = await repo.updateClientLifecycle('cl1', 'customer', 'note');
    expect(result).toBeDefined();
  });

  it('throws when the client fetch fails', async () => {
    __setMockData(null);
    await expect(
      repo.updateClientLifecycle('missing', 'customer')
    ).rejects.toBeDefined();
  });
});

describe('addClientInteraction', () => {
  it('inserts an interaction record', async () => {
    __setMockData([{ id: 'int1' }]);
    await expect(
      repo.addClientInteraction('cl1', {
        type: 'call',
        subject: 'Follow up',
        description: 'Discussed quote',
      })
    ).resolves.toBeUndefined();
  });
});

describe('importClients', () => {
  it('skips existing clients when skipDuplicates is on', async () => {
    __setMockData({ id: 'existing' }); // dup-check .single() finds a match
    const data: ClientImportData = {
      clients: [{ email: 'a@x.com', firstName: 'A', lastName: 'B' }],
      options: { skipDuplicates: true },
    } as unknown as ClientImportData;
    const result = await repo.importClients('c1', data);
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('imports clients when duplicates are not checked', async () => {
    __setMockData({ id: 'created' }); // createClient .single() returns a row
    const data: ClientImportData = {
      clients: [{ email: 'a@x.com', firstName: 'A', lastName: 'B' }],
      options: { skipDuplicates: false },
    } as unknown as ClientImportData;
    const result = await repo.importClients('c1', data);
    expect(result.imported).toBe(1);
  });

  it('records an error when a client fails to import', async () => {
    __setMockData(null); // createClient .single() -> error
    const data: ClientImportData = {
      clients: [{ email: 'bad@x.com', firstName: 'A', lastName: 'B' }],
      options: { skipDuplicates: false },
    } as unknown as ClientImportData;
    const result = await repo.importClients('c1', data);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('bad@x.com');
  });
});

describe('exportClients', () => {
  const client = {
    id: 'cl1',
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    phone: '07000',
    companyName: 'Eng',
    status: 'active',
    priority: 'high',
    source: 'referral',
    tags: ['gold', 'vip'],
    notes: 'note "with" quotes',
    createdAt: '2026-01-01',
    properties: [],
    financials: { totalSpent: 100 },
  };

  it('exports to CSV with all optional sections', async () => {
    __setMockData([client]);
    const opts: ClientExportOptions = {
      format: 'csv',
      includeProperties: true,
      includeFinancials: true,
      includeInteractions: true,
    } as unknown as ClientExportOptions;
    const csv = await repo.exportClients('c1', opts);
    expect(csv).toContain('firstName');
    expect(csv).toContain('Ada');
  });

  it('exports to JSON', async () => {
    __setMockData([client]);
    const json = await repo.exportClients('c1', {
      format: 'json',
    } as unknown as ClientExportOptions);
    expect(JSON.parse(json)[0].email).toBe('ada@example.com');
  });

  it('exports to XLSX (json fallback impl)', async () => {
    __setMockData([client]);
    const out = await repo.exportClients('c1', {
      format: 'xlsx',
    } as unknown as ClientExportOptions);
    expect(out).toContain('Ada');
  });

  it('returns empty CSV for no clients', async () => {
    __setMockData([]);
    const csv = await repo.exportClients('c1', {
      format: 'csv',
    } as unknown as ClientExportOptions);
    expect(csv).toBe('');
  });

  it('throws on an unsupported format', async () => {
    __setMockData([client]);
    await expect(
      repo.exportClients('c1', {
        format: 'pdf',
      } as unknown as ClientExportOptions)
    ).rejects.toThrow('Unsupported export format');
  });
});

describe('follow-up tasks', () => {
  it('getFollowUpTasks returns the list', async () => {
    __setMockData([{ id: 't1' }]);
    expect(await repo.getFollowUpTasks('c1')).toHaveLength(1);
  });

  it('createFollowUpTask returns the new task', async () => {
    __setMockData({ id: 't1', status: 'pending' });
    const result = await repo.createFollowUpTask('cl1', {
      type: 'call',
      title: 'Ring back',
      description: 'desc',
      dueDate: '2026-02-01',
      priority: 'high',
    });
    expect(result).toEqual({ id: 't1', status: 'pending' });
  });

  it('completeFollowUpTask marks it done', async () => {
    __setMockData({ id: 't1', status: 'completed' });
    const result = await repo.completeFollowUpTask('t1', 'done');
    expect(result.status).toBe('completed');
  });
});
