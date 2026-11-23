import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import TeamAccess from '@/app/properties/[id]/components/TeamAccess';

const pending = {
  id: 'pending',
  email: 'manager@example.test',
  role: 'manager',
  status: 'pending',
};
const accepted = {
  id: 'accepted',
  email: 'accepted@example.test',
  role: 'admin',
  status: 'accepted',
};
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toast }));

afterEach(() => vi.unstubAllGlobals());

it('copies sign-in instructions only for a recorded invitation awaiting acceptance', async () => {
  const copy = vi.fn().mockResolvedValue(undefined);
  const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: copy },
  });
  try {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(Response.json({ members: [pending, accepted] }))
    );
    render(<TeamAccess propertyId='synthetic' />);
    const button = await screen.findByRole('button', {
      name: 'Copy invitation instructions',
    });
    expect(
      screen.getAllByRole('button', { name: 'Copy invitation instructions' })
    ).toHaveLength(1);
    fireEvent.click(button);
    await waitFor(() =>
      expect(copy).toHaveBeenCalledWith(
        expect.stringMatching(
          /manager\. Sign in with manager@example\.test at .*\/properties and accept/
        )
      )
    );
    expect(toast.success).toHaveBeenCalledWith(
      'Invitation instructions copied'
    );

    copy.mockRejectedValueOnce(new Error('Clipboard unavailable'));
    fireEvent.click(button);
    const instructions = await screen.findByLabelText<HTMLTextAreaElement>(
      'Invitation instructions'
    );
    expect(instructions.value).toContain('manager@example.test');
  } finally {
    if (original) Object.defineProperty(navigator, 'clipboard', original);
    else Reflect.deleteProperty(navigator, 'clipboard');
  }
});
