import { NextResponse } from 'next/server';
import { route, readJson } from '@/lib/errors';
import { parse, updateRequestSchema } from '@/lib/validation';
import { getRequest, updateRequest, removeRequest } from '@/lib/repository';


export const GET = route(async (_req, { params }) => {
  const { id } = await params;
  return NextResponse.json({ data: await getRequest(id) });
});

// Edit customer/item details (only while Open or In Review).
export const PATCH = route(async (req, { params }) => {
  const { id } = await params;
  const data = parse(updateRequestSchema, await readJson(req));
  return NextResponse.json({ data: await updateRequest(id, data) });
});

// Soft delete (only while Open or Rejected).
export const DELETE = route(async (_req, { params }) => {
  const { id } = await params;
  await removeRequest(id);
  return new Response(null, { status: 204 });
});
