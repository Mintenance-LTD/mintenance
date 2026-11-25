import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { CommunicationComposer } from '@/components/support/CommunicationComposer';

it('starts without an audience and requires explicit confirmation after a channel-count preview', async () => {
  const api = vi
    .fn()
    .mockResolvedValueOnce({
      campaign: {
        id: 'draft',
        title: 'Test notice',
        body: 'Synthetic only',
        audience: 'all',
        channels: ['email', 'in_app'],
      },
      channelCounts: { email: 2, in_app: 2 },
    })
    .mockResolvedValueOnce({ message: '4 deliveries queued.' });
  const onResult = vi.fn();
  render(<CommunicationComposer api={api} onResult={onResult} />);
  const audience = screen.getByLabelText('Audience');
  expect(audience).toHaveValue('');
  fireEvent.change(screen.getByLabelText('Subject'), {
    target: { value: 'Test notice' },
  });
  fireEvent.change(screen.getByLabelText('Message'), {
    target: { value: 'Synthetic only' },
  });
  const preview = screen.getByRole('button', {
    name: 'Preview recipients and message',
  });
  expect(preview).toBeDisabled();
  fireEvent.change(audience, { target: { value: 'all' } });
  fireEvent.click(preview);
  expect(await screen.findByText('Email · 2')).toBeInTheDocument();
  expect(screen.getByText('In-app inbox · 2')).toBeInTheDocument();
  const send = screen.getByRole('button', {
    name: 'Confirm and queue this notification',
  });
  expect(send).toBeDisabled();
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: /Confirm send to all eligible customers/,
    })
  );
  fireEvent.click(send);
  await screen.findByLabelText('Audience');
  expect(api).toHaveBeenCalledTimes(2);
  expect(api.mock.calls.at(-1)).toEqual([
    '/api/admin/support/campaigns/draft',
    'POST',
    { confirmAll: true },
  ]);
  expect(onResult).toHaveBeenCalledWith('4 deliveries queued.');
});
