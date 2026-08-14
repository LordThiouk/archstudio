import { notFound } from 'next/navigation';
import { getProject } from '@/lib/store';
import PaperDocument from './PaperDocument';

export const dynamic = 'force-dynamic';

export default async function DocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = getProject(id);
  if (!project) notFound();
  return <PaperDocument project={project} />;
}
