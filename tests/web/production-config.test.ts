import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('web production configuration safety', () => {
  it('validates the Supabase URL and marks every invalid runtime configuration unavailable', () => {
    const supabase = read('apps', 'web', 'src', 'data', 'supabase.ts');

    expect(supabase).toContain('const url = new URL(value);');
    expect(supabase).toContain("url.protocol === 'https:' || url.protocol === 'http:'");
    expect(supabase).toContain('export function isSupabaseConfigurationUnavailable(): boolean');
    expect(supabase).not.toContain('isDemoMode');
  });

  it('does not deliver fixtures or mock authentication from runtime repositories', () => {
    const repositories = read('apps', 'web', 'src', 'data', 'repositories.ts');

    expect(repositories).not.toContain("'./mocks/");
    expect(repositories).not.toContain('mockSignIn');
    expect(repositories).not.toContain('mockRestore');
    expect(repositories).not.toContain('isDemoMode');
  });

  it('blocks the application before operational providers can render in every runtime mode', () => {
    const app = read('apps', 'web', 'src', 'App.tsx');

    expect(app).toContain('isSupabaseConfigurationUnavailable()');
    expect(app).toContain('<ConfigurationUnavailable />');
    expect(app.indexOf('<ConfigurationUnavailable />')).toBeLessThan(app.indexOf('<AppProviders>'));
  });
});
