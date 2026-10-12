"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type CompletedJob = { id: string; title: string; category: string; photos?: { url: string }[] };
export function CompletedJobPortfolio({ jobs, contractorId, onUpload }: {
  jobs: CompletedJob[];
  contractorId: string;
  onUpload: (data: { files: File[]; title: string; category: string; description?: string }) => Promise<void>;
}) {
  const [job, setJob] = useState<CompletedJob | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!job || !consent || !selected.length || busy) return;
    setBusy(true); setError('');
    try {
      const files = await Promise.all(selected.map(async (url, index) => {
        const response = await fetch(url);
        if (!response.ok) throw new Error('A photo could not be loaded. Refresh the page and choose it again.');
        const blob = await response.blob();
        return new File([blob], `project-${index + 1}.jpg`, { type: blob.type });
      }));
      await onUpload({ files, title: title.trim(), category: job.category || 'General', description });
      setJob(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not publish this project.');
    } finally { setBusy(false); }
  }

  return <section className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
    <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
      <div><h2 className="text-lg font-semibold">Add completed work</h2>
        <p className="text-sm text-gray-600 mt-1">Choose photos to publish on your web and mobile public profile.</p></div>
      <Link href={`/contractors/${contractorId}`} className="text-teal-700 underline font-medium">View public profile</Link>
    </div>
    {jobs.length === 0 ? <p className="text-sm text-gray-600">Completed jobs will appear here when you have finished work.</p> :
      <ul className="divide-y divide-gray-100">{jobs.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div><p className="font-medium">{item.title}</p><p className="text-sm text-gray-600">{item.photos?.length || 0} photos available</p></div>
        <Button variant="secondary" disabled={!item.photos?.length} onClick={() => {
          setJob(item); setSelected([]); setTitle(''); setDescription(''); setConsent(false); setError('');
        }}>Add to portfolio</Button>
      </li>)}</ul>}
    <p className="text-sm text-gray-500 mt-3">Only selected photos and the public text you enter will be published. For jobs without photos, use Add project below.</p>
    <Dialog open={!!job} onOpenChange={open => { if (!open && !busy) setJob(null); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Publish completed work</DialogTitle>
          <DialogDescription>Select up to 10 photos. Leave out faces, addresses and private belongings unless you have permission to share them.</DialogDescription></DialogHeader>
        <form onSubmit={publish} className="space-y-5">
          <fieldset disabled={busy}><legend className="font-medium mb-3">Photos ({selected.length} selected)</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{job?.photos?.map(({ url }, index) => <label key={url} className="rounded-lg border p-2 cursor-pointer">
              <img src={url} alt={`Completed work photo ${index + 1}`} className="w-full h-28 object-cover rounded" />
              <span className="flex items-center gap-2 mt-2 text-sm"><input type="checkbox" checked={selected.includes(url)}
                disabled={!selected.includes(url) && selected.length >= 10}
                onChange={event => setSelected(previous => event.target.checked ? [...previous, url] : previous.filter(value => value !== url))} />Photo {index + 1}</span>
            </label>)}</div>
          </fieldset>
          <label className="block text-sm font-medium">Public project title
            <input required maxLength={100} value={title} disabled={busy} onChange={event => setTitle(event.target.value)} className="block w-full border rounded-lg p-3 mt-2" placeholder="e.g. Kitchen renovation" /></label>
          <label className="block text-sm font-medium">Description (optional)
            <textarea maxLength={2000} value={description} disabled={busy} onChange={event => setDescription(event.target.value)} className="block w-full border rounded-lg p-3 mt-2" rows={3} /></label>
          <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={consent} disabled={busy} onChange={event => setConsent(event.target.checked)} className="mt-1" />I have permission to publish these photos and understand they will be visible on my public profile.</label>
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <div className="flex justify-end gap-3"><Button type="button" variant="secondary" disabled={busy} onClick={() => setJob(null)}>Cancel</Button>
            <Button type="submit" disabled={busy || !consent || !selected.length || !title.trim()}>{busy ? 'Publishing...' : 'Publish project'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </section>;
}
