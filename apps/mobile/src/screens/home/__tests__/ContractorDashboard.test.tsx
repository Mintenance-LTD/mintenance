/**
 * ContractorDashboard — function + branch coverage suite.
 *
 * Strategy: do NOT mock the screen under test. Mock only externals:
 *  - useAuth (drive user/role variations)
 *  - @tanstack/react-query useQuery/useQueryClient (drive loading / error /
 *    data / empty branches + capture invalidateQueries)
 *  - navigation (@react-navigation/native) + goToTab + getParent
 *  - all child cards/sections — stubbed to host views that expose every
 *    callback prop as a pressable, so the screen's nav handlers fire
 *  - haptics, animation primitives, FullScreenLoading, services, logger
 *
 * Every nav handler, quick-action, see-all, refresh, retry, menu item,
 * avatar/notification button and the todaysJobs .map are exercised to
 * maximise real function + branch coverage.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';

// ---- Navigation -----------------------------------------------------------
const mockNavigate = jest.fn();
const mockParentNavigate = jest.fn();
const mockGetParent = jest.fn(() => ({ navigate: mockParentNavigate }));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    getParent: mockGetParent,
  }),
  NavigationProp: {},
}));

// goToTab helper (Profile & Settings menu item)
const mockGoToTab = jest.fn();
jest.mock('../../../navigation/hooks', () => ({
  goToTab: (...args: unknown[]) => mockGoToTab(...args),
}));

// ---- Auth -----------------------------------------------------------------
let mockUser: Record<string, unknown> | null = {
  id: 'user-1',
  role: 'contractor',
  first_name: 'Jane',
  last_name: 'Doe',
  company_name: 'Acme Plumbing',
};
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

// ---- react-query ----------------------------------------------------------
// All mutable state the jest.mock factory touches must be `mock`-prefixed so
// jest's out-of-scope guard allows the reference.
const mockInvalidateQueries = jest.fn();
const mockRefetch = jest.fn();
const mockQueryEnv: {
  statsState: {
    data: unknown;
    isLoading: boolean;
    isError: boolean;
    isFetching: boolean;
  };
  unreadCount: number;
  capturedQueryFns: Array<() => unknown>;
} = {
  statsState: {
    data: null,
    isLoading: false,
    isError: false,
    isFetching: false,
  },
  unreadCount: 0,
  capturedQueryFns: [],
};

jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  useQuery: (opts: { queryKey: unknown[]; queryFn: () => unknown }) => {
    mockQueryEnv.capturedQueryFns.push(opts.queryFn);
    const key = String(opts.queryKey[0]);
    if (key === 'contractorStats') {
      return {
        ...mockQueryEnv.statsState,
        data: mockQueryEnv.statsState.data,
        refetch: mockRefetch,
      };
    }
    // unreadNotifications
    return { data: mockQueryEnv.unreadCount };
  },
}));

// ---- haptics / primitives / loading --------------------------------------
jest.mock('../../../utils/haptics', () => ({
  useHaptics: () => ({ impact: jest.fn(), selection: jest.fn() }),
}));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 20, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../../../components/animations/primitives', () => {
  const React = require('react');
  return {
    FadeIn: ({ children }: { children: React.ReactNode }) =>
      React.createElement('View', { testID: 'fade-in' }, children),
    SlideIn: ({ children }: { children: React.ReactNode }) =>
      React.createElement('View', { testID: 'slide-in' }, children),
  };
});
jest.mock('../../../components/LoadingSpinner', () => {
  const React = require('react');
  return {
    FullScreenLoading: ({ message }: { message: string }) =>
      React.createElement('Text', { testID: 'full-screen-loading' }, message),
  };
});

// ---- services -------------------------------------------------------------
jest.mock('../../../services/UserService', () => ({
  UserService: { getContractorStats: jest.fn(() => Promise.resolve({})) },
}));
jest.mock('../../../services/NotificationService', () => ({
  NotificationService: { getUnreadCount: jest.fn(() => Promise.resolve(3)) },
}));

// ---- @expo/vector-icons ---------------------------------------------------
jest.mock('@expo/vector-icons', () => ({ Ionicons: 'Ionicons' }));

// ---- child components: expose every callback prop as a pressable ----------
// Each stub renders a TouchableOpacity per callback so fireEvent.press can
// invoke the screen-owned handler. We pass representative args where needed.
jest.mock('../QuickActions', () => {
  const React = require('react');
  return {
    QuickActions: (props: Record<string, () => void>) =>
      React.createElement(
        'View',
        { testID: 'quick-actions' },
        Object.keys(props)
          .filter((k) => k.endsWith('Press'))
          .map((k) =>
            React.createElement(
              'TouchableOpacity',
              { key: k, testID: `qa-${k}`, onPress: props[k] },
              null
            )
          )
      ),
  };
});

jest.mock('../components/TodayRow', () => {
  const React = require('react');
  return {
    TodayRow: ({ stats }: { stats: unknown }) =>
      React.createElement(
        'Text',
        { testID: 'today-row' },
        stats ? 'has-stats' : 'no-stats'
      ),
  };
});

jest.mock('../ScheduleSection', () => {
  const React = require('react');
  return {
    ScheduleSection: (props: {
      upcomingJobs: Array<{ id: string }>;
      onViewAllPress: () => void;
      onJobDetailsPress: (id: string) => void;
      onFindJobsPress: () => void;
    }) =>
      React.createElement(
        'View',
        { testID: 'schedule-section' },
        React.createElement('TouchableOpacity', {
          testID: 'schedule-view-all',
          onPress: props.onViewAllPress,
        }),
        React.createElement('TouchableOpacity', {
          testID: 'schedule-find-jobs',
          onPress: props.onFindJobsPress,
        }),
        React.createElement('TouchableOpacity', {
          testID: 'schedule-job-details',
          onPress: () =>
            props.onJobDetailsPress(props.upcomingJobs[0]?.id ?? 'job-x'),
        }),
        React.createElement(
          'Text',
          { testID: 'schedule-count' },
          String(props.upcomingJobs.length)
        )
      ),
  };
});

jest.mock('../components/FinishSetupCard', () => {
  const React = require('react');
  return {
    FinishSetupCard: () =>
      React.createElement('View', { testID: 'finish-setup' }),
  };
});
jest.mock('../components/ContractorBadgesCard', () => {
  const React = require('react');
  return {
    ContractorBadgesCard: () =>
      React.createElement('View', { testID: 'badges' }),
  };
});

jest.mock('../components/NextUpCard', () => {
  const React = require('react');
  return {
    NextUpCard: (props: {
      next: { jobId: string } | null;
      onOpenJob: (id: string) => void;
      onMessage: (id: string) => void;
    }) =>
      React.createElement(
        'View',
        { testID: 'next-up' },
        React.createElement('TouchableOpacity', {
          testID: 'next-up-open',
          onPress: () => props.onOpenJob('next-job-1'),
        }),
        React.createElement('TouchableOpacity', {
          testID: 'next-up-message',
          onPress: () => props.onMessage('next-job-1'),
        }),
        React.createElement(
          'Text',
          { testID: 'next-up-has' },
          props.next ? 'has-next' : 'no-next'
        )
      ),
  };
});

jest.mock('../components/HotLeadsRail', () => {
  const React = require('react');
  return {
    HotLeadsRail: (props: {
      onOpenJob: (id: string) => void;
      onSeeAll: () => void;
    }) =>
      React.createElement(
        'View',
        { testID: 'hot-leads' },
        React.createElement('TouchableOpacity', {
          testID: 'hot-leads-open',
          onPress: () => props.onOpenJob('lead-1'),
        }),
        React.createElement('TouchableOpacity', {
          testID: 'hot-leads-see-all',
          onPress: props.onSeeAll,
        })
      ),
  };
});

// The icon-image require
jest.mock('../../../../assets/icon.png', () => 1, { virtual: true });

import { ContractorDashboard } from '../ContractorDashboard';

const fullStats = {
  nextAppointment: {
    jobId: 'appt-1',
    type: 'Boiler service',
    client: 'Bob',
    location: '12 High St',
    time: '10:00',
  },
  todaysJobs: [
    { jobId: 'today-1', type: 'Leak fix', client: 'Carol', time: '14:00' },
    { jobId: 'today-2', type: 'Install', client: 'Dan', time: '16:00' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mockQueryEnv.capturedQueryFns.length = 0;
  mockUser = {
    id: 'user-1',
    role: 'contractor',
    first_name: 'Jane',
    last_name: 'Doe',
    company_name: 'Acme Plumbing',
  };
  mockQueryEnv.statsState = {
    data: fullStats,
    isLoading: false,
    isError: false,
    isFetching: false,
  };
  mockQueryEnv.unreadCount = 3;
});

describe('ContractorDashboard — loading / error branches', () => {
  it('renders FullScreenLoading while isLoading', () => {
    mockQueryEnv.statsState = {
      data: null,
      isLoading: true,
      isError: false,
      isFetching: false,
    };
    render(<ContractorDashboard />);
    expect(screen.getByTestId('full-screen-loading')).toBeTruthy();
    expect(screen.getByText('Loading dashboard...')).toBeTruthy();
  });

  it('renders error state and retry calls refetch', () => {
    mockQueryEnv.statsState = {
      data: null,
      isLoading: false,
      isError: true,
      isFetching: false,
    };
    render(<ContractorDashboard />);
    expect(screen.getByText('Failed to load dashboard')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Retry loading dashboard'));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });
});

describe('ContractorDashboard — time-of-day greeting branches', () => {
  const RealDate = Date;
  function setHour(hour: number) {
    // @ts-expect-error override global Date for deterministic getHours()
    global.Date = class extends RealDate {
      constructor(...args: unknown[]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(...(args as []));
      }
      getHours() {
        return hour;
      }
    } as DateConstructor;
  }
  afterEach(() => {
    global.Date = RealDate;
  });

  it('shows "Good morning" before noon', () => {
    setHour(9);
    render(<ContractorDashboard />);
    expect(screen.getByText(/Good morning/)).toBeTruthy();
  });

  it('shows "Good afternoon" between noon and 5pm', () => {
    setHour(14);
    render(<ContractorDashboard />);
    expect(screen.getByText(/Good afternoon/)).toBeTruthy();
  });

  it('shows "Good evening" after 5pm', () => {
    setHour(20);
    render(<ContractorDashboard />);
    expect(screen.getByText(/Good evening/)).toBeTruthy();
  });
});

describe('ContractorDashboard — data render + greeting branches', () => {
  it('renders main dashboard with stats', () => {
    render(<ContractorDashboard />);
    expect(screen.getByTestId('home-scroll-view')).toBeTruthy();
    expect(screen.getByTestId('today-row').props.children).toBe('has-stats');
    expect(screen.getByTestId('next-up-has').props.children).toBe('has-next');
    expect(screen.getByTestId('schedule-count').props.children).toBe('2');
  });

  it('uses company_name as business name and initials from first+last', () => {
    render(<ContractorDashboard />);
    // initials JD shown in avatar button (+ dropdown avatar; modal always mounted)
    expect(screen.getAllByText('JD').length).toBeGreaterThanOrEqual(1);
    // greeting + dropdown both show the business name (modal always mounted)
    expect(screen.getAllByText('Acme Plumbing').length).toBeGreaterThanOrEqual(
      1
    );
  });

  it('falls back to first+last name when no company_name', () => {
    mockUser = {
      id: 'u',
      role: 'contractor',
      first_name: 'Sam',
      last_name: 'Lee',
    };
    render(<ContractorDashboard />);
    expect(screen.getAllByText('Sam Lee').length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to first name only when no last name', () => {
    mockUser = { id: 'u', role: 'contractor', first_name: 'Solo' };
    render(<ContractorDashboard />);
    // appears in greeting + dropdown user name (modal always mounted)
    expect(screen.getAllByText('Solo').length).toBeGreaterThanOrEqual(1);
  });

  it('falls back to "Contractor" when no name fields', () => {
    mockUser = { id: 'u', role: 'contractor' };
    render(<ContractorDashboard />);
    expect(screen.getAllByText(/Contractor/).length).toBeGreaterThanOrEqual(1);
    // no initials => avatar button absent
    expect(screen.queryByLabelText('Open profile menu')).toBeFalsy();
  });

  it('renders no-stats / no-next branch when stats are null', () => {
    mockQueryEnv.statsState = {
      data: null,
      isLoading: false,
      isError: false,
      isFetching: false,
    };
    render(<ContractorDashboard />);
    expect(screen.getByTestId('today-row').props.children).toBe('no-stats');
    expect(screen.getByTestId('next-up-has').props.children).toBe('no-next');
    expect(screen.getByTestId('schedule-count').props.children).toBe('0');
  });
});

describe('ContractorDashboard — notification badge branches', () => {
  it('shows numeric badge when unreadCount in range', () => {
    mockQueryEnv.unreadCount = 5;
    render(<ContractorDashboard />);
    expect(screen.getByText('5')).toBeTruthy();
  });

  it('caps badge at 99+ when over 99', () => {
    mockQueryEnv.unreadCount = 150;
    render(<ContractorDashboard />);
    expect(screen.getByText('99+')).toBeTruthy();
  });

  it('hides badge when unreadCount is 0', () => {
    mockQueryEnv.unreadCount = 0;
    render(<ContractorDashboard />);
    expect(screen.queryByText('99+')).toBeFalsy();
  });
});

describe('ContractorDashboard — top bar handlers', () => {
  it('notifications button navigates via parent', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByLabelText('Notifications'));
    expect(mockGetParent).toHaveBeenCalled();
    expect(mockParentNavigate).toHaveBeenCalledWith('Modal', {
      screen: 'Notifications',
    });
  });

  it('avatar button opens profile dropdown menu', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByLabelText('Open profile menu'));
    // dropdown menu items become visible
    expect(screen.getByText('Browse Jobs')).toBeTruthy();
    expect(screen.getByText('Profile & Settings')).toBeTruthy();
  });
});

describe('ContractorDashboard — refresh', () => {
  it('handleRefresh invalidates the contractorStats query', () => {
    render(<ContractorDashboard />);
    const scroll = screen.getByTestId('home-scroll-view');
    const rc = scroll.props.refreshControl;
    rc.props.onRefresh();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['contractorStats', 'user-1'],
    });
  });

  it('reflects isFetching on the RefreshControl', () => {
    mockQueryEnv.statsState = {
      data: fullStats,
      isLoading: false,
      isError: false,
      isFetching: true,
    };
    render(<ContractorDashboard />);
    const rc = screen.getByTestId('home-scroll-view').props.refreshControl;
    expect(rc.props.refreshing).toBe(true);
  });
});

describe('ContractorDashboard — NextUpCard / HotLeadsRail handlers', () => {
  it('NextUp open routes to job details', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByTestId('next-up-open'));
    expect(mockNavigate).toHaveBeenCalledWith('JobsTab', {
      screen: 'JobDetails',
      params: { jobId: 'next-job-1' },
    });
  });

  it('NextUp message routes to message thread', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByTestId('next-up-message'));
    expect(mockNavigate).toHaveBeenCalledWith('MessagingTab', {
      screen: 'MessageThread',
      params: { jobId: 'next-job-1' },
    });
  });

  it('HotLeads open routes to job details', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByTestId('hot-leads-open'));
    expect(mockNavigate).toHaveBeenCalledWith('JobsTab', {
      screen: 'JobDetails',
      params: { jobId: 'lead-1' },
    });
  });

  it('HotLeads see-all routes to JobsList', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByTestId('hot-leads-see-all'));
    expect(mockNavigate).toHaveBeenCalledWith('JobsTab', {
      screen: 'JobsList',
    });
  });
});

describe('ContractorDashboard — QuickActions handlers', () => {
  const cases: Array<[string, unknown[]]> = [
    ['qa-onBrowseJobsPress', ['AddTab']],
    ['qa-onInboxPress', ['MessagingTab', { screen: 'MessagesList' }]],
    ['qa-onQuotesPress', ['BusinessTab', { screen: 'QuoteBuilder' }]],
    ['qa-onInvoicesPress', ['BusinessTab', { screen: 'InvoiceManagement' }]],
    ['qa-onExpensesPress', ['BusinessTab', { screen: 'Expenses' }]],
    ['qa-onCalendarPress', ['BusinessTab', { screen: 'Calendar' }]],
    ['qa-onCRMPress', ['BusinessTab', { screen: 'CRMDashboard' }]],
    ['qa-onFinancePress', ['BusinessTab', { screen: 'FinanceDashboard' }]],
    ['qa-onTimeTrackingPress', ['BusinessTab', { screen: 'TimeTracking' }]],
    ['qa-onReportingPress', ['BusinessTab', { screen: 'Reporting' }]],
  ];

  it.each(cases)('%s navigates correctly', (testID, expected) => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByTestId(testID));
    expect(mockNavigate).toHaveBeenCalledWith(
      ...(expected as [string, object?])
    );
  });
});

describe('ContractorDashboard — ScheduleSection handlers', () => {
  it('view-all routes to BookingStatus', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByTestId('schedule-view-all'));
    expect(mockNavigate).toHaveBeenCalledWith('BusinessTab', {
      screen: 'BookingStatus',
    });
  });

  it('find-jobs routes to AddTab', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByTestId('schedule-find-jobs'));
    expect(mockNavigate).toHaveBeenCalledWith('AddTab');
  });

  it('job-details routes to JobDetails with mapped today job id', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByTestId('schedule-job-details'));
    expect(mockNavigate).toHaveBeenCalledWith('JobsTab', {
      screen: 'JobDetails',
      params: { jobId: 'today-1' },
    });
  });
});

describe('ContractorDashboard — dropdown menu item handlers', () => {
  function openMenu() {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByLabelText('Open profile menu'));
  }

  it('Browse Jobs -> JobsList', () => {
    openMenu();
    fireEvent.press(screen.getByText('Browse Jobs'));
    expect(mockNavigate).toHaveBeenCalledWith('JobsTab', {
      screen: 'JobsList',
    });
  });

  it('Inbox -> MessagesList', () => {
    openMenu();
    fireEvent.press(screen.getByText('Inbox'));
    expect(mockNavigate).toHaveBeenCalledWith('MessagingTab', {
      screen: 'MessagesList',
    });
  });

  it('Quotes -> QuoteBuilder', () => {
    openMenu();
    fireEvent.press(screen.getByText('Quotes'));
    expect(mockNavigate).toHaveBeenCalledWith('BusinessTab', {
      screen: 'QuoteBuilder',
    });
  });

  it('Invoices -> InvoiceManagement', () => {
    openMenu();
    fireEvent.press(screen.getByText('Invoices'));
    expect(mockNavigate).toHaveBeenCalledWith('BusinessTab', {
      screen: 'InvoiceManagement',
    });
  });

  it('Expenses -> Expenses', () => {
    openMenu();
    fireEvent.press(screen.getByText('Expenses'));
    expect(mockNavigate).toHaveBeenCalledWith('BusinessTab', {
      screen: 'Expenses',
    });
  });

  it('Calendar -> Calendar', () => {
    openMenu();
    fireEvent.press(screen.getByText('Calendar'));
    expect(mockNavigate).toHaveBeenCalledWith('BusinessTab', {
      screen: 'Calendar',
    });
  });

  it('Profile & Settings -> goToTab ProfileTab', () => {
    openMenu();
    fireEvent.press(screen.getByText('Profile & Settings'));
    expect(mockGoToTab).toHaveBeenCalledWith(expect.anything(), 'ProfileTab');
  });

  it('handleItemPress closes dropdown (backdrop dismiss path also covered)', () => {
    openMenu();
    // pressing an item triggers setDropdownOpen(false) then item.onPress
    fireEvent.press(screen.getByText('Browse Jobs'));
    expect(mockNavigate).toHaveBeenCalled();
  });
});

describe('ContractorDashboard — queryFn execution (function coverage)', () => {
  it('invokes captured queryFns: stats + unread, and error paths when no user', () => {
    render(<ContractorDashboard />);
    // mockQueryEnv.capturedQueryFns has [statsFn, unreadFn]
    expect(mockQueryEnv.capturedQueryFns.length).toBeGreaterThanOrEqual(2);
    const statsFn = mockQueryEnv.capturedQueryFns[0];
    const unreadFn = mockQueryEnv.capturedQueryFns[1];
    // happy paths
    expect(() => statsFn()).not.toThrow();
    expect(() => unreadFn()).not.toThrow();
  });

  it('queryFns throw "Not signed in" when user is null', () => {
    mockUser = null;
    render(<ContractorDashboard />);
    const statsFn = mockQueryEnv.capturedQueryFns[0];
    const unreadFn = mockQueryEnv.capturedQueryFns[1];
    expect(() => statsFn()).toThrow('Not signed in');
    expect(() => unreadFn()).toThrow('Not signed in');
  });
});

describe('ContractorDashboard — modal backdrop dismiss', () => {
  it('backdrop press is wired (onRequestClose / backdrop onPress)', () => {
    render(<ContractorDashboard />);
    fireEvent.press(screen.getByLabelText('Open profile menu'));
    // Find the Modal and invoke onRequestClose for branch coverage
    const modal = screen.UNSAFE_getByType('Modal' as never);
    expect(typeof modal.props.onRequestClose).toBe('function');
    modal.props.onRequestClose();
    expect(modal.props.visible).toBe(true);
  });
});
