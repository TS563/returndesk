const btn =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';

export default function Pagination({ page, totalPages, total, onChange, disabled }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span>
        Page {page} of {totalPages} · {total} {total === 1 ? 'request' : 'requests'}
      </span>
      <div className="flex gap-2">
        <button className={btn} disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}>
          Previous
        </button>
        <button className={btn} disabled={disabled || page >= totalPages} onClick={() => onChange(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
