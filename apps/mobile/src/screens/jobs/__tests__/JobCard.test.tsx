import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { JobCard } from '../JobCard';

// ---- Mock externals only (never the component under test) ----

// Ionicons -> render the icon name as Text so we can assert on it.
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name }: { name: string }) => {
    const { Text } = require('react-native');
    return <Text testID={`icon-${name}`}>{name}</Text>;
  },
}));

// ImageCarousel is heavy (expo-linear-gradient, OptimizedImage). Stub it but
// surface the props that JobCard's branches feed in so we can assert on them.
jest.mock('../../../components/ui/ImageCarousel', () => ({
  ImageCarousel: ({
    images,
    showDots,
    overlayContent,
  }: {
    images: string[];
    showDots: boolean;
    overlayContent: React.ReactNode;
  }) => {
    const { View, Text } = require('react-native');
    return (
      <View testID='image-carousel'>
        <Text testID='carousel-count'>{images.length}</Text>
        <Text testID='carousel-dots'>{String(showDots)}</Text>
        {overlayContent}
      </View>
    );
  },
}));

// ProgressDots is a sibling component, not under test.
jest.mock('../ProgressDots', () => ({
  ProgressDots: ({ status }: { status: string }) => {
    const { Text } = require('react-native');
    return <Text testID='progress-dots'>{status}</Text>;
  },
}));

// Design-system colour tokens — keep deterministic + cheap.
jest.mock('../../../design-system/mint-editorial', () => ({
  me: {
    brand: '#3F8C7A',
    brandSoft: '#E6F2EE',
    accent: '#D97706',
    warnBg: '#FEF3C7',
    errFg: '#DC2626',
    errBg: '#FEE2E2',
    onBrand: '#FFFFFF',
    ink2: '#616161',
    bg2: '#F5F5F5',
  },
}));

// Styles are an object of style objects — pass them through trivially.
jest.mock('../JobCardStyles', () => ({
  styles: new Proxy(
    {},
    {
      get: (_t, prop) => ({ __style: String(prop) }),
    }
  ),
}));

type AnyJob = Record<string, unknown>;

const baseJob = (overrides: AnyJob = {}): any => ({
  id: 'job-1',
  title: 'Fix leaking tap',
  status: 'posted',
  category: 'plumbing',
  created_at: new Date().toISOString(),
  ...overrides,
});

const renderCard = (
  props: Partial<React.ComponentProps<typeof JobCard>> = {}
) => {
  const onPress = jest.fn();
  const onSave = jest.fn();
  const onBid = jest.fn();
  const utils = render(
    <JobCard
      item={baseJob() as any}
      saved={false}
      onPress={onPress}
      onSave={onSave}
      onBid={onBid}
      {...props}
    />
  );
  return { ...utils, onPress, onSave, onBid };
};

