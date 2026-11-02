// Thin fetch wrapper used by every page. Server refusals become ApiClientError
// carrying the server's own message, so the UI can show *why* something failed.
export class ApiClientError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
      cache: 'no-store',
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiClientError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.');
  }

  if (res.status === 204) return null;

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON body: fall through to generic error below */
  }

  if (!res.ok) {
    const e = payload?.error;
    throw new ApiClientError(res.status, e?.code ?? 'UNKNOWN_ERROR', e?.message ?? `Request failed (${res.status}).`, e?.details);
  }
  return payload;
}
