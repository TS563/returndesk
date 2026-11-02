import { NextResponse } from 'next/server';
import { route, readJson } from '@/lib/errors';
import { parse, transitionSchema } from '@/lib/validation';
import { transitionRequest } from '@/lib/repository';


// POST { "status": "APPROVED", "resolution": "REFUND", "refund_amount": 499 }
export const POST = route(async (req, { params }) => {
  const { id } = await params;
  const input = parse(transitionSchema, await readJson(req));
  return NextResponse.json({ data: await transitionRequest(id, input) });
});
