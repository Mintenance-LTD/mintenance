/** Explain an existing approval hold before attempting a release request. */
export async function explainCoolingOff(
  endsAt: string | undefined,
  confirm: (options: {
    title: string;
    description: string;
    confirmText: string;
  }) => Promise<boolean>
): Promise<boolean> {
  const end = endsAt ? new Date(endsAt) : null;
  if (!end || end.getTime() <= Date.now() || Number.isNaN(end.getTime()))
    return false;
  await confirm({
    title: 'Payment is in its review period',
    description:
      'Approval starts a 48-hour hold so you can report a problem before funds are released. This payment becomes eligible on ' +
      end.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) +
      '. Bank arrival follows Stripe processing.',
    confirmText: 'Understood',
  });
  return true;
}
