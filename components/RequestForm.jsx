'use client';

import { useState } from 'react';
import { REASONS, REASON_LABELS } from '@/lib/constants';
import ErrorBanner from '@/components/ErrorBanner';

const FIELDS = ['customer_name', 'customer_email', 'customer_phone', 'order_number', 'item_sku', 'item_name', 'quantity', 'reason'];
const BLANK = {
  customer_name: '',
  customer_email: '',
  customer_phone: '',
  order_number: '',
  item_sku: '',
  item_name: '',
  quantity: 1,
  reason: REASONS[0],
};

const inputClass = (hasError) =>
  `w-full rounded-md border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 ${
    hasError ? 'border-red-400' : 'border-slate-300'
  }`;

function Field({ label, error, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}

// Used for both creating and editing. `onSubmit` must throw on failure.
export default function RequestForm({ initial, submitLabel, onSubmit, onCancel }) {
  const [values, setValues] = useState(() => ({
    ...BLANK,
    ...Object.fromEntries(FIELDS.filter((k) => initial?.[k] != null).map((k) => [k, initial[k]])),
  }));
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const details = Array.isArray(error?.details) ? error.details : [];
  const fieldErrors = Object.fromEntries(details.filter((d) => d.field).map((d) => [d.field, d.message]));

  const set = (key) => (e) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const text = (key) => ({ value: values[key], onChange: set(key), className: inputClass(!!fieldErrors[key]) });

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        ...Object.fromEntries(FIELDS.map((k) => [k, values[k]])),
        customer_phone: values.customer_phone.trim() || null,
        quantity: Number(values.quantity),
      });
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    // noValidate: the server is the authority, so its messages are what the user sees.
    <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 sm:p-6">
      <ErrorBanner error={error} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Customer name" error={fieldErrors.customer_name}>
          <input {...text('customer_name')} autoComplete="name" />
        </Field>
        <Field label="Customer email" error={fieldErrors.customer_email}>
          <input {...text('customer_email')} type="email" autoComplete="email" />
        </Field>
        <Field label="Customer phone (optional)" error={fieldErrors.customer_phone}>
          <input {...text('customer_phone')} type="tel" autoComplete="tel" />
        </Field>
        <Field label="Order number" error={fieldErrors.order_number}>
          <input {...text('order_number')} placeholder="ORD-1001" />
        </Field>
        <Field label="Item SKU" error={fieldErrors.item_sku}>
          <input {...text('item_sku')} placeholder="TSH-BLK-M" />
        </Field>
        <Field label="Item name" error={fieldErrors.item_name}>
          <input {...text('item_name')} />
        </Field>
        <Field label="Units being returned" error={fieldErrors.quantity}>
          <input {...text('quantity')} type="number" min="1" inputMode="numeric" />
        </Field>
        <Field label="Reason" error={fieldErrors.reason}>
          <select {...text('reason')}>
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {REASON_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
          Cancel
        </button>
      </div>
    </form>
  );
}
