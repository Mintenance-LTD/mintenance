import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssueConversation } from '../components/IssueConversation';
import { JobIssueConversations } from '../components/JobIssueConversations';
const mockGet = jest.fn(),
  mockPost = jest.fn();
let mockUser = 'owner';
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: mockUser } }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));
let client: QueryClient;
const data = (pageOffset = 0) => ({
  status: 'acknowledged',
  role: 'manager',
  pageOffset,
  hasMore: pageOffset < 50,
  summary: {
    category: 'plumbing',
    description: 'Original leak',
    created_at: '2026-07-01T23:30:00Z',
  },
  messages: [
    {
      id: 'm',
      author_role: 'system',
      body: 'Report status changed to acknowledged.',
      created_at: '2026-07-02T09:00:00Z',
    },
  ],
});
beforeEach(() => {
  jest.resetAllMocks();
  mockUser = 'owner';
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mockGet.mockImplementation((url: string) =>
    Promise.resolve(
      data(
        url.includes('latest=true') ? 50 : url.includes('offset=25') ? 25 : 0
      )
    )
  );
});
afterEach(() => client.clear());
const content = (id = 'first') => (
  <QueryClientProvider client={client}>
    <IssueConversation reportId={id} />
  </QueryClientProvider>
);
it('loads original context and dated system history, then navigates latest and older pages', async () => {
  const view = render(content());
  fireEvent.press(view.getByText('Shared issue conversation +'));
  await view.findByText('Original leak');
  expect(view.getByText(/Submitted 02\/07\/2026, 00:30/)).toBeTruthy();
  expect(view.getByText('Status update')).toBeTruthy();
  fireEvent.press(view.getByText('Latest updates'));
  await view.findByText('Page 3');
  fireEvent.press(view.getByText('Older updates'));
  await view.findByText('Page 2');
});
it('retains the unconfirmed message and reuses its id on retry', async () => {
  mockPost
    .mockRejectedValueOnce(new Error('Response lost'))
    .mockImplementationOnce((_url, payload) =>
      Promise.resolve({ messageId: payload.messageId })
    );
  const view = render(content());
  fireEvent.press(view.getByText('Shared issue conversation +'));
  await view.findByText('Original leak');
  fireEvent.changeText(view.getByLabelText('Shared message'), 'My update');
  fireEvent.press(view.getByText('Send message'));
  await view.findByText('Retry message');
  expect(view.getByLabelText('Shared message').props.value).toBe('My update');
  expect(view.getByLabelText('Shared message').props.editable).toBe(false);
  fireEvent.press(view.getByText('Retry message'));
  await view.findByText('Message sent. Showing latest updates.');
  expect(mockPost.mock.calls[0][1]).toEqual(mockPost.mock.calls[1][1]);
  await view.findByText('Page 3');
});
it('does not let an old send completion clear another case draft', async () => {
  let finish!: (value: unknown) => void;
  mockPost.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const view = render(content());
  fireEvent.press(view.getByText('Shared issue conversation +'));
  await view.findByText('Original leak');
  fireEvent.changeText(view.getByLabelText('Shared message'), 'Old draft');
  fireEvent.press(view.getByText('Send message'));
  await waitFor(() => expect(mockPost).toHaveBeenCalledTimes(1));
  view.rerender(content('second'));
  fireEvent.press(view.getByText('Shared issue conversation +'));
  await view.findByText('Original leak');
  fireEvent.changeText(view.getByLabelText('Shared message'), 'New draft');
  await act(async () =>
    finish({ messageId: mockPost.mock.calls[0][1].messageId })
  );
  expect(view.getByLabelText('Shared message').props.value).toBe('New draft');
  expect(view.queryByText('Message sent. Showing latest updates.')).toBeNull();
  mockUser = 'another-owner';
  view.rerender(content('second'));
  expect(view.queryByLabelText('Shared message')).toBeNull();
});
it('rejects malformed history without claiming an empty case', async () => {
  mockGet.mockResolvedValue({ messages: null });
  const view = render(content());
  fireEvent.press(view.getByText('Shared issue conversation +'));
  await view.findByText('Unable to load case history. Refresh to retry.');
  expect(view.queryByText('No recorded updates on this page.')).toBeNull();
});
it('identifies job cases and resets expanded state when switching jobs', async () => {
  mockGet.mockResolvedValue({
    reports: [{ id: 'report-1', category: 'water_leak', status: 'new' }],
    hasMore: false,
  });
  const renderJob = (id: string) => (
    <QueryClientProvider client={client}>
      <JobIssueConversations jobId={id} />
    </QueryClientProvider>
  );
  const view = render(renderJob('job-1'));
  fireEvent.press(view.getByText('Resident updates'));
  await view.findByText('water leak · new');
  view.rerender(renderJob('job-2'));
  expect(view.queryByText('water leak · new')).toBeNull();
});

