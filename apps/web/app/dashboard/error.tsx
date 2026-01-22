'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Dashboard Error</h1>
      <p>Something went wrong loading your dashboard.</p>
      <button onClick={reset}>Try Again</button>
    </div>
  );
}
