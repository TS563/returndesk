import { NextResponse } from 'next/server';

// Every refusal has the same body shape:
//   { "error": { "code": "MACHINE_CODE", "message": "Human text", "details": ... } }
export class ApiError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const notFound = () => new ApiError(404, 'NOT_FOUND', 'Return request not found.');

export function errorResponse(err) {
  if (err instanceof ApiError) {
    const error = { code: err.code, message: err.message };
    if (err.details !== undefined) error.details = err.details;
    return NextResponse.json({ error }, { status: err.status });
  }
  console.error('Unhandled error:', err);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on the server. Please try again.' } },
    { status: 500 },
  );
}

// Wraps a route handler so anything thrown becomes a consistent JSON error.
export function route(handler) {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      return errorResponse(err);
    }
  };
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    throw new ApiError(400, 'INVALID_JSON', 'Request body must be valid JSON.');
  }
}
