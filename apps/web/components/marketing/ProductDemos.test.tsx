import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProductDemos } from './ProductDemos';

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.ComponentProps<'a'>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));
afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

it('keeps homeowner demos and sign-up relevant to that audience', () => {
  render(<ProductDemos audience='homeowner' />);
  expect(
    screen.queryByRole('button', { name: /Find work in your area/ })
  ).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: /Start with clear expectations/ })
  );
  expect(
    screen
      .getByRole('link', { name: /Get started as a homeowner/ })
      .getAttribute('href')
  ).toBe('/register?role=homeowner');
  expect(
    screen.queryByRole('link', { name: /Join as a contractor/ })
  ).toBeNull();
});

it('opens a shared job-map link without loading or autoplaying the video', () => {
  window.history.replaceState(null, '', '/for-contractors#demo-local-work');
  const { container } = render(<ProductDemos audience='contractor' />);
  expect(
    screen
      .getByRole('button', { name: /Find work in your area/ })
      .getAttribute('aria-pressed')
  ).toBe('true');
  const video = container.querySelector('video')!;
  expect(video.getAttribute('preload')).toBe('none');
  expect(video.hasAttribute('autoplay')).toBe(false);
  expect(video.hasAttribute('controls')).toBe(true);
  expect(video.querySelector('source')?.getAttribute('src')).toContain(
    '03-find-local-work.mp4'
  );
  expect(video.querySelector('track')?.getAttribute('src')).toContain(
    '03-find-local-work.vtt'
  );
  expect(
    screen
      .getByRole('link', { name: /Join as a contractor/ })
      .getAttribute('href')
  ).toBe('/register?role=contractor');
});

it('replaces the player when switching and keeps a readable fallback on media failure', () => {
  const { container } = render(<ProductDemos />);
  const original = container.querySelector('video');
  fireEvent.click(
    screen.getByRole('button', { name: /Your trade. Your business/ })
  );
  const video = container.querySelector('video')!;
  expect(video).not.toBe(original);
  fireEvent.error(video.querySelector('source')!);
  expect(screen.getByRole('status').textContent).toContain('could not load');
  expect(screen.getByText('Read the walkthrough')).toBeTruthy();
  fireEvent.click(
    screen.getByRole('button', { name: /Start with clear expectations/ })
  );
  expect(screen.queryByRole('status')).toBeNull();
  expect(
    screen.getByRole('link', { name: /Join as a contractor/ })
  ).toBeTruthy();
  expect(
    screen.getByRole('link', { name: /Get started as a homeowner/ })
  ).toBeTruthy();
});
