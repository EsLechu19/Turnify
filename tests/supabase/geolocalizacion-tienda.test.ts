import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0043_geolocalizacion_tienda.sql'),
  'utf8',
);

describe('shop geolocation migration contract', () => {
  it('adds nullable numeric shop coordinates to empresas', () => {
    expect(migration).toContain('latitud');
    expect(migration).toContain('longitud');
    expect(migration).toMatch(/latitud\s+numeric/i);
    expect(migration).toMatch(/longitud\s+numeric/i);
  });

  it('constrains coordinates to valid earth ranges', () => {
    expect(migration).toMatch(/latitud[^;]*-90[^;]*90/s);
    expect(migration).toMatch(/longitud[^;]*-180[^;]*180/s);
  });

  it('serves the coordinates to guests only through catalogo_comercial', () => {
    expect(migration).toContain('create or replace function public.catalogo_comercial');
    expect(migration).toMatch(/'latitud'[^;]*e\.latitud/s);
    expect(migration).toMatch(/'longitud'[^;]*e\.longitud/s);
    expect(migration).toContain('grant execute on function public.catalogo_comercial(text) to anon, authenticated;');
  });

  it('stays RLS-safe with admin-only write and no direct guest read', () => {
    expect(migration).not.toContain('create policy');
    expect(migration).not.toMatch(/grant\s+select\s+on[^\n;]*empresas/i);
  });

  it('is forward-only and keeps the free stack free of Google', () => {
    expect(migration).not.toMatch(/drop\s+(column|table)/i);
    expect(migration.toLowerCase()).not.toContain('google');
  });
});
