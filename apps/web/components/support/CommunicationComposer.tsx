'use client';
import { useState } from 'react';
type Draft = {
  id: string;
  title: string;
  body: string;
  audience: string;
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
  const [audience, setAudience] = useState('');
  const [email, setEmail] = useState('');
  const [channels, setChannels] = useState(['in_app']);
  const [draft, setDraft] = useState<(Draft & { channelCounts: Record<string, number> }) | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  async function preview() {
    if (!audience || busy) return;
    setBusy(true);
    try {
      const d = await api<{ campaign: Draft; channelCounts: Record<string, number> }>(
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
      setDraft({ ...d.campaign, channelCounts: d.channelCounts });
      setConfirmAll(false);
    } catch (e) {
      onResult(e instanceof Error ? e.message : 'Could not prepare draft');
    } finally {
      setBusy(false);
    }
  }
  async function send() {
    if (!draft || busy || (draft.audience === 'all' && !confirmAll)) return;
    setBusy(true);
    try {
      const d = await api<{ message: string }>(
        `/api/admin/support/campaigns/${draft.id}`,
        'POST',
        { confirmAll: draft.audience === 'all' && confirmAll }
      );
      onResult(d.message);
      setDraft(null);
      setTitle('');
      setAudience('');
      setConfirmAll(false);
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
          <h4 className='font-medium'>Eligible recipients by channel</h4>
          <ul className='list-disc pl-5'>
            {Object.entries(draft.channelCounts).map(([channel, count]) => (
              <li key={channel}>{channel === 'push' ? 'Push and inbox' : channel === 'in_app' ? 'In-app inbox' : 'Email'} · {count}</li>
            ))}
          </ul>
          <p>Eligibility is checked again when you queue the message. Provider acceptance and delivery are tracked separately.</p>
          {draft.audience === 'all' && <label className='block font-medium'>
            <input type='checkbox' checked={confirmAll} onChange={(event) => setConfirmAll(event.target.checked)} />{' '}
            Confirm send to all eligible customers in this preview
          </label>}
          <button
            className='btn-primary'
            disabled={busy || (draft.audience === 'all' && !confirmAll)}
            onClick={() => void send()}
          >
            Confirm and queue this notification
          </button>
          <button
            className='ml-4'
            disabled={busy}
            onClick={() => { setDraft(null); setConfirmAll(false); }}
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
              <option value=''>Choose an audience</option>
              <option value='homeowners'>Homeowners</option>
              <option value='contractors'>Contractors</option>
              <option value='individual'>One customer</option>
              <option value='all'>All customers</option>
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
              busy || !audience || !title.trim() || !body.trim() || channels.length === 0 || (audience === 'individual' && !email.trim())
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
