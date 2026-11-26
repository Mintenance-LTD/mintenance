// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PortfolioWorkOrder } from '../../app/portfolio/portfolio-work-order';

vi.mock('@/lib/csrf-client', () => ({
  getCsrfHeaders: async () => ({ 'x-csrf-token': 'test-token' }),
}));

const ticketId = 'd6c0469a-fd05-4480-981b-a1b9ca70d349';
const path = `/api/portfolio/tickets/${ticketId}/work-order`;
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status });

afterEach(() => vi.unstubAllGlobals());

describe('Portfolio private work order', () => {
  it('opens the exact ticket and saves a private record without marking it paid', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ workOrder: null }))
      .mockImplementationOnce(async (_url: string, init: RequestInit) => {
        const saved = JSON.parse(String(init.body));
        return reply({
          workOrder: {
            ...saved,
            revision: 1,
            ticketId,
            updatedAt: '2026-11-26T23:20:00Z',
          },
        });
      });
    vi.stubGlobal('fetch', fetch);
    render(<PortfolioWorkOrder ticketId={ticketId} />);
    expect(fetch).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Open work order' }));
    fireEvent.change(
      await screen.findByLabelText('Contractor or company name'),
      { target: { value: 'TEST ONLY Plumbing' } }
    );
    fireEvent.change(screen.getByLabelText('Quoted (£)'), {
      target: { value: '240.00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save work order' }));

    expect(
      await screen.findByText(
        'Work order saved. No message or payment was sent.'
      )
    ).toBeDefined();
    expect(fetch.mock.calls[0][0]).toBe(path);
    const [calledPath, options] = fetch.mock.calls[1];
    expect(calledPath).toBe(path);
    expect(options).toMatchObject({
      method: 'PUT',
      headers: { 'x-csrf-token': 'test-token' },
    });
    expect(JSON.parse(options.body)).toMatchObject({
      revision: 0,
      quotedPence: 24000,
      approvedPence: null,
      invoicedPence: null,
      paidPence: null,
    });
    expect(screen.getByText('£240.00')).toBeDefined();
  });

  it('retains the draft and prevents silently overwriting a teammate change', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(reply({ workOrder: null }))
      .mockResolvedValueOnce(reply({}, 409));
    vi.stubGlobal('fetch', fetch);
    render(<PortfolioWorkOrder ticketId={ticketId} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open work order' }));
    const input = (await screen.findByLabelText(
      'Contractor or company name'
    )) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'TEST ONLY draft' } });
    const button = screen.getByRole('button', {
      name: 'Save work order',
    }) as HTMLButtonElement;
    fireEvent.click(button);

    expect((await screen.findByRole('alert')).textContent).toContain(
      'A teammate changed this record'
    );
    expect(input.value).toBe('TEST ONLY draft');
    expect(button.disabled).toBe(true);
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));
  });
});
