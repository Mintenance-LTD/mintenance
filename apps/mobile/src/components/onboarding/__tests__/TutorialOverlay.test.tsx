import React from 'react';
import { render } from '../../test-utils';
import { TutorialOverlay } from '../TutorialOverlay';

describe('TutorialOverlay', () => {
  const step = {
    id: 'step-1',
    title: 'Welcome',
    description: 'First step',
  };

  it('should initialize with default values', () => {
    const { toJSON } = render(
      <TutorialOverlay
        visible={false}
        step={step}
        stepIndex={0}
        totalSteps={1}
        onNext={jest.fn()}
        onSkip={jest.fn()}
        isFirstStep={true}
        isLastStep={true}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should handle updates correctly', () => {
    const { rerender, toJSON } = render(
      <TutorialOverlay
        visible={false}
        step={step}
        stepIndex={0}
        totalSteps={2}
        onNext={jest.fn()}
        onSkip={jest.fn()}
        isFirstStep={true}
        isLastStep={false}
      />
    );
    rerender(
      <TutorialOverlay
        visible={true}
        step={step}
        stepIndex={1}
        totalSteps={2}
        onNext={jest.fn()}
        onSkip={jest.fn()}
        isFirstStep={false}
        isLastStep={true}
      />
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should clean up on unmount', () => {
    const { unmount, toJSON } = render(
      <TutorialOverlay
        visible={false}
        step={step}
        stepIndex={0}
        totalSteps={1}
        onNext={jest.fn()}
        onSkip={jest.fn()}
        isFirstStep={true}
        isLastStep={true}
      />
    );
    unmount();
    expect(toJSON()).toBeNull();
  });
});
