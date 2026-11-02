import { route, ApiError } from '@/lib/errors';

// Unknown API paths get a JSON 404 instead of Next.js's HTML page.
const handler = route(async (req) => {
  throw new ApiError(404, 'ROUTE_NOT_FOUND', `No API route for ${req.method} ${new URL(req.url).pathname}`);
});

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
