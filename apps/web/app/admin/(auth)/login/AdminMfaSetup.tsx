'use client';
import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ShieldCheck, Smartphone, KeyRound, Loader2 } from 'lucide-react';
import { useCSRF } from '@/lib/hooks/useCSRF';
import styles from './AdminMfaSetup.module.css';

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
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <div className={styles.brand}><span className={styles.logo}><Image src='/assets/logo-mark.png' alt='' width={24} height={24} /></span>Mintenance<span className={styles.badge}>Admin</span></div>
        <section className={styles.card} aria-labelledby='mfa-title'>
          <header className={styles.header}>
            <span className={styles.icon}><ShieldCheck size={28} aria-hidden='true' /></span>
            <p className={styles.eyebrow}>ACCOUNT SECURITY</p>
            <h1 id='mfa-title'>Secure your admin account</h1>
            <p>Your password was accepted. Add an authenticator to finish securing your account.</p>
          </header>
          {error && <p className={styles.error} role='alert'>{error}</p>}
          {!setup ? <>
            <div className={styles.intro}>
              <Smartphone size={24} aria-hidden='true' />
              <div><h2>A little extra protection</h2><p>Use an authenticator app to generate a six-digit code when you sign in. We’ll also give you backup codes to keep somewhere private.</p></div>
            </div>
            <button className={styles.primary} disabled={busy || !csrfToken} onClick={() => void submit('enroll')}>{busy && <Loader2 className={styles.spinner} size={18} aria-hidden='true' />}{busy ? 'Preparing setup…' : 'Set up two-factor authentication'}</button>
          </> : <form onSubmit={e => { e.preventDefault(); if (saved && code.length === 6 && !busy && csrfToken) void submit('verify'); }}>
            <section className={styles.step} aria-labelledby='scan-title'>
              <h2 id='scan-title'><span className={styles.number}>1</span>Connect your authenticator</h2>
              <p>Scan this QR code in your authenticator app.</p>
              <div className={styles.qr}>
                {/* A private, locally generated data URL; never a remote image request. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={setup.qrCode} alt='Authenticator setup QR code' width={240} height={240} />
              </div>
              <details className={styles.manual}><summary>Can’t scan the code? Enter a setup key</summary><code>{setup.secret}</code></details>
            </section>
            <section className={styles.step} aria-labelledby='backup-title'>
              <h2 id='backup-title'><span className={styles.number}>2</span>Save your backup codes</h2>
              <p>Keep these somewhere private. Each code can be used once if you lose access to your authenticator.</p>
              <div className={styles.codes}>{setup.backupCodes.map(backup => <code key={backup}>{backup}</code>)}</div>
              <label className={styles.check}><input type='checkbox' checked={saved} onChange={e => setSaved(e.target.checked)} />I have saved my backup codes</label>
            </section>
            <section className={styles.step} aria-labelledby='verify-title'>
              <h2 id='verify-title'><span className={styles.number}>3</span>Confirm your setup</h2>
              <label className={styles.label} htmlFor='authenticator-code'>Six-digit authenticator code</label>
              <input id='authenticator-code' className={styles.input} inputMode='numeric' autoComplete='one-time-code' maxLength={6} placeholder='000000' value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ''))} aria-describedby='code-help' />
              <p id='code-help' className={styles.help}>Enter the code from your app. Once verified, sign in again to access the dashboard.</p>
              {!saved && <p className={styles.help}>Save your backup codes and tick the checkbox above to enable verification.</p>}<button type='submit' className={styles.primary} disabled={busy || !csrfToken || !saved || code.length !== 6}>{busy && <Loader2 className={styles.spinner} size={18} aria-hidden='true' />}{busy ? 'Verifying…' : 'Verify and finish setup'}</button>
            </section>
          </form>}
          <button className={styles.back} disabled={busy} onClick={onComplete}><ArrowLeft size={16} aria-hidden='true' />Return to sign in</button>
        </section>
        <p className={styles.footer}><KeyRound size={15} aria-hidden='true' />Two-factor authentication protects access to your admin tools.</p>
      </div>
    </main>
  );
}

