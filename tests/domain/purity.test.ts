import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Guards the framework-free purity of the domain layer: every module under
// src/domain must stay importable without expo, react-native or @supabase,
// so ticket logic runs anywhere (unit tests, SQL trigger parity checks,
// future clients). Only real import/from statements count as violations, so
// a bare `export` keyword never false-positives on the `expo` substring.
const DOMAIN_DIR = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'domain',
);

// Matches only module-loading statements: static imports, dynamic imports,
// re-exports with a source, and require calls. A plain `export` declaration
// without a `from` clause never matches, even when the line mentions expo.
const LOAD_STATEMENT = /(^|[\s;])import[\s('"]|\bfrom\s*['"]|require\s*\(/;

// Banned framework/backend packages: expo and react-native match on package
// boundaries ( `_expo_` or `expose` stay clean), while @supabase is already
// distinctive through its scope prefix.
const BANNED_PACKAGE =
  /(?:^|[^a-zA-Z0-9_])(?:expo|react-native)(?:[^a-zA-Z0-9_]|$)|@supabase/;

// Reports whether one source line loads a banned package.
function isBannedImportLine(line: string): boolean {
  const code = line.split('//')[0] as string;
  return LOAD_STATEMENT.test(code) && BANNED_PACKAGE.test(code);
}

// Reads every src/domain/*.ts module (sorted for deterministic output).
function readDomainSources(): Array<{ file: string; text: string }> {
  return readdirSync(DOMAIN_DIR)
    .filter((entry) => entry.endsWith('.ts'))
    .sort()
    .map((file) => ({
      file,
      text: readFileSync(join(DOMAIN_DIR, file), 'utf8'),
    }));
}

describe('domain purity', () => {
  it('covers every expected domain module', () => {
    const files = readDomainSources().map((source) => source.file);
    expect(files).toEqual([
      'errors.ts',
      'eta.ts',
      'noShow.ts',
      'queue.ts',
      'transition.ts',
      'turn.ts',
    ]);
  });

  it('keeps every domain module free of expo, react-native and @supabase imports', () => {
    const violations = readDomainSources().flatMap(({ file, text }) =>
      text
        .split('\n')
        .map((line, index) => ({ line, number: index + 1 }))
        .filter(({ line }) => isBannedImportLine(line))
        .map(({ line, number }) => `${file}:${number}: ${line.trim()}`),
    );
    expect(violations).toEqual([]);
  });

  it('matches only import/from statements, never a bare export', () => {
    // Banned specifiers loaded through any statement shape are caught.
    expect(isBannedImportLine(`import 'expo';`)).toBe(true);
    expect(isBannedImportLine(`import { foo } from 'expo-constants';`)).toBe(
      true,
    );
    expect(isBannedImportLine(`import x from 'react-native';`)).toBe(true);
    expect(
      isBannedImportLine(`import { createClient } from '@supabase/supabase-js';`),
    ).toBe(true);
    expect(isBannedImportLine(`export { foo } from 'expo';`)).toBe(true);
    expect(isBannedImportLine(`const m = require('expo');`)).toBe(true);
    // The `export` keyword alone must not false-positive on `expo`,
    // and relative imports plus comments stay clean.
    expect(isBannedImportLine(`export const expoFactor = 1;`)).toBe(false);
    expect(isBannedImportLine(`export function expose(): void {}`)).toBe(
      false,
    );
    expect(
      isBannedImportLine(`import type { Ticket } from './turn';`),
    ).toBe(false);
    expect(isBannedImportLine(`// import 'expo' for later`)).toBe(false);
  });
});
