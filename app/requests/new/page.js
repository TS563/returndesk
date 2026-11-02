'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import RequestForm from '@/components/RequestForm';

export default function NewRequestPage() {
  const router = useRouter();

  async function create(values) {
    const res = await api('/requests', { method: 'POST', body: values });
    router.push(`/requests/${res.data.id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm text-blue-700 hover:underline">← Back to requests</Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold tracking-tight">Raise a return request</h1>
      <p className="mb-4 text-sm text-slate-600">The reference number is generated automatically.</p>
      <RequestForm submitLabel="Raise request" onSubmit={create} onCancel={() => router.push('/')} />
    </div>
  );
}
