import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const migration = readFileSync(
  join(root, 'supabase', 'migrations', '0037_registro_worker_intent.sql'),
  'utf8',
);

describe('worker intent at signup', () => {
  it('keeps the default cliente profile and honors the worker flag', () => {
    expect(migration).toContain('create or replace function public.handle_new_user()');
    expect(migration).toContain('worker_intent');
    expect(migration).toContain("'personal'");
  });
});
