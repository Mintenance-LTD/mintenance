/**
 * ClientManagementService unit tests.
 * Orchestration facade over five collaborators. We mock all of them and assert
 * delegation (happy path) plus ServiceErrorHandler wrapping (catch path) for
 * every method, including the multi-step create/update/delete/lifecycle flows.
 */

const mockRepo = {
  createClient: jest.fn(),
  getClients: jest.fn(),
  getClientById: jest.fn(),
  updateClient: jest.fn(),
  deleteClient: jest.fn(),
  updateClientLifecycle: jest.fn(),
  addClientInteraction: jest.fn(),
  importClients: jest.fn(),
  exportClients: jest.fn(),
  getFollowUpTasks: jest.fn(),
  createFollowUpTask: jest.fn(),
  completeFollowUpTask: jest.fn(),
};
const mockAnalytics = {
  initializeClientAnalytics: jest.fn(),
  updateClientAnalytics: jest.fn(),
  deleteClientAnalytics: jest.fn(),
  generateAnalytics: jest.fn(),
  getAtRiskClients: jest.fn(),
  getClientOpportunities: jest.fn(),
};
const mockSegmentation = {
  getClientSegments: jest.fn(),
  createClientSegment: jest.fn(),
};
const mockComms = {
  sendWelcomeMessage: jest.fn(),
  cleanupClientCommunications: jest.fn(),
  sendLifecycleUpdateNotification: jest.fn(),
  getCommunicationTemplates: jest.fn(),
  sendBulkCommunication: jest.fn(),
};
const mockValidation = {
  validateCreateClientRequest: jest.fn(),
  validateUpdateClientRequest: jest.fn(),
};

jest.mock('../ClientRepository', () => ({
  ClientRepository: jest.fn(() => mockRepo),
}));
jest.mock('../ClientAnalyticsService', () => ({
  ClientAnalyticsService: jest.fn(() => mockAnalytics),
}));
jest.mock('../ClientSegmentationService', () => ({
  ClientSegmentationService: jest.fn(() => mockSegmentation),
}));
jest.mock('../ClientCommunicationService', () => ({
  ClientCommunicationService: jest.fn(() => mockComms),
}));
jest.mock('../ClientValidationService', () => ({
  ClientValidationService: jest.fn(() => mockValidation),
}));
jest.mock('../../../utils/serviceErrorHandler', () => ({
  ServiceErrorHandler: {
    handleError: jest.fn(
      (_e: unknown, msg: string) => new Error(`wrapped: ${msg}`)
    ),
  },
}));

import { ClientManagementService } from '../ClientManagementService';

let svc: ClientManagementService;

beforeEach(() => {
  jest.clearAllMocks();
  [
    mockRepo,
    mockAnalytics,
    mockSegmentation,
    mockComms,
    mockValidation,
  ].forEach((m) =>
    Object.values(m).forEach((fn) => (fn as jest.Mock).mockResolvedValue({}))
  );
  svc = new ClientManagementService();
});

describe('createClient', () => {
  it('validates, creates, initializes analytics and sends a welcome', async () => {
    mockRepo.createClient.mockResolvedValue({ id: 'cl1' });
    const result = await svc.createClient({} as never);
    expect(mockValidation.validateCreateClientRequest).toHaveBeenCalled();
    expect(mockAnalytics.initializeClientAnalytics).toHaveBeenCalledWith('cl1');
    expect(mockComms.sendWelcomeMessage).toHaveBeenCalledWith({ id: 'cl1' });
    expect(result).toEqual({ id: 'cl1' });
  });

  it('wraps validation errors', async () => {
    mockValidation.validateCreateClientRequest.mockRejectedValueOnce(
      new Error('bad')
    );
    await expect(svc.createClient({} as never)).rejects.toThrow('wrapped');
  });
});

describe('updateClient', () => {
  it('updates analytics when status changes', async () => {
    mockRepo.updateClient.mockResolvedValue({ id: 'cl1' });
    await svc.updateClient({
      id: 'cl1',
      updates: { status: 'active' },
    } as never);
    expect(mockAnalytics.updateClientAnalytics).toHaveBeenCalledWith('cl1');
  });

  it('skips analytics when status is unchanged', async () => {
    mockRepo.updateClient.mockResolvedValue({ id: 'cl1' });
    await svc.updateClient({ id: 'cl1', updates: { notes: 'x' } } as never);
    expect(mockAnalytics.updateClientAnalytics).not.toHaveBeenCalled();
  });
});

describe('deleteClient', () => {
  it('deletes the client, analytics and communications', async () => {
    await svc.deleteClient('cl1');
    expect(mockRepo.deleteClient).toHaveBeenCalledWith('cl1');
    expect(mockAnalytics.deleteClientAnalytics).toHaveBeenCalledWith('cl1');
    expect(mockComms.cleanupClientCommunications).toHaveBeenCalledWith('cl1');
  });
});

