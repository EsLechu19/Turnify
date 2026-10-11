import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('services catalog no-overlap contract', () => {
  it('renders catalog actions in a non-shrinking nowrap row', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');

    expect(page).toContain('table__actions');
    expect(page).not.toMatch(/display:\s*'flex',\s*gap:\s*4/);
  });

  it('pins icon-bearing catalog cells so auto layout never squeezes them', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');

    expect(page).toContain('cell--nowrap');
  });

  it('truncates the service name cell so long text yields instead of squeezing icons', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');

    expect(page).toContain('cell--truncate');
  });

  it('defines the shared no-overlap CSS contract', () => {
    const css = read('apps', 'web', 'src', 'styles', 'app.css');

    expect(css).toContain('.table__actions');
    expect(css).toMatch(/\.table__actions[^{]*\{[^}]*flex-wrap:\s*nowrap/);
    expect(css).toMatch(/\.table__actions\s*>\s*\*[^{]*\{[^}]*flex:\s*none/);
    expect(css).toContain('cell--nowrap');
    expect(css).toMatch(/\.badge\s*>\s*svg,\s*\.btn\s*>\s*svg[^{]*\{[^}]*flex:\s*none/);
    expect(css).toMatch(/\.table-wrap[^{]*\{[^}]*overflow-x:\s*auto/);
  });
});

describe('services catalog viewport containment contract', () => {
  it('keeps the catalog table inside a scroll container', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');

    expect(page).toContain('table-wrap');
    expect(page).toMatch(/table-wrap[\s\S]*<table/);
  });

  it('lets the scroll container absorb overflow instead of growing the page', () => {
    const css = read('apps', 'web', 'src', 'styles', 'app.css');

    expect(css).toMatch(/\.table-wrap[^{]*\{[^}]*overflow-x:\s*auto/);
    expect(css).toMatch(/\.table-wrap[^{]*\{[^}]*max-width:\s*100%/);
    expect(css).toMatch(/\.table-wrap[^{]*\{[^}]*min-width:\s*0/);
  });

  it('lets grid and flex ancestors shrink below intrinsic table width', () => {
    const css = read('apps', 'web', 'src', 'styles', 'app.css');

    expect(css).toMatch(/\.card[^{]*\{[^}]*min-width:\s*0/);
    expect(css).toMatch(/\.card[^{]*\{[^}]*max-width:\s*100%/);
    expect(css).toMatch(/(\.shell__body\s*>\s*\*|\.card\s*>\s*\*)[^{]*\{[^}]*min-width:\s*0/);
  });

  it('truncates long catalog content so it never forces page growth', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');
    const css = read('apps', 'web', 'src', 'styles', 'app.css');

    expect(page).toContain('cell--truncate');
    expect(css).toMatch(/\.cell--truncate[^{]*\{[^}]*overflow:\s*hidden/);
    expect(css).toMatch(/\.cell--truncate[^{]*\{[^}]*text-overflow:\s*ellipsis/);
  });
});

describe('services catalog behavior contract', () => {
  it('keeps real Supabase data with refresh, loading, error and empty states in Spanish', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');

    expect(page).toContain('createService');
    expect(page).toContain('updateService');
    expect(page).toContain('removeService');
    expect(page).toContain('fetchServicePerformance');
    expect(page).toContain('Ningún servicio coincide');
    expect(page).toContain('mueve las esperas');
    expect(page).toContain('role="alert"');
  });

  it('keeps color as state signal only for service status', () => {
    const page = read('apps', 'web', 'src', 'features', 'services', 'ServicesPage.tsx');

    expect(page).toContain("tone={service.active ? 'success' : 'neutral'}");
    expect(page).toContain('PageHeader');
    expect(page).toContain('StatsRow');
    expect(page).toContain('SectionCard');
  });
});