describe('JobCard', () => {
  // ---------------- Photo hero vs placeholder ----------------
  describe('hero section', () => {
    it('renders ImageCarousel when photos array present (string urls)', () => {
      const { getByTestId } = renderCard({
        item: baseJob({
          photos: ['https://a.com/1.jpg', 'https://a.com/2.jpg'],
        }) as any,
      });
      expect(getByTestId('image-carousel')).toBeTruthy();
      expect(getByTestId('carousel-count').props.children).toBe(2);
      // showDots true when >1 photo
      expect(getByTestId('carousel-dots').props.children).toBe('true');
    });

    it('falls back to images key when photos absent', () => {
      const { getByTestId } = renderCard({
        item: baseJob({
          photos: undefined,
          images: [{ url: 'https://a.com/x.jpg' }],
        }) as any,
      });
      expect(getByTestId('image-carousel')).toBeTruthy();
      expect(getByTestId('carousel-count').props.children).toBe(1);
      // single photo -> showDots false
      expect(getByTestId('carousel-dots').props.children).toBe('false');
    });

    it('renders category placeholder when no valid photos (empty strings filtered)', () => {
      const { queryByTestId, getAllByTestId } = renderCard({
        item: baseJob({ photos: ['', '   ', null] }) as any,
      });
      expect(queryByTestId('image-carousel')).toBeNull();
      // placeholder + category tag both show the plumbing icon
      expect(getAllByTestId('icon-water-outline').length).toBe(2);
    });
  });

  // ---------------- Urgency branches ----------------
  describe('urgency', () => {
    it('shows urgent tag in carousel overlay when high urgency + photos', () => {
      const { getByTestId } = renderCard({
        item: baseJob({
          photos: ['https://a.com/1.jpg'],
          urgency: 'high',
        }) as any,
      });
      expect(getByTestId('icon-flame')).toBeTruthy();
    });

    it('shows urgent tag in placeholder when emergency urgency + no photos', () => {
      const { getByTestId } = renderCard({
        item: baseJob({ urgency: 'emergency' }) as any,
      });
      expect(getByTestId('icon-flame')).toBeTruthy();
    });

    it('reads priority when urgency missing', () => {
      const { getByTestId } = renderCard({
        item: baseJob({ urgency: undefined, priority: 'high' }) as any,
      });
      expect(getByTestId('icon-flame')).toBeTruthy();
    });

    it('no urgent tag for medium urgency', () => {
      const { queryByTestId } = renderCard({
        item: baseJob({ urgency: 'medium' }) as any,
      });
      expect(queryByTestId('icon-flame')).toBeNull();
    });

    it('defaults urgency to medium when neither urgency nor priority set', () => {
      const { queryByTestId } = renderCard({
        item: baseJob({ urgency: undefined, priority: undefined }) as any,
      });
      expect(queryByTestId('icon-flame')).toBeNull();
    });
  });

  // ---------------- Save button ----------------
  describe('save button', () => {
    it('renders heart-outline when not saved', () => {
      const { getByTestId } = renderCard({ saved: false });
      expect(getByTestId('icon-heart-outline')).toBeTruthy();
    });

    it('renders filled heart when saved', () => {
      const { getByTestId } = renderCard({ saved: true });
      expect(getByTestId('icon-heart')).toBeTruthy();
    });

    it('save press stops propagation and triggers onSave', () => {
      const onSave = jest.fn();
      const { UNSAFE_getAllByType } = render(
        <JobCard
          item={baseJob() as any}
          saved={false}
          onPress={jest.fn()}
          onSave={onSave}
          onBid={jest.fn()}
        />
      );
      const { TouchableOpacity } = require('react-native');
      const touchables = UNSAFE_getAllByType(TouchableOpacity);
      // The save button is the 2nd touchable (card is 1st)
      const stop = jest.fn();
      fireEvent.press(touchables[1], { stopPropagation: stop });
      expect(onSave).toHaveBeenCalled();
      expect(stop).toHaveBeenCalled();
    });
  });

  // ---------------- Status badge (homeowner only) ----------------
  describe('status badge', () => {
    it('shows status badge for homeowner', () => {
      const { getByTestId } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'assigned' }) as any,
      });
      // assigned status icon
      expect(getByTestId('icon-person-add')).toBeTruthy();
    });

    it('hides status badge for contractor', () => {
      const { queryByTestId } = renderCard({
        isContractor: true,
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(queryByTestId('icon-person-add')).toBeNull();
    });

    it('falls back to posted status style for unknown status', () => {
      const { getByText } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'weird_status' }) as any,
      });
      // title still renders
      expect(getByText('Fix leaking tap')).toBeTruthy();
    });
  });

  // ---------------- Title + location + time ----------------
  describe('content meta', () => {
    it('renders title', () => {
      const { getByText } = renderCard();
      expect(getByText('Fix leaking tap')).toBeTruthy();
    });

    it('uses city when present', () => {
      const { getByText } = renderCard({
        item: baseJob({ city: 'London' }) as any,
      });
      expect(getByText('London')).toBeTruthy();
    });

    it('parses location string when no city (takes second-to-last segment)', () => {
      const { getByText } = renderCard({
        item: baseJob({
          city: undefined,
          location: '10 Downing St, Westminster, London',
        }) as any,
      });
      // split(',').slice(-2,-1)[0].trim() -> "Westminster"
      expect(getByText('Westminster')).toBeTruthy();
    });

    it('falls back to raw location string when single segment', () => {
      const { getByText } = renderCard({
        item: baseJob({ city: undefined, location: 'Bristol' }) as any,
      });
      expect(getByText('Bristol')).toBeTruthy();
    });

    it('uses raw location object city fallback when location is not a string', () => {
      const { getByText } = renderCard({
        item: baseJob({ city: undefined, location: { lat: 1 } }) as any,
      });
      // rawLocation = '' -> locationStr '' -> location row hidden; only time row
      expect(getByText('Today')).toBeTruthy();
    });

    it('hides location row when locationStr empty', () => {
      const { queryByTestId } = renderCard({
        item: baseJob({ city: undefined, location: '' }) as any,
      });
      expect(queryByTestId('icon-location-outline')).toBeNull();
    });

    it('shows location row when location present', () => {
      const { getByTestId } = renderCard({
        item: baseJob({ city: 'Leeds' }) as any,
      });
      expect(getByTestId('icon-location-outline')).toBeTruthy();
    });

    it('time label Today for 0 days', () => {
      const { getByText } = renderCard({
        item: baseJob({ created_at: new Date().toISOString() }) as any,
      });
      expect(getByText('Today')).toBeTruthy();
    });

    it('time label 1d ago for 1 day', () => {
      const d = new Date(Date.now() - 1000 * 3600 * 24 * 1.2).toISOString();
      const { getByText } = renderCard({
        item: baseJob({ created_at: d }) as any,
      });
      expect(getByText('1d ago')).toBeTruthy();
    });

    it('time label Nd ago for several days', () => {
      const d = new Date(Date.now() - 1000 * 3600 * 24 * 5).toISOString();
      const { getByText } = renderCard({
        item: baseJob({ created_at: d }) as any,
      });
      expect(getByText('5d ago')).toBeTruthy();
    });

    it('uses createdAt camelCase when created_at missing', () => {
      const { getByText } = renderCard({
        item: baseJob({
          created_at: undefined,
          createdAt: new Date().toISOString(),
        }) as any,
      });
      expect(getByText('Today')).toBeTruthy();
    });

    it('defaults to now when both date keys missing', () => {
      const { getByText } = renderCard({
        item: baseJob({ created_at: undefined, createdAt: undefined }) as any,
      });
      expect(getByText('Today')).toBeTruthy();
    });
  });

  // ---------------- Category tag ----------------
  describe('category tag', () => {
    it('capitalizes category name', () => {
      const { getByText } = renderCard({
        item: baseJob({ category: 'electrical' }) as any,
      });
      expect(getByText('Electrical')).toBeTruthy();
    });

    it('falls back to General label + general icon when category missing', () => {
      const { getByText, getAllByTestId } = renderCard({
        item: baseJob({ category: undefined }) as any,
      });
      expect(getByText('General')).toBeTruthy();
      expect(getAllByTestId('icon-construct-outline').length).toBeGreaterThan(
        0
      );
    });

    it('uses general colors/icon for unknown category', () => {
      const { getByText } = renderCard({
        item: baseJob({ category: 'spaceship' }) as any,
      });
      expect(getByText('Spaceship')).toBeTruthy();
    });
  });

  // ---------------- Bid badge ----------------
  describe('bid badge', () => {
    it('shows singular bid', () => {
      const { getByText } = renderCard({
        bidCount: 1,
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(getByText('1 bid')).toBeTruthy();
    });

    it('shows plural bids', () => {
      const { getByText } = renderCard({
        bidCount: 3,
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(getByText('3 bids')).toBeTruthy();
    });

    it('hides bid badge when bidCount 0', () => {
      const { queryByTestId } = renderCard({
        bidCount: 0,
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(queryByTestId('icon-people-outline')).toBeNull();
    });

    it('hides bid badge when bidCount undefined', () => {
      const { queryByTestId } = renderCard({
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(queryByTestId('icon-people-outline')).toBeNull();
    });
  });

  // ---------------- New badge ----------------
  describe('new badge', () => {
    it('shows New badge for posted job created today', () => {
      const { getByText } = renderCard({
        item: baseJob({
          status: 'posted',
          created_at: new Date().toISOString(),
        }) as any,
      });
      expect(getByText('New')).toBeTruthy();
    });

    it('hides New badge when not posted', () => {
      const { queryByText } = renderCard({
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(queryByText('New')).toBeNull();
    });

    it('hides New badge when posted but older than today', () => {
      const d = new Date(Date.now() - 1000 * 3600 * 24 * 3).toISOString();
      const { queryByText } = renderCard({
        item: baseJob({ status: 'posted', created_at: d }) as any,
      });
      expect(queryByText('New')).toBeNull();
    });
  });

  // ---------------- Progress section (homeowner, assigned/in_progress) ----------------
  describe('progress section', () => {
    it('shows progress dots for homeowner assigned job', () => {
      const { getByTestId, getByText } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(getByTestId('progress-dots').props.children).toBe('assigned');
      expect(getByText('Posted')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
    });

    it('shows progress dots for homeowner in_progress job', () => {
      const { getByTestId } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'in_progress' }) as any,
      });
      expect(getByTestId('progress-dots').props.children).toBe('in_progress');
    });

    it('hides progress dots for contractor', () => {
      const { queryByTestId } = renderCard({
        isContractor: true,
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(queryByTestId('progress-dots')).toBeNull();
    });

    it('hides progress dots for posted status', () => {
      const { queryByTestId } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'posted' }) as any,
      });
      expect(queryByTestId('progress-dots')).toBeNull();
    });
  });

  // ---------------- Contractor info row (homeowner) ----------------
  describe('assigned contractor row', () => {
    it('shows contractor row when name present + assigned', () => {
      const { getByText, getByTestId } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'assigned', contractor_name: 'alice' }) as any,
      });
      expect(getByText('alice')).toBeTruthy();
      expect(getByText('A')).toBeTruthy(); // initial uppercased
      expect(getByText('Assigned Contractor')).toBeTruthy();
      expect(getByTestId('icon-chatbubble-outline')).toBeTruthy();
    });

    it('hides contractor row when name absent', () => {
      const { queryByText } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(queryByText('Assigned Contractor')).toBeNull();
    });

    it('hides contractor row when status not assigned/in_progress', () => {
      const { queryByText } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'completed', contractor_name: 'Bob' }) as any,
      });
      expect(queryByText('Assigned Contractor')).toBeNull();
    });
  });

  // ---------------- View Bids CTA (homeowner, posted, has bids) ----------------
  describe('view bids CTA', () => {
    it('shows singular View Bid', () => {
      const { getByText } = renderCard({
        isContractor: false,
        bidCount: 1,
        item: baseJob({ status: 'posted' }) as any,
      });
      expect(getByText('View 1 Bid')).toBeTruthy();
    });

    it('shows plural View Bids and fires onPress', () => {
      const { getByText, onPress } = renderCard({
        isContractor: false,
        bidCount: 4,
        item: baseJob({ status: 'posted' }) as any,
      });
      const cta = getByText('View 4 Bids');
      fireEvent.press(cta);
      expect(onPress).toHaveBeenCalled();
    });

    it('hides View Bids when no bids', () => {
      const { queryByText } = renderCard({
        isContractor: false,
        bidCount: 0,
        item: baseJob({ status: 'posted' }) as any,
      });
      expect(queryByText(/View/)).toBeNull();
    });

    it('hides View Bids for contractor', () => {
      const { queryByText } = renderCard({
        isContractor: true,
        bidCount: 2,
        item: baseJob({ status: 'posted' }) as any,
      });
      expect(queryByText(/View 2/)).toBeNull();
    });
  });

  // ---------------- Contractor Quick Bid / Bid Sent ----------------
  describe('contractor quick bid', () => {
    it('shows Quick Bid for contractor on posted job not yet bid', () => {
      const { getByText, getByTestId } = renderCard({
        isContractor: true,
        hasUserBid: false,
        item: baseJob({ status: 'posted' }) as any,
      });
      expect(getByText('Quick Bid')).toBeTruthy();
      expect(getByTestId('icon-flash')).toBeTruthy();
    });

    it('Quick Bid press stops propagation + fires onBid', () => {
      const onBid = jest.fn();
      const { getByText } = render(
        <JobCard
          item={baseJob({ status: 'posted' }) as any}
          saved={false}
          onPress={jest.fn()}
          onSave={jest.fn()}
          onBid={onBid}
          isContractor
          hasUserBid={false}
        />
      );
      fireEvent.press(getByText('Quick Bid'), { stopPropagation: jest.fn() });
      expect(onBid).toHaveBeenCalled();
    });

    it('shows Bid Sent when contractor already bid', () => {
      const { getByText, queryByText } = renderCard({
        isContractor: true,
        hasUserBid: true,
        item: baseJob({ status: 'posted' }) as any,
      });
      expect(getByText('Bid Sent')).toBeTruthy();
      expect(queryByText('Quick Bid')).toBeNull();
    });

    it('hides Quick Bid for non-posted job', () => {
      const { queryByText } = renderCard({
        isContractor: true,
        hasUserBid: false,
        item: baseJob({ status: 'assigned' }) as any,
      });
      expect(queryByText('Quick Bid')).toBeNull();
      expect(queryByText('Bid Sent')).toBeNull();
    });

    it('hides contractor CTAs entirely for homeowner', () => {
      const { queryByText } = renderCard({
        isContractor: false,
        item: baseJob({ status: 'posted' }) as any,
      });
      expect(queryByText('Quick Bid')).toBeNull();
      expect(queryByText('Bid Sent')).toBeNull();
    });
  });

  // ---------------- Defensive colour fallbacks ----------------
  // Exercises the `catColor?.bg ?? '#F5F5F5'` / `?.icon` / `?.text` branches
  // by forcing CATEGORY_COLORS lookup (incl. the `general` fallback) to be
  // undefined, which the normal mint-editorial-backed map never is.
  describe('undefined category colour fallbacks', () => {
    let JobCardWithEmptyColors: typeof JobCard;

    beforeAll(() => {
      jest.isolateModules(() => {
        jest.doMock('../types', () => {
          const actual = jest.requireActual('../types');
          return {
            ...actual,
            CATEGORY_COLORS: {}, // no entries, no `general` -> catColor === undefined
            CATEGORY_ICONS: {}, // -> categoryIcon falls back to 'construct-outline'
          };
        });
        JobCardWithEmptyColors = require('../JobCard').JobCard;
      });
    });

    afterAll(() => {
      jest.dontMock('../types');
    });

    it('renders placeholder with hardcoded color fallbacks when catColor undefined', () => {
      const { getByText, getAllByTestId } = render(
        <JobCardWithEmptyColors
          item={baseJob({ category: 'plumbing' }) as any}
          saved={false}
          onPress={jest.fn()}
          onSave={jest.fn()}
          onBid={jest.fn()}
        />
      );
      // category tag label still renders + default construct icon used
      expect(getByText('Plumbing')).toBeTruthy();
      expect(getAllByTestId('icon-construct-outline').length).toBeGreaterThan(
        0
      );
    });
  });

  // ---------------- Card press ----------------
  describe('card press', () => {
    it('fires onPress when card tapped', () => {
      const { getByText, onPress } = renderCard();
      fireEvent.press(getByText('Fix leaking tap'));
      expect(onPress).toHaveBeenCalled();
    });
  });
});
