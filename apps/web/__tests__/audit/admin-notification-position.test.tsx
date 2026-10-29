import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AdminNotificationBell } from '@/components/admin/AdminNotificationBell';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it('keeps the sidebar popup inside the viewport and outside clipping ancestors', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 200,
    bottom: 60,
  } as DOMRect);
  const { container } = render(<AdminNotificationBell userId='' />);
  fireEvent.click(screen.getByRole('button', { name: 'Admin Notifications' }));
  const panel = screen.getByRole('dialog');
  expect(container.contains(panel)).toBe(false);
  expect(panel.style.position).toBe('fixed');
  expect(Number.parseFloat(panel.style.left)).toBeGreaterThanOrEqual(8);
  expect(
    Number.parseFloat(panel.style.left) + Number.parseFloat(panel.style.width)
  ).toBeLessThanOrEqual(window.innerWidth - 8);
  fireEvent.mouseDown(panel);
  expect(screen.getByRole('dialog')).toBeTruthy();
  fireEvent.keyDown(panel, { key: 'Escape' });
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Admin Notifications' })
  );
});

it('fits a narrow viewport and closes on an outside click', () => {
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(320);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    left: 280,
    bottom: 60,
  } as DOMRect);
  render(<AdminNotificationBell userId='' />);
  fireEvent.click(screen.getByRole('button', { name: 'Admin Notifications' }));
  const panel = screen.getByRole('dialog');
  expect(panel.style.left).toBe('8px');
  expect(panel.style.width).toBe('304px');
  fireEvent.mouseDown(document.body);
  expect(screen.queryByRole('dialog')).toBeNull();
});
