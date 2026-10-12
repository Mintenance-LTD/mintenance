// @vitest-environment jsdom
import { render, screen, cleanup } from '@testing-library/react';
import { createPortal } from 'react-dom';
import { afterEach, expect, it } from 'vitest';
import { Button, SharedThemeProvider } from '@mintenance/shared-ui';
afterEach(cleanup);
it('preserves the shared mint theme through a portal', () => {
  render(<SharedThemeProvider>{createPortal(<Button>Confirm</Button>, document.body)}</SharedThemeProvider>);
  expect(screen.getByRole('button', { name: 'Confirm' }).style.backgroundColor).toBe('rgb(47, 111, 95)');
});
it('keeps the legacy theme outside the provider', () => {
  render(<Button>Legacy</Button>);
  expect(screen.getByRole('button', { name: 'Legacy' }).style.backgroundColor).not.toBe('rgb(47, 111, 95)');
});
