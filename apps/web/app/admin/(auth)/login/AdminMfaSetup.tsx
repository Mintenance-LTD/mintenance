'use client';
import { useState } from 'react';
import { useCSRF } from '@/lib/hooks/useCSRF';

export function AdminMfaSetup({ token, onComplete }: { token: string; onComplete: () => void }) {
  const { csrfToken } = useCSRF();
  const [setup, setSetup] = useState<{ qrCode: string; secret: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(action: 'enroll' | 'verify') {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/mfa/setup', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken || '' }, body: JSON.stringify({ action, preMfaToken: token, ...(action === 'verify' ? { code } : {}) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Setup failed. Please try again.');
      if (action === 'enroll') setSetup(data);
      else onComplete();
    } catch (e) { setError(e instanceof Error ? e.message : 'Setup failed'); }
    finally { setBusy(false); }
  }
  return <main className='mx-auto max-w-lg space-y-5 p-8'>
    <h1 className='text-2xl font-bold'>Secure your admin account</h1>
    <p>Your password was accepted. Set up an authenticator app before accessing the admin dashboard.</p>
    {error && <p role='alert'>{error}</p>}
    {!setup ? <button disabled={busy || !csrfToken} onClick={() => void submit('enroll')}>Set up two-factor authentication</button> : <>
      <p>Scan this QR code in your authenticator app, or enter the setup key manually.</p>
      {/* A private, locally generated data URL; never a remote image request. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={setup.qrCode} alt='Authenticator setup QR code' width={240} height={240} />
      <p className='break-all'>Setup key: {setup.secret}</p>
      <h2 className='font-bold'>Save your backup codes somewhere private</h2>
      <pre>{setup.backupCodes.join('\n')}</pre>
      <label className='block'><input type='checkbox' checked={saved} onChange={e => setSaved(e.target.checked)} /> I have saved my backup codes</label>
      <label className='block'>Six-digit authenticator code<input className='block border p-2' inputMode='numeric' autoComplete='one-time-code' maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} /></label>
      <button disabled={busy || !csrfToken || !saved || code.length !== 6} onClick={() => void submit('verify')}>Verify and finish setup</button>
    </>}
    <button className='block' onClick={onComplete}>Return to sign in</button>
  </main>;
}
