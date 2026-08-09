'use client';

import { useState } from 'react';
import { Flag, X } from 'lucide-react';
import toast from 'react-hot-toast';

const REASONS: { value: string; label: string }[] = [
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'underage', label: 'Underage' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export default function ReportModal({ profileId, isAuthed }: { profileId: string; isAuthed: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('inappropriate_content');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function openModal(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthed) {
      toast.error('Log in to report a profile');
      return;
    }
    setOpen(true);
  }

  async function submit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setSubmitting(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile_id: profileId, reason, description }),
      });
      if (!res.ok) throw new Error();
      toast.success('Report submitted');
      setOpen(false);
      setDescription('');
    } catch {
      toast.error('Could not submit report');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:bg-white/10 hover:text-red-400"
      >
        <Flag className="h-3.5 w-3.5" /> Report
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(false);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass w-full max-w-sm rounded-xl2 p-5 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">Report profile</h3>
              <button onClick={() => setOpen(false)}>
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>

            <label className="mb-1 block text-xs text-zinc-400">Reason</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mb-3 w-full rounded-lg border border-white/10 bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent-purple"
            >
              {REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            <label className="mb-1 block text-xs text-zinc-400">Details (optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={3}
              className="mb-4 w-full resize-none rounded-lg border border-white/10 bg-bg-elevated px-3 py-2 text-sm outline-none focus:border-accent-purple"
              placeholder="Add any extra context…"
            />

            <button
              onClick={submit}
              disabled={submitting}
              className="w-full rounded-lg bg-grad-primary py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
