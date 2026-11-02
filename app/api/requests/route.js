import { NextResponse } from 'next/server';
import { route, readJson } from '@/lib/errors';
import { parse, listQuerySchema, createRequestSchema } from '@/lib/validation';
import { listRequests, createRequest } from '@/lib/repository';



// GET /api/requests?q=&status=&reason=&sort=&order=&page=&pageSize=
export const GET = route(async (req) => {
  const params = Object.fromEntries([...new URL(req.url).searchParams].filter(([, v]) => v !== ''));
  const filters = parse(listQuerySchema, params);
  return NextResponse.json(await listRequests(filters));
});

// POST /api/requests
export const POST = route(async (req) => {
  const data = parse(createRequestSchema, await readJson(req));
  const created = await createRequest(data);
  return NextResponse.json({ data: created }, { status: 201, headers: { Location: `/api/requests/${created.id}` } });
});
