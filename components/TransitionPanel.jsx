'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { ACTION_LABELS, RESOLUTIONS, RESOLUTION_LABELS, STATUS_LABELS } from '@/lib/constants';
import ErrorBanner from '@/components/ErrorBanner';

const inputClass = 'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm';

// Offers ONLY the transitions the server says are legal (request.actions.transitions).
// The server still re-checks every one of them.
export default function TransitionPanel({ request, onChanged }) {
  const [approving, setApproving] = useState(false);
  const [resolution, setResolution] = useState('REFUND');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const options = request.actions.transitions;

  if (options.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        This request is {STATUS_LABELS[request.status]}. It is final, so no further status changes are possible.
      </p>
    );
  }

  async function move(body) {
    setBusy(true);
    setError(null);
    try {
      await api(`/requests/${request.id}/transition`, { method: 'POST', body });
      setApproving(false);
      await onChanged();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  function onAction(status) {
    if (status === 'APPROVED') return setApproving((v) => !v);
    if (status === 'REJECTED' && !window.confirm('Reject this request? Rejected is a final status.')) return;
    move({ status });
  }

  function submitApproval(e) {
    e.preventDefault();
    move({
      status: 'APPROVED',
      resolution,
      ...(resolution === 'REFUND' ? { refund_amount: amount === '' ? null : Number(amount) } : {}),
    });
  }

  return (
    <div className="space-y-3">
      <ErrorBanner error={error} />
      <div className="flex flex-wrap gap-2">
        {options.map((status) => (
          <button
            key={status}
            disabled={busy}
            onClick={() => onAction(status)}
            className={`rounded-md px-3 py-2 text-sm font-medium disabled:opacity-60 ${
              status === 'REJECTED'
                ? 'border border-red-300 bg-white text-red-700 hover:bg-red-50'
                : 'bg-slate-900 text-white hover:bg-slate-700'
            }`}
          >
            {ACTION_LABELS[status]}
          </button>
        ))}
      </div>

      {approving && (
        <form onSubmit={submitApproval} className="flex flex-wrap items-end gap-3 rounded-md border border-slate-200 bg-slate-50 p-3">
          <label className="text-sm">
            <span className="mb-1 block font-medium">Resolution</span>
            <select value={resolution} onChange={(e) => setResolution(e.target.value)} className={inputClass}>
              {RESOLUTIONS.map((r) => (
                <option key={r} value={r}>
                  {RESOLUTION_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          {resolution === 'REFUND' && (
            <label className="text-sm">
              <span className="mb-1 block font-medium">Refund amount (₹)</span>
              <input
                type="number"
                step="0.01"
                min="0"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputClass} w-36`}
              />
            </label>
          )}
          <button type="submit" disabled={busy} className="rounded-md bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
            {busy ? 'Approving…' : 'Confirm approval'}
          </button>
        </form>
      )}
    </div>
  );
}
