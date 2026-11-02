'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import { useDebounce } from '@/hooks/useDebounce';
import { STATUSES, REASONS, STATUS_LABELS, REASON_LABELS } from '@/lib/constants';
import { formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import ErrorBanner from '@/components/ErrorBanner';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;
const SORT_OPTIONS = [
  ['created_at:desc', 'Newest first'],
  ['created_at:asc', 'Oldest first'],
  ['updated_at:desc', 'Recently updated'],
  ['customer_name:asc', 'Customer A–Z'],
  ['customer_name:desc', 'Customer Z–A'],
  ['reference:asc', 'Reference'],
  ['status:asc', 'Status (lifecycle)'],
];
const control = 'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400';

export default function RequestsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [reason, setReason] = useState('');
  const [sortKey, setSortKey] = useState('created_at:desc');
  const [page, setPage] = useState(1);
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState({ loading: true, error: null, data: null });

  // The request is only sent once typing pauses, not on every keystroke.
  const q = useDebounce(search.trim(), 400);

  useEffect(() => {
    setPage(1);
  }, [q, status, reason, sortKey]);

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    const [sort, order] = sortKey.split(':');
    const params = new URLSearchParams({ page, pageSize: PAGE_SIZE, sort, order });
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    if (reason) params.set('reason', reason);

    api(`/requests?${params}`, { signal: controller.signal })
      .then((data) => setState({ loading: false, error: null, data }))
      .catch((error) => {
        if (error.name === 'AbortError') return;
        setState((s) => ({ ...s, loading: false, error }));
      });

    return () => controller.abort(); // a newer search cancels the older one
  }, [q, status, reason, sortKey, page, reloadCount]);

  const { loading, error, data } = state;
  const rows = data?.data ?? [];
  const meta = data?.meta;
  const filtersActive = Boolean(q || status || reason);

  function clearFilters() {
    setSearch('');
    setStatus('');
    setReason('');
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Return requests</h1>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search customer, order or reference"
          aria-label="Search requests"
          className={`${control} sm:col-span-2 lg:col-span-1`}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status" className={control}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Filter by reason" className={control}>
          <option value="">All reasons</option>
          {REASONS.map((r) => (
            <option key={r} value={r}>{REASON_LABELS[r]}</option>
          ))}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} aria-label="Sort requests" className={control}>
          {SORT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      <div className="mt-4" aria-busy={loading}>
        {error && <ErrorBanner error={error} onRetry={() => setReloadCount((n) => n + 1)} />}

        {loading && !data && <p role="status" className="py-10 text-center text-sm text-slate-500">Loading requests…</p>}

        {data && rows.length === 0 && !error && (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white py-12 text-center">
            <p className="font-medium">{filtersActive ? 'No requests match your search or filters.' : 'No return requests yet.'}</p>
            {filtersActive ? (
              <button onClick={clearFilters} className="mt-3 rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                Clear filters
              </button>
            ) : (
              <Link href="/requests/new" className="mt-3 inline-block rounded-md bg-slate-900 px-3 py-2 text-sm text-white">
                Raise the first request
              </Link>
            )}
          </div>
        )}

        {rows.length > 0 && (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            {/* Desktop / tablet: table */}
            <div className="hidden overflow-hidden rounded-lg border border-slate-200 bg-white md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Order · Item</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium">
                        <Link href={`/requests/${r.id}`} className="text-blue-700 hover:underline">{r.reference}</Link>
                      </td>
                      <td className="px-4 py-3">
                        {r.customer_name}
                        <div className="text-xs text-slate-500">{r.customer_email}</div>
                      </td>
                      <td className="px-4 py-3">
                        {r.order_number}
                        <div className="text-xs text-slate-500">{r.item_name} × {r.quantity}</div>
                      </td>
                      <td className="px-4 py-3">{REASON_LABELS[r.reason]}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: cards */}
            <ul className="space-y-3 md:hidden">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link href={`/requests/${r.id}`} className="block rounded-lg border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{r.reference}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-sm">{r.customer_name}</p>
                    <p className="text-xs text-slate-500">{r.order_number} · {r.item_name} × {r.quantity}</p>
                    <p className="mt-1 text-xs text-slate-500">{REASON_LABELS[r.reason]} · {formatDate(r.created_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>

            <Pagination page={meta.page} totalPages={meta.totalPages} total={meta.total} onChange={setPage} disabled={loading} />
          </div>
        )}
      </div>
    </div>
  );
}
