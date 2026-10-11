import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { JobQuickActions } from '../JobQuickActions';

describe('JobQuickActions dispute eligibility', () => {
  const props = {
    jobId: 'job', jobTitle: 'Painting', isOwner: true, canApprove: true,
    status: 'completed', isCompletionConfirmedByHomeowner: true,
    onTimelinePress: jest.fn(), onEditPress: jest.fn(),
    onSignOffPress: jest.fn(), onDisputePress: jest.fn(),
    onDisputeDetailsPress: jest.fn(),
  };

  it('keeps the dispute record accessible after settlement without offering a new dispute', () => {
    const screen = render(<JobQuickActions {...props} canReportProblem={false} />);
    expect(screen.queryByText('Report a Problem')).toBeNull();
    fireEvent.press(screen.getByText('View Dispute Record'));
    expect(props.onDisputeDetailsPress).toHaveBeenCalled();
  });

  it('allows an eligible participant to report a problem', () => {
    const screen = render(<JobQuickActions {...props} canReportProblem />);
    fireEvent.press(screen.getByText('Report a Problem'));
    expect(props.onDisputePress).toHaveBeenCalled();
  });
});