const staffFollowup = {
  propertyId: 'property-1',
  assigneeName: 'You',
  needsReassignment: false,
  canManage: false,
  waitingFor: 'manager',
  dueAt: '2026-07-03T11:00:00Z',
  completionRevision: 4,
};

it('submits a private note for owner review without sending the resident draft', async () => {
  mockGet
    .mockResolvedValueOnce({ ...data(), staffFollowup })
    .mockResolvedValue({
      ...data(),
      staffFollowup: {
        ...staffFollowup,
        completionRevision: undefined,
        waitingFor: 'approval',
        completion: {
          note: 'Valve replaced',
          submittedAt: '2026-07-03T09:00:00Z',
          submittedBy: 'You',
          awaitingReview: true,
        },
      },
    });
  mockPost.mockResolvedValue({ submitted: true });
  const view = render(content('exact-repair'));
  fireEvent.press(view.getByText('Shared issue conversation +'));
  await view.findByText('Responsible: You');
  expect(view.getByText('Next action: Property team action')).toBeTruthy();
  fireEvent.changeText(view.getByLabelText('Shared message'), 'Resident draft');
  fireEvent.changeText(
    view.getByLabelText('Private completion note'),
    ' Valve replaced '
  );
  fireEvent.press(view.getByText('Submit for owner review'));
  await view.findByText('Ready for owner review');
  expect(view.getByLabelText('Shared message').props.value).toBe(
    'Resident draft'
  );
  expect(view.queryByLabelText('Private completion note')).toBeNull();
  expect(mockPost).toHaveBeenCalledTimes(1);
  expect(mockPost).toHaveBeenCalledWith(
    '/api/properties/property-1/followups',
    { reportId: 'exact-repair', revision: 4, note: 'Valve replaced' },
    expect.objectContaining({ retries: 0 })
  );
});

it('retains the private draft after a network error and blocks retry after stale permission', async () => {
  mockGet
    .mockResolvedValueOnce({ ...data(), staffFollowup })
    .mockResolvedValue(data());
  mockPost
    .mockRejectedValueOnce(new Error('Lost response'))
    .mockRejectedValueOnce(
      Object.assign(new Error('Assignment removed'), { statusCode: 403 })
    );
  const view = render(content());
  fireEvent.press(view.getByText('Shared issue conversation +'));
  const note = await view.findByLabelText('Private completion note');
  fireEvent.changeText(note, 'Internal draft');
  fireEvent.press(view.getByText('Submit for owner review'));
  await view.findByText(
    'Completion was not confirmed. Your note is still here; try again.'
  );
  expect(view.getByLabelText('Private completion note').props.value).toBe(
    'Internal draft'
  );
  fireEvent.press(view.getByText('Submit for owner review'));
  await view.findByText(
    'You no longer have access to this handover. Refresh the case to confirm.'
  );
  expect(mockPost.mock.calls[0][1]).toEqual(mockPost.mock.calls[1][1]);
  expect(view.queryByLabelText('Submit for owner review')).toBeNull();
  expect(view.queryByText('Property team handover')).toBeNull();
});

it.each(['tenant', 'contractor'])(
  'never displays private staff fields to %s',
  async (role) => {
    mockGet.mockResolvedValue({ ...data(), role, staffFollowup });
    const view = render(content());
    fireEvent.press(view.getByText('Shared issue conversation +'));
    await view.findByText('Original leak');
    expect(view.queryByText('Property team handover')).toBeNull();
    expect(view.queryByLabelText('Private completion note')).toBeNull();
  }
);

it('shows the completion to the owner without offering teammate submission', async () => {
  mockGet.mockResolvedValue({
    ...data(),
    staffFollowup: {
      ...staffFollowup,
      canManage: true,
      completion: {
        note: 'Valve replaced',
        submittedAt: '2026-07-03T09:00:00Z',
        submittedBy: 'Alex',
        awaitingReview: true,
      },
    },
  });
  const view = render(content());
  fireEvent.press(view.getByText('Shared issue conversation +'));
  await view.findByText('Ready for owner review');
  expect(view.getByText('Valve replaced')).toBeTruthy();
  expect(view.queryByLabelText('Private completion note')).toBeNull();
});

it('can initialise an exact signed-in case without first expanding a list row', async () => {
  const view = render(
    <QueryClientProvider client={client}>
      <IssueConversation
        reportId='incoming-case'
        initiallyOpen
        caseTitle='Tenant repair case'
      />
    </QueryClientProvider>
  );
  await view.findByText('Original leak');
  expect(view.getByText('Tenant repair case')).toBeTruthy();
  expect(mockGet).toHaveBeenCalledWith(
    expect.stringContaining('reportId=incoming-case&'),
    expect.anything()
  );
});
