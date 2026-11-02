import { STATUS_LABELS } from '@/lib/constants';

// Colour + dot + text label, so status never relies on colour alone.
const STYLES = {
  OPEN: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  IN_REVIEW: 'bg-amber-50 text-amber-800 ring-amber-600/30',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED: 'bg-red-50 text-red-700 ring-red-600/20',
  COMPLETED: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

export default function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
