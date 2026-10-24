import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { TutorialSpotlight } from './TutorialSpotlight';
it('finishes rather than skips and keeps keyboard navigation inside the dialog', async () => {
  const complete = vi.fn(),
    skip = vi.fn();
  const before = document.createElement('button');
  document.body.append(before);
  before.focus();
  const { unmount } = render(
    <TutorialSpotlight
      step={{
        id: 'done',
        title: 'Ready',
        description: 'You can revisit the guide.',
      }}
      stepIndex={1}
      totalSteps={2}
      onNext={vi.fn()}
      onSkip={skip}
      onComplete={complete}
      isFirstStep={false}
      isLastStep
      onPrevious={vi.fn()}
    />
  );
  const dialog = await screen.findByRole('dialog');
  await waitFor(() => expect(document.activeElement).toBe(dialog));
  const finish = screen.getByRole('button', { name: 'Finish tour' });
  finish.focus();
  fireEvent.keyDown(finish, { key: 'Tab' });
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Skip tour' })
  );
  fireEvent.click(finish);
  expect(complete).toHaveBeenCalledOnce();
  expect(skip).not.toHaveBeenCalled();
  fireEvent.keyDown(dialog, { key: 'Escape' });
  expect(skip).toHaveBeenCalledOnce();
  unmount();
  expect(document.activeElement).toBe(before);
  before.remove();
});
