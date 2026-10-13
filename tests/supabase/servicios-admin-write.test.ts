import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0040_servicios_admin_write.sql'),
  'utf8',
);

describe('admin service writes', () => {
  it('lets the admin manage their own catalog and pivot', () => {
    expect(migration).toContain('create policy servicios_admin_write');
    expect(migration).toContain('create policy barbero_servicios_admin_write');
    expect(migration).toContain("mi_rol() = 'admin'");
  });
});