describe('getClientAnalytics', () => {
  it('fetches clients then generates analytics', async () => {
    mockRepo.getClients.mockResolvedValue({ clients: [{ id: 'a' }] });
    mockAnalytics.generateAnalytics.mockResolvedValue({ summary: {} });
    const result = await svc.getClientAnalytics('c1');
    expect(mockAnalytics.generateAnalytics).toHaveBeenCalledWith('c1', [
      { id: 'a' },
    ]);
    expect(result).toEqual({ summary: {} });
  });
});

describe('updateClientLifecycle', () => {
  it('updates lifecycle, analytics and sends a notification', async () => {
    mockRepo.updateClientLifecycle.mockResolvedValue({ id: 'cl1' });
    await svc.updateClientLifecycle('cl1', 'customer' as never, 'note');
    expect(mockAnalytics.updateClientAnalytics).toHaveBeenCalledWith('cl1');
    expect(mockComms.sendLifecycleUpdateNotification).toHaveBeenCalled();
  });
});

describe('addClientInteraction', () => {
  it('records the interaction and refreshes analytics', async () => {
    await svc.addClientInteraction('cl1', {
      type: 'call',
      subject: 's',
      description: 'd',
    });
    expect(mockRepo.addClientInteraction).toHaveBeenCalled();
    expect(mockAnalytics.updateClientAnalytics).toHaveBeenCalledWith('cl1');
  });
});

const passthrough: [string, () => Promise<unknown>, jest.Mock][] = [
  ['getClients', () => svc.getClients('c1'), mockRepo.getClients],
  ['getClientById', () => svc.getClientById('x'), mockRepo.getClientById],
  [
    'getClientSegments',
    () => svc.getClientSegments('c1'),
    mockSegmentation.getClientSegments,
  ],
  [
    'createClientSegment',
    () => svc.createClientSegment('c1', {} as never),
    mockSegmentation.createClientSegment,
  ],
  [
    'importClients',
    () => svc.importClients('c1', {} as never),
    mockRepo.importClients,
  ],
  [
    'exportClients',
    () => svc.exportClients('c1', {} as never),
    mockRepo.exportClients,
  ],
  [
    'getFollowUpTasks',
    () => svc.getFollowUpTasks('c1'),
    mockRepo.getFollowUpTasks,
  ],
  [
    'createFollowUpTask',
    () => svc.createFollowUpTask('cl1', {} as never),
    mockRepo.createFollowUpTask,
  ],
  [
    'completeFollowUpTask',
    () => svc.completeFollowUpTask('t1', 'n'),
    mockRepo.completeFollowUpTask,
  ],
  [
    'getCommunicationTemplates',
    () => svc.getCommunicationTemplates('c1'),
    mockComms.getCommunicationTemplates,
  ],
  [
    'sendBulkCommunication',
    () => svc.sendBulkCommunication('s1', 't1'),
    mockComms.sendBulkCommunication,
  ],
  [
    'getAtRiskClients',
    () => svc.getAtRiskClients('c1'),
    mockAnalytics.getAtRiskClients,
  ],
  [
    'getClientOpportunities',
    () => svc.getClientOpportunities('c1'),
    mockAnalytics.getClientOpportunities,
  ],
];

describe.each(passthrough)('%s (pass-through)', (_label, call, delegate) => {
  it('delegates to the collaborator', async () => {
    delegate.mockResolvedValueOnce({ ok: true });
    await expect(call()).resolves.toEqual({ ok: true });
    expect(delegate).toHaveBeenCalled();
  });

  it('wraps errors via ServiceErrorHandler', async () => {
    delegate.mockRejectedValueOnce(new Error('boom'));
    await expect(call()).rejects.toThrow('wrapped');
  });
});

describe('error wrapping (multi-step methods)', () => {
  it.each([
    [
      'createClient',
      () => {
        mockValidation.validateCreateClientRequest.mockRejectedValueOnce(
          new Error('e')
        );
        return svc.createClient({} as never);
      },
    ],
    [
      'updateClient',
      () => {
        mockValidation.validateUpdateClientRequest.mockRejectedValueOnce(
          new Error('e')
        );
        return svc.updateClient({ id: 'x', updates: {} } as never);
      },
    ],
    [
      'deleteClient',
      () => {
        mockRepo.getClientById.mockRejectedValueOnce(new Error('e'));
        return svc.deleteClient('x');
      },
    ],
    [
      'getClientAnalytics',
      () => {
        mockRepo.getClients.mockRejectedValueOnce(new Error('e'));
        return svc.getClientAnalytics('c1');
      },
    ],
    [
      'updateClientLifecycle',
      () => {
        mockRepo.updateClientLifecycle.mockRejectedValueOnce(new Error('e'));
        return svc.updateClientLifecycle('x', 'customer' as never);
      },
    ],
    [
      'addClientInteraction',
      () => {
        mockRepo.addClientInteraction.mockRejectedValueOnce(new Error('e'));
        return svc.addClientInteraction('x', {
          type: 'call',
          subject: 's',
          description: 'd',
        });
      },
    ],
  ])('%s rethrows wrapped', async (_l, run) => {
    await expect(run()).rejects.toThrow('wrapped');
  });
});
