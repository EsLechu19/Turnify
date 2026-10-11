import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-image-picker', () => ({}));
vi.mock('@/lib/supabase', () => ({}));
import { addAvatarCacheBust } from '../../apps/mobile/src/features/worker/worker-avatar';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Worker avatar cache invalidation', () => {
  it('adds a version to the first uploaded public URL', () => {
    expect(addAvatarCacheBust('https://cdn.example/avatar.jpg', 1700000000000)).toBe(
      'https://cdn.example/avatar.jpg?v=1700000000000',
    );
  });

  it('generates a different URL for a replacement upload', () => {
    const first = addAvatarCacheBust('https://cdn.example/avatar.jpg', 1700000000000);
    const replacement = addAvatarCacheBust('https://cdn.example/avatar.jpg', 1700000000001);

    expect(replacement).not.toBe(first);
    expect(replacement).toBe('https://cdn.example/avatar.jpg?v=1700000000001');
  });

  it('persists and returns the same cache-busted URL used by the profile', () => {
    const avatar = source('../../apps/mobile/src/features/worker/worker-avatar.ts');
    const profile = source('../../apps/mobile/src/app/(app)/worker-profile.tsx');

    expect(avatar).toContain('const publicUrl = addAvatarCacheBust(data.publicUrl, uploadedAt);');
    expect(avatar).toContain("p_foto_url: publicUrl");
    expect(avatar).toContain('return publicUrl;');
    expect(profile).toContain('setFotoUrl(await uploadWorkerAvatar(base64));');
  });

  it('keeps existing stored URLs unchanged when loading the profile', () => {
    const avatar = source('../../apps/mobile/src/features/worker/worker-avatar.ts');

    expect(avatar).toContain("select('foto_url')");
    expect(avatar).toContain('return (data as { foto_url: string | null }).foto_url;');
    expect(avatar).not.toContain('addAvatarCacheBust((data as { foto_url: string | null }).foto_url');
  });
});
