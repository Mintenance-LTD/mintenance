import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { SwipeableCard } from '@/components/SwipeableCard';

afterEach(cleanup);
it.each([
  ['onSwipeRight', 150, 0],
  ['onSwipeLeft', -150, 0],
  ['onSwipeDown', 0, 150],
  ['onSwipeUp', 0, -150],
] as const)('uses the latest drag position for %s', (direction, x, y) => {
  const callback = vi.fn();
  render(
    <SwipeableCard {...{ [direction]: callback }}>
      <span>Card</span>
    </SwipeableCard>
  );
  fireEvent.mouseDown(screen.getByText('Card'), { clientX: 10, clientY: 10 });
  // Move and release can arrive before React commits the position state.
  act(() => {
    fireEvent.mouseMove(document, { clientX: 10 + x, clientY: 10 + y });
    fireEvent.mouseUp(document);
    fireEvent.mouseUp(document);
  });
  expect(callback).toHaveBeenCalledOnce();
});
it('uses the current callback when props change during a swipe', () => {
  const old = vi.fn(),
    current = vi.fn();
  const view = render(<SwipeableCard onSwipeRight={old}>Card</SwipeableCard>);
  fireEvent.mouseDown(screen.getByText('Card'), { clientX: 0, clientY: 0 });
  fireEvent.mouseMove(document, { clientX: 150, clientY: 0 });
  view.rerender(<SwipeableCard onSwipeRight={current}>Card</SwipeableCard>);
  fireEvent.mouseUp(document);
  expect(current).toHaveBeenCalledOnce();
  expect(old).not.toHaveBeenCalled();
});
it('does not accept a card when the browser cancels a touch gesture', () => {
  const callback = vi.fn();
  render(<SwipeableCard onSwipeRight={callback}>Card</SwipeableCard>);
  fireEvent.touchStart(screen.getByText('Card'), {
    touches: [{ clientX: 0, clientY: 0 }],
  });
  fireEvent.touchMove(document, { touches: [{ clientX: 150, clientY: 0 }] });
  fireEvent.touchCancel(document);
  fireEvent.touchEnd(document);
  expect(callback).not.toHaveBeenCalled();
});
