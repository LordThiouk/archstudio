import { createFolder, createProject, isEmpty, listFolders } from './store';
import demo from './seed/demo.json';
import dropcolis from './seed/dropcolis.json';
import type { Architecture } from './types';

/**
 * A brand-new install with an empty grid teaches nothing. First run drops two
 * real architectures in an "Examples" folder so the editor has something to
 * open — delete the folder and they are gone for good.
 */
export function ensureSeed(): void {
  if (!isEmpty() || listFolders().length) return;

  const examples = createFolder('Examples', null, '#0E9F6E');

  createProject({
    name: 'Acme — two platforms',
    folderId: examples.id,
    description: 'The reference example: a consumer platform and a business platform on separate stacks.',
    accent: '#28519F',
    data: demo as unknown as Architecture
  });

  createProject({
    name: 'Dropcolis',
    folderId: examples.id,
    description: 'A real 29-component delivery ecosystem, in French. Urban B2C vs long-distance B2C + B2B.',
    accent: '#D97706',
    data: dropcolis as unknown as Architecture
  });
}
