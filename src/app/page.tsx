import { listFolders, listProjects } from '@/lib/store';
import { ensureSeed } from '@/lib/seed';
import Workspace from '@/components/Workspace';

export const dynamic = 'force-dynamic';

export default function Home() {
  ensureSeed();
  return <Workspace initialFolders={listFolders()} initialProjects={listProjects()} />;
}
