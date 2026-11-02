'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { formatDate } from '@/lib/format';
import ErrorBanner from '@/components/ErrorBanner';

// Notes can be added in any status. There is no edit/delete UI because the API has none.
export default function NotesSection({ requestId, notes, onAdded }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api(`/requests/${requestId}/notes`, { method: 'POST', body: { body } });
      setBody('');
      await onAdded();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-base font-semibold">Notes ({notes.length})</h2>

      {notes.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No notes yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {notes.map((n) => (
            <li key={n.id} className="rounded-md bg-slate-50 p-3 text-sm">
              <p className="whitespace-pre-wrap break-words">{n.body}</p>
              <p className="mt-1 text-xs text-slate-500">
                {n.author} · {formatDate(n.created_at)}
              </p>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={submit} className="mt-4 space-y-2">
        <ErrorBanner error={error} />
        <label className="block text-sm font-medium" htmlFor="note-body">
          Add a note
        </label>
        <textarea
          id="note-body"
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={busy || !body.trim()}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? 'Adding…' : 'Add note'}
        </button>
      </form>
    </section>
  );
}
