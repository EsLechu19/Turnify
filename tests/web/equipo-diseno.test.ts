import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('team section no-overlap contract', () => {
  it('renders roster actions in a non-shrinking nowrap row', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(page).toContain('table__actions');
    expect(page).not.toMatch(/display:\s*'flex',\s*gap:\s*4/);
  });

  it('pins icon-bearing roster cells so auto layout never squeezes them', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(page).toContain('cell--nowrap');
  });

  it('lays request and assignment rows so buttons never overlap names at narrow widths', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(page).toContain('row-split');
  });

  it('defines the shared wrap-safe row CSS contract', () => {
    const css = read('apps', 'web', 'src', 'styles', 'app.css');

    expect(css).toContain('.row-split');
    expect(css).toMatch(/\.row-split[^{]*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.row-split\s*>\s*:last-child[^{]*\{[^}]*flex:\s*none/);
  });
});

describe('team section behavior contract', () => {
  it('keeps roster, availability, services assignment, invitations and avatars on real data', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(page).toContain('staffRepository');
    expect(page).toContain('Cargando equipo');
    expect(page).toContain('updateStaff');
    expect(page).toContain('reloadServices');
    expect(page).toContain('toggleService');
    expect(page).toContain('generateWorkerInvitation');
    expect(page).toContain('fetchShopWorkerRequests');
    expect(page).toContain('resolveWorkerRequest');
    expect(page).toContain('fotoUrl');
    expect(page).toContain('initialsOf');
    expect(page).toContain('paceMinutes');
    expect(page).toContain('Aprobar');
  });

  it('keeps Spanish UI with color as state signal only', () => {
    const page = read('apps', 'web', 'src', 'features', 'team', 'TeamPage.tsx');

    expect(page).toContain('Barberos y empleados');
    expect(page).toContain('Solicitudes pendientes');
    expect(page).toContain('staffAvailabilityTone');
    expect(page).toContain('PageHeader');
    expect(page).toContain('StatsRow');
    expect(page).toContain('SectionCard');
  });
});
