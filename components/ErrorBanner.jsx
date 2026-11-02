// Shows the server's own explanation, plus per-field problems when present.
export default function ErrorBanner({ error, onRetry }) {
  if (!error) return null;
  const details = Array.isArray(error.details) ? error.details : [];
  return (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
      <p className="font-medium">{error.message}</p>
      {details.length > 0 && (
        <ul className="mt-1 list-disc pl-5">
          {details.map((d, i) => (
            <li key={i}>
              {d.field ? `${d.field}: ` : ''}
              {d.message}
            </li>
          ))}
        </ul>
      )}
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded border border-red-300 bg-white px-2 py-1 text-xs font-medium hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}
