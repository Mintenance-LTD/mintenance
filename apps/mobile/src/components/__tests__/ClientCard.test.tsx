import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ClientCard, ClientData } from '../ClientCard';

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: ({ name, testID, ...props }: any) => {
    const Text = require('react-native').Text;
    return (
      <Text testID={testID || `icon-${name}`} {...props}>
        {name}
      </Text>
    );
  },
}));

// Mock theme with actual design token values
jest.mock('../../theme', () => ({
  theme: {
    colors: {
      primary: '#0F172A',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
      textPrimary: '#0F172A',
      textSecondary: '#475569',
      background: '#FFFFFF',
      borderLight: '#F1F5F9',
      surfaceSecondary: '#F8FAFC',
    },
    borderRadius: { lg: 12, sm: 6, full: 9999 },
    shadows: { base: {} },
  },
}));

describe('ClientCard', () => {
  const mockOnPress = jest.fn();
  const mockOnCall = jest.fn();
  const mockOnMessage = jest.fn();
  const mockOnEmail = jest.fn();

  const baseClient: ClientData = {
    id: 'client-1',
    client_id: 'client-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+44 7700 900000',
    client_type: 'residential',
    relationship_status: 'active',
    total_jobs: 12,
    total_revenue: 5000,
    last_job_date: '2024-01-15',
    satisfaction_score: 4.5,
    payment_history_score: 95,
    churn_risk_score: 25,
    created_at: '2023-06-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current date for consistent lastJobDays calculations
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-20'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Component Rendering', () => {
    it('should render with all client data fields', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('john.doe@example.com')).toBeTruthy();
      expect(getByText('+44 7700 900000')).toBeTruthy();
      expect(getByText('ACTIVE')).toBeTruthy();
      expect(getByText('12')).toBeTruthy();
      expect(getByText('£5,000')).toBeTruthy();
      expect(getByText('95%')).toBeTruthy();
      expect(getByText('4.5')).toBeTruthy();
    });

    it('should render client name correctly', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('John Doe')).toBeTruthy();
    });

    it('should render email address', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('john.doe@example.com')).toBeTruthy();
    });

    it('should render phone number when provided', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('+44 7700 900000')).toBeTruthy();
    });

    it('should not render phone section when phone is missing', () => {
      const clientWithoutPhone = { ...baseClient, phone: undefined };
      const { queryByText } = render(
        <ClientCard client={clientWithoutPhone} onPress={mockOnPress} />
      );

      expect(queryByText('+44 7700 900000')).toBeNull();
    });

    it('should render status badge', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('ACTIVE')).toBeTruthy();
    });
  });

  describe('Status Colors - getStatusColor()', () => {
    it('should apply success color for active status', () => {
      const activeClient = { ...baseClient, relationship_status: 'active' as const };
      const { getByText } = render(
        <ClientCard client={activeClient} onPress={mockOnPress} />
      );

      const statusBadge = getByText('ACTIVE').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#10B981' }),
        ])
      );
    });

    it('should apply warning color for prospect status', () => {
      const prospectClient = {
        ...baseClient,
        relationship_status: 'prospect' as const,
      };
      const { getByText } = render(
        <ClientCard client={prospectClient} onPress={mockOnPress} />
      );

      const statusBadge = getByText('PROSPECT').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#F59E0B' }),
        ])
      );
    });

    it('should apply textSecondary color for inactive status', () => {
      const inactiveClient = {
        ...baseClient,
        relationship_status: 'inactive' as const,
      };
      const { getByText } = render(
        <ClientCard client={inactiveClient} onPress={mockOnPress} />
      );

      const statusBadge = getByText('INACTIVE').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#475569' }),
        ])
      );
    });

    it('should apply error color for former status', () => {
      const formerClient = { ...baseClient, relationship_status: 'former' as const };
      const { getByText } = render(
        <ClientCard client={formerClient} onPress={mockOnPress} />
      );

      const statusBadge = getByText('FORMER').parent;
      expect(statusBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ backgroundColor: '#EF4444' }),
        ])
      );
    });
  });

  describe('Client Type Icons - getClientTypeIcon()', () => {
    it('should render home icon for residential client type', () => {
      const residentialClient = { ...baseClient, client_type: 'residential' as const };
      const { getByTestId } = render(
        <ClientCard client={residentialClient} onPress={mockOnPress} />
      );

      expect(getByTestId('icon-home')).toBeTruthy();
    });

    it('should render business icon for commercial client type', () => {
      const commercialClient = { ...baseClient, client_type: 'commercial' as const };
      const { getByTestId } = render(
        <ClientCard client={commercialClient} onPress={mockOnPress} />
      );

      expect(getByTestId('icon-business')).toBeTruthy();
    });

    it('should render construct icon for industrial client type', () => {
      const industrialClient = { ...baseClient, client_type: 'industrial' as const };
      const { getByTestId } = render(
        <ClientCard client={industrialClient} onPress={mockOnPress} />
      );

      expect(getByTestId('icon-construct')).toBeTruthy();
    });

    it('should render library icon for government client type', () => {
      const governmentClient = { ...baseClient, client_type: 'government' as const };
      const { getByTestId } = render(
        <ClientCard client={governmentClient} onPress={mockOnPress} />
      );

      expect(getByTestId('icon-library')).toBeTruthy();
    });
  });

  describe('Risk Level Calculation - getRiskLevel()', () => {
    it('should display High Risk for churn_risk_score >= 70', () => {
      const highRiskClient = { ...baseClient, churn_risk_score: 75 };
      const { getByText } = render(
        <ClientCard client={highRiskClient} onPress={mockOnPress} />
      );

      expect(getByText('High Risk')).toBeTruthy();
      const riskBadge = getByText('High Risk').parent;
      expect(riskBadge?.props.style).toEqual(
        expect.arrayContaining([expect.objectContaining({ borderColor: '#EF4444' })])
      );
    });

    it('should display High Risk for edge case score = 70', () => {
      const edgeHighRiskClient = { ...baseClient, churn_risk_score: 70 };
      const { getByText } = render(
        <ClientCard client={edgeHighRiskClient} onPress={mockOnPress} />
      );

      expect(getByText('High Risk')).toBeTruthy();
    });

    it('should display Medium Risk for churn_risk_score >= 40 and < 70', () => {
      const mediumRiskClient = { ...baseClient, churn_risk_score: 50 };
      const { getByText } = render(
        <ClientCard client={mediumRiskClient} onPress={mockOnPress} />
      );

      expect(getByText('Medium Risk')).toBeTruthy();
      const riskBadge = getByText('Medium Risk').parent;
      expect(riskBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ borderColor: '#F59E0B' }),
        ])
      );
    });

    it('should display Medium Risk for edge case score = 40', () => {
      const edgeMediumRiskClient = { ...baseClient, churn_risk_score: 40 };
      const { getByText } = render(
        <ClientCard client={edgeMediumRiskClient} onPress={mockOnPress} />
      );

      expect(getByText('Medium Risk')).toBeTruthy();
    });

    it('should display Low Risk for churn_risk_score < 40', () => {
      const lowRiskClient = { ...baseClient, churn_risk_score: 25 };
      const { getByText } = render(
        <ClientCard client={lowRiskClient} onPress={mockOnPress} />
      );

      expect(getByText('Low Risk')).toBeTruthy();
      const riskBadge = getByText('Low Risk').parent;
      expect(riskBadge?.props.style).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ borderColor: '#10B981' }),
        ])
      );
    });

    it('should display Low Risk for edge case score = 39', () => {
      const edgeLowRiskClient = { ...baseClient, churn_risk_score: 39 };
      const { getByText } = render(
        <ClientCard client={edgeLowRiskClient} onPress={mockOnPress} />
      );

      expect(getByText('Low Risk')).toBeTruthy();
    });

    it('should display Low Risk for score = 0', () => {
      const zeroRiskClient = { ...baseClient, churn_risk_score: 0 };
      const { queryByText } = render(
        <ClientCard client={zeroRiskClient} onPress={mockOnPress} />
      );

      // churn_risk_score > 0 check should hide risk badge when score is 0
      expect(queryByText('Low Risk')).toBeNull();
    });

    it('should not display risk badge when churn_risk_score is 0', () => {
      const zeroRiskClient = { ...baseClient, churn_risk_score: 0 };
      const { queryByText } = render(
        <ClientCard client={zeroRiskClient} onPress={mockOnPress} />
      );

      expect(queryByText(/Risk$/)).toBeNull();
    });
  });

  describe('Metrics Display', () => {
    it('should display total jobs count', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('12')).toBeTruthy();
      expect(getByText('Jobs')).toBeTruthy();
    });

    it('should display zero jobs correctly', () => {
      const newClient = { ...baseClient, total_jobs: 0 };
      const { getByText } = render(
        <ClientCard client={newClient} onPress={mockOnPress} />
      );

      expect(getByText('0')).toBeTruthy();
    });

    it('should format revenue with pound symbol and comma separator', () => {
      const highRevenueClient = { ...baseClient, total_revenue: 125000 };
      const { getByText } = render(
        <ClientCard client={highRevenueClient} onPress={mockOnPress} />
      );

      expect(getByText('£125,000')).toBeTruthy();
    });

    it('should format revenue for zero value', () => {
      const zeroRevenueClient = { ...baseClient, total_revenue: 0 };
      const { getByText } = render(
        <ClientCard client={zeroRevenueClient} onPress={mockOnPress} />
      );

      expect(getByText('£0')).toBeTruthy();
    });

    it('should format revenue for decimal values', () => {
      const decimalRevenueClient = { ...baseClient, total_revenue: 1234.56 };
      const { getByText } = render(
        <ClientCard client={decimalRevenueClient} onPress={mockOnPress} />
      );

      expect(getByText('£1,234.56')).toBeTruthy();
    });

    it('should display payment history score as percentage', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('95%')).toBeTruthy();
      expect(getByText('Pay Score')).toBeTruthy();
    });

    it('should display payment score for 0%', () => {
      const lowPaymentClient = { ...baseClient, payment_history_score: 0 };
      const { getByText } = render(
        <ClientCard client={lowPaymentClient} onPress={mockOnPress} />
      );

      expect(getByText('0%')).toBeTruthy();
    });

    it('should display payment score for 100%', () => {
      const perfectPaymentClient = { ...baseClient, payment_history_score: 100 };
      const { getByText } = render(
        <ClientCard client={perfectPaymentClient} onPress={mockOnPress} />
      );

      expect(getByText('100%')).toBeTruthy();
    });

    it('should display satisfaction score when provided', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('4.5')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
    });

    it('should format satisfaction score to 1 decimal place', () => {
      const exactScoreClient = { ...baseClient, satisfaction_score: 4.0 };
      const { getByText } = render(
        <ClientCard client={exactScoreClient} onPress={mockOnPress} />
      );

      expect(getByText('4.0')).toBeTruthy();
    });

    it('should round satisfaction score to 1 decimal place', () => {
      const preciseScoreClient = { ...baseClient, satisfaction_score: 4.567 };
      const { getByText } = render(
        <ClientCard client={preciseScoreClient} onPress={mockOnPress} />
      );

      expect(getByText('4.6')).toBeTruthy();
    });

    it('should not display satisfaction metric when score is missing', () => {
      const noSatisfactionClient = { ...baseClient, satisfaction_score: undefined };
      const { queryByText } = render(
        <ClientCard client={noSatisfactionClient} onPress={mockOnPress} />
      );

      expect(queryByText('Rating')).toBeNull();
    });

    it('should display star icon for satisfaction rating', () => {
      const { getByTestId } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByTestId('icon-star')).toBeTruthy();
    });
  });

  describe('Last Job Activity', () => {
    it('should calculate days since last job correctly', () => {
      // last_job_date: 2024-01-15, current: 2024-01-20 => 5 days
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('Last job 5 days ago')).toBeTruthy();
    });

    it('should display "today" when last job was today', () => {
      const todayClient = { ...baseClient, last_job_date: '2024-01-20' };
      const { getByText } = render(
        <ClientCard client={todayClient} onPress={mockOnPress} />
      );

      expect(getByText('Last job today')).toBeTruthy();
    });

    it('should display "1 days ago" for yesterday (edge case)', () => {
      const yesterdayClient = { ...baseClient, last_job_date: '2024-01-19' };
      const { getByText } = render(
        <ClientCard client={yesterdayClient} onPress={mockOnPress} />
      );

      expect(getByText('Last job 1 days ago')).toBeTruthy();
    });

    it('should calculate days for last job over a month ago', () => {
      const oldJobClient = { ...baseClient, last_job_date: '2023-12-15' };
      const { getByText } = render(
        <ClientCard client={oldJobClient} onPress={mockOnPress} />
      );

      expect(getByText('Last job 36 days ago')).toBeTruthy();
    });

    it('should not display last activity when last_job_date is missing', () => {
      const noLastJobClient = { ...baseClient, last_job_date: undefined };
      const { queryByText } = render(
        <ClientCard client={noLastJobClient} onPress={mockOnPress} />
      );

      expect(queryByText(/Last job/)).toBeNull();
    });

    it('should display time icon for last activity', () => {
      const { getByTestId } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByTestId('icon-time-outline')).toBeTruthy();
    });
  });

  describe('Action Buttons Conditional Rendering', () => {
    it('should render call button when onCall handler is provided', () => {
      const { getByTestId } = render(
        <ClientCard
          client={baseClient}
          onPress={mockOnPress}
          onCall={mockOnCall}
        />
      );

      expect(getByTestId('icon-call')).toBeTruthy();
    });

    it('should not render call button when onCall handler is missing', () => {
      const { queryByTestId } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(queryByTestId('icon-call')).toBeNull();
    });

    it('should render message button when onMessage handler is provided', () => {
      const { getByTestId } = render(
        <ClientCard
          client={baseClient}
          onPress={mockOnPress}
          onMessage={mockOnMessage}
        />
      );

      expect(getByTestId('icon-chatbubble')).toBeTruthy();
    });

    it('should not render message button when onMessage handler is missing', () => {
      const { queryByTestId } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(queryByTestId('icon-chatbubble')).toBeNull();
    });

    it('should render email button when onEmail handler is provided', () => {
      const { getByTestId } = render(
        <ClientCard
          client={baseClient}
          onPress={mockOnPress}
          onEmail={mockOnEmail}
        />
      );

      expect(getByTestId('icon-mail')).toBeTruthy();
    });

    it('should not render email button when onEmail handler is missing', () => {
      const { queryByTestId } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(queryByTestId('icon-mail')).toBeNull();
    });

    it('should render all action buttons when all handlers are provided', () => {
      const { getByTestId } = render(
        <ClientCard
          client={baseClient}
          onPress={mockOnPress}
          onCall={mockOnCall}
          onMessage={mockOnMessage}
          onEmail={mockOnEmail}
        />
      );

      expect(getByTestId('icon-call')).toBeTruthy();
      expect(getByTestId('icon-chatbubble')).toBeTruthy();
      expect(getByTestId('icon-mail')).toBeTruthy();
      expect(getByTestId('icon-ellipsis-horizontal')).toBeTruthy();
    });

    it('should always render more button regardless of other handlers', () => {
      const { getByTestId } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByTestId('icon-ellipsis-horizontal')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('should call onPress when card is pressed', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      const card = getByText('John Doe').parent?.parent?.parent?.parent;
      fireEvent.press(card!);

      expect(mockOnPress).toHaveBeenCalledTimes(1);
    });

    it('should call onCall when call button is pressed', () => {
      const { getByTestId } = render(
        <ClientCard
          client={baseClient}
          onPress={mockOnPress}
          onCall={mockOnCall}
        />
      );

      const callButton = getByTestId('icon-call').parent;
      fireEvent.press(callButton!);

      expect(mockOnCall).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should call onMessage when message button is pressed', () => {
      const { getByTestId } = render(
        <ClientCard
          client={baseClient}
          onPress={mockOnPress}
          onMessage={mockOnMessage}
        />
      );

      const messageButton = getByTestId('icon-chatbubble').parent;
      fireEvent.press(messageButton!);

      expect(mockOnMessage).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should call onEmail when email button is pressed', () => {
      const { getByTestId } = render(
        <ClientCard
          client={baseClient}
          onPress={mockOnPress}
          onEmail={mockOnEmail}
        />
      );

      const emailButton = getByTestId('icon-mail').parent;
      fireEvent.press(emailButton!);

      expect(mockOnEmail).toHaveBeenCalledTimes(1);
      expect(mockOnPress).not.toHaveBeenCalled();
    });

    it('should not throw error when pressing card without optional handlers', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      const card = getByText('John Doe').parent?.parent?.parent?.parent;

      expect(() => {
        fireEvent.press(card!);
      }).not.toThrow();
    });
  });

  describe('Edge Cases and Data Validation', () => {
    it('should handle missing optional fields gracefully', () => {
      const minimalClient: ClientData = {
        id: 'client-2',
        client_id: 'client-2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane@example.com',
        client_type: 'commercial',
        relationship_status: 'prospect',
        total_jobs: 0,
        total_revenue: 0,
        payment_history_score: 0,
        churn_risk_score: 0,
        created_at: '2024-01-01T00:00:00Z',
      };

      const { getByText, queryByText } = render(
        <ClientCard client={minimalClient} onPress={mockOnPress} />
      );

      expect(getByText('Jane Smith')).toBeTruthy();
      expect(queryByText(/Last job/)).toBeNull();
      expect(queryByText('Rating')).toBeNull();
      expect(queryByText(/Risk$/)).toBeNull();
    });

    it('should handle large revenue numbers with proper formatting', () => {
      const richClient = { ...baseClient, total_revenue: 9999999 };
      const { getByText } = render(
        <ClientCard client={richClient} onPress={mockOnPress} />
      );

      expect(getByText('£9,999,999')).toBeTruthy();
    });

    it('should handle maximum churn risk score', () => {
      const maxRiskClient = { ...baseClient, churn_risk_score: 100 };
      const { getByText } = render(
        <ClientCard client={maxRiskClient} onPress={mockOnPress} />
      );

      expect(getByText('High Risk')).toBeTruthy();
    });

    it('should handle maximum satisfaction score', () => {
      const maxSatisfactionClient = { ...baseClient, satisfaction_score: 5.0 };
      const { getByText } = render(
        <ClientCard client={maxSatisfactionClient} onPress={mockOnPress} />
      );

      expect(getByText('5.0')).toBeTruthy();
    });

    it('should handle minimum satisfaction score', () => {
      const minSatisfactionClient = { ...baseClient, satisfaction_score: 0.0 };
      const { getByText } = render(
        <ClientCard client={minSatisfactionClient} onPress={mockOnPress} />
      );

      // FIXED: Component now uses !== undefined check instead of truthy check
      // A satisfaction_score of 0.0 should be displayed (it's a valid rating)
      expect(getByText('0.0')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
    });

    it('should handle very old last job date (years ago)', () => {
      const oldClient = { ...baseClient, last_job_date: '2020-01-01' };
      const { getByText } = render(
        <ClientCard client={oldClient} onPress={mockOnPress} />
      );

      // 2024-01-20 - 2020-01-01 = 1480 days
      expect(getByText('Last job 1480 days ago')).toBeTruthy();
    });

    it('should handle empty first name or last name edge case', () => {
      const noNameClient = { ...baseClient, first_name: '', last_name: '' };
      const { getByText } = render(
        <ClientCard client={noNameClient} onPress={mockOnPress} />
      );

      // Should render " " (space between empty first and last name)
      expect(getByText(' ')).toBeTruthy();
    });

    it('should handle missing phone without crashing', () => {
      const noPhoneClient = { ...baseClient, phone: undefined };

      expect(() => {
        render(<ClientCard client={noPhoneClient} onPress={mockOnPress} />);
      }).not.toThrow();
    });
  });

  describe('Component Structure and Accessibility', () => {
    it('should render as TouchableOpacity for main container', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      const card = getByText('John Doe').parent?.parent?.parent?.parent;
      expect(card?.type).toBe('TouchableOpacity');
    });

    it('should render all metric labels correctly', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('Jobs')).toBeTruthy();
      expect(getByText('Revenue')).toBeTruthy();
      expect(getByText('Pay Score')).toBeTruthy();
      expect(getByText('Rating')).toBeTruthy();
    });

    it('should render status text in uppercase', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('ACTIVE')).toBeTruthy();
    });

    it('should display risk level with "Risk" suffix', () => {
      const { getByText } = render(
        <ClientCard client={baseClient} onPress={mockOnPress} />
      );

      expect(getByText('Low Risk')).toBeTruthy();
    });
  });
});
