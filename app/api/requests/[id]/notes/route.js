import { NextResponse } from 'next/server';
import { route, readJson } from '@/lib/errors';
import { parse, noteSchema } from '@/lib/validation';
import { addNote } from '@/lib/repository';


// Notes can only be created. There is deliberately no PATCH/DELETE.
export const POST = route(async (req, { params }) => {
  const { id } = await params;
  const input = parse(noteSchema, await readJson(req));
  return NextResponse.json({ data: await addNote(id, input) }, { status: 201 });
});
