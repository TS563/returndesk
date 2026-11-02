'use client';

import { Suspense ,useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { REASON_LABELS, RESOLUTION_LABELS } from '@/lib/constants';
import { formatDate, formatMoney } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import ErrorBanner from '@/components/ErrorBanner';
import RequestForm from '@/components/RequestForm';
import TransitionPanel from '@/components/TransitionPanel';
import NotesSection from '@/components/NotesSection';

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 break-words text-sm">{children || '—'}</dd>
    </div>
  );
}

function RequestDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api(`/requests/${id}`);
      setRequest(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function saveEdits(values) {
    await api(`/requests/${id}`, { method: 'PATCH', body: values });
    setEditing(false);
    await load();
  }

  async function remove() {
    if (!window.confirm('Remove this request from the desk? The record is kept in the database.')) return;
    setActionError(null);
    try {
      await api(`/requests/${id}`, { method: 'DELETE' });
      router.push('/');
    } catch (err) {
      setActionError(err);
    }
  }

  

  if (loading) return <p role="status" className="py-10 text-center text-sm text-slate-500">Loading request…</p>;

  if (!request) {
    return (
      <div className="space-y-3">
        <Link href="/" className="text-sm text-blue-700 hover:underline">← Back to requests</Link>
        {loadError?.status === 404 ? (
          <p className="rounded-md border border-slate-200 bg-white p-6 text-center">This request doesn’t exist or has been removed.</p>
        ) : (
          <ErrorBanner error={loadError} onRetry={() => { setLoading(true); load(); }} />
        )}
      </div>
    );
  }

  const { actions } = request;

  return (
    <div className="space-y-4">
      <Link href="/" className="text-sm text-blue-700 hover:underline">← Back to requests</Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{request.reference}</h1>
        <StatusBadge status={request.status} />
      </div>

      <ErrorBanner error={actionError} />
      {loadError && <ErrorBanner error={loadError} />}

      {editing ? (
        <RequestForm initial={request} submitLabel="Save changes" onSubmit={saveEdits} onCancel={() => setEditing(false)} />
      ) : (
        <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Detail label="Customer">{request.customer_name}</Detail>
            <Detail label="Email">{request.customer_email}</Detail>
            <Detail label="Phone">{request.customer_phone}</Detail>
            <Detail label="Order">{request.order_number}</Detail>
            <Detail label="Item">{`${request.item_name} (${request.item_sku})`}</Detail>
            <Detail label="Units">{request.quantity}</Detail>
            <Detail label="Reason">{REASON_LABELS[request.reason]}</Detail>
            <Detail label="Resolution">{request.resolution && RESOLUTION_LABELS[request.resolution]}</Detail>
            {request.refund_amount != null && <Detail label="Refund amount">{formatMoney(request.refund_amount)}</Detail>}
            <Detail label="Created">{formatDate(request.created_at)}</Detail>
            <Detail label="Last updated">{formatDate(request.updated_at)}</Detail>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {actions.can_edit ? (
              <button onClick={() => setEditing(true)} className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
                Edit details
              </button>
            ) : (
              <span className="self-center text-xs text-slate-500">Details are locked once a request is decided.</span>
            )}
            {actions.can_delete && (
              <button onClick={remove} className="rounded-md border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
                Remove from desk
              </button>
            )}
          </div>
        </section>
      )}

      <section className="rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
        <h2 className="mb-3 text-base font-semibold">Actions</h2>
        <TransitionPanel request={request} onChanged={load} />
      </section>

      <NotesSection requestId={request.id} notes={request.notes} onAdded={load} />
      
    </div>

    
  );
}

export default function RequestDetailPage() {
  return (
    <Suspense fallback={<p role="status" className="py-10 text-center text-sm text-slate-500">Loading request…</p>}>
      <RequestDetail />
    </Suspense>
  );
}
