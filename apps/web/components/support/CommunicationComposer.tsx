'use client';
import { useState } from 'react';
type Draft = {
  id: string;
  title: string;
  body: string;
  audience: string;
  recipient_ids: string[];
  channels: string[];
};
export function CommunicationComposer({
  api,
  onResult,
}: {
  api: <T>(path: string, method?: string, payload?: unknown) => Promise<T>;
  onResult: (s: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState('all');
  const [email, setEmail] = useState('');
  const [channels, setChannels] = useState(['in_app']);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  async function preview() {
    setBusy(true);
    try {
      const d = await api<{ campaign: Draft }>(
        '/api/admin/support/campaigns',
        'POST',
        {
          title,
          body,
          audience,
          channels,
          ...(audience === 'individual' ? { recipientEmail: email } : {}),
        }
      );
      setDraft(d.campaign);
    } catch (e) {
      onResult(e instanceof Error ? e.message : 'Could not prepare draft');
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!draft) return;
    setBusy(true);
    try {
      const d = await api<{ message: string }>(
        `/api/admin/support/campaigns/${draft.id}`,
        'POST'
      );
      onResult(d.message);
      setDraft(null);
      setTitle('');
      setBody('');
    } catch (e) {
      onResult(e instanceof Error ? e.message : 'Could not send');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className='rounded-xl border bg-white p-5 space-y-4'>
      <h2 className='text-xl font-semibold'>Customer notification</h2>
      <p>
        Use for service updates and customer assistance. Marketing campaigns
        require a separate consent-aware workflow.
      </p>
      {draft ? (
        <>
          <h3 className='font-semibold'>{draft.title}</h3>
          <p className='whitespace-pre-wrap'>{draft.body}</p>
          <p>
            Up to {draft.recipient_ids.length} current customers ·{' '}
            {draft.channels.join(', ')}. Unverified, deleted and banned accounts
            are excluded when sending.
          </p>
          <button
            className='btn-primary'
            disabled={busy}
            onClick={() => void send()}
          >
            Confirm and queue this notification
          </button>
          <button
            className='ml-4'
            disabled={busy}
            onClick={() => setDraft(null)}
          >
            Return to editing
          </button>
        </>
      ) : (
        <>
          <label className='block'>
            Audience
            <select
              className='block border rounded p-2'
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
            >
              {['all', 'homeowners', 'contractors', 'individual'].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
          {audience === 'individual' && (
            <label className='block'>
              Customer email
              <input
                type='email'
                className='block border rounded p-2'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <label className='block'>
            Subject
            <input
              className='block w-full border rounded p-3'
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className='block'>
            Message
            <textarea
              className='block w-full border rounded p-3'
              rows={5}
              maxLength={5000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <fieldset>
            <legend>Channels</legend>
            {['in_app', 'email', 'push'].map((c) => (
              <label key={c} className='mr-4'>
                <input
                  type='checkbox'
                  checked={channels.includes(c)}
                  onChange={(e) =>
                    setChannels(
                      e.target.checked
                        ? [...channels, c]
                        : channels.filter((x) => x !== c)
                    )
                  }
                />
                {c === 'push'
                  ? 'Push and inbox'
                  : c === 'in_app'
                    ? 'In-app inbox'
                    : 'Email'}
              </label>
            ))}
          </fieldset>
          <button
            className='btn-primary'
            disabled={
              busy || !title.trim() || !body.trim() || channels.length === 0
            }
            onClick={() => void preview()}
          >
            Preview recipients and message
          </button>
        </>
      )}
    </section>
  );
}
