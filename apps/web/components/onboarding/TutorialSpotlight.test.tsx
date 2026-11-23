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
  expect(document.body.style.overflow).toBe('hidden');
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
  expect(document.body.style.overflow).toBe('');
  expect(document.activeElement).toBe(before);
  before.remove();
});

it('returns focus to the page heading when the tour launch control is removed', async () => {
  const main = document.createElement('main');
  const heading = document.createElement('h1');
  heading.textContent = 'Your dashboard';
  const launcher = document.createElement('button');
  main.append(heading, launcher);
  document.body.append(main);
  launcher.focus();
  const { unmount } = render(
    <TutorialSpotlight
      step={{ id: 'first', title: 'Tour', description: 'Dashboard guide' }}
      stepIndex={0}
      totalSteps={1}
      onNext={vi.fn()}
      onSkip={vi.fn()}
      onComplete={vi.fn()}
      isFirstStep
      isLastStep
    />
  );
  await waitFor(() => expect(screen.getByRole('dialog')).toHaveFocus());
  launcher.remove();
  unmount();
  expect(heading).toHaveFocus();
  expect(heading).toHaveAttribute('tabindex', '-1');
  const next = document.createElement('button');
  main.append(next);
  next.focus();
  expect(heading).not.toHaveAttribute('tabindex');
  main.remove();
});
