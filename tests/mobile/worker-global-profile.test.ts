import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('Worker global profile', () => {
  it('uses the account navigation without losing shop flows', () => {
    const shops = source('../../apps/mobile/src/app/(app)/worker-shops.tsx');
    const accountNavigation = source('../../apps/mobile/src/features/worker/worker-account-navigation.ts');

    expect(shops).toContain('WorkerAccountContainer');
    expect(accountNavigation).toContain("label: 'Mi perfil'");
    expect(accountNavigation).toContain("href: '/(app)/worker-profile'");
    expect(shops).toContain('requestWorkerInvitation(code)');
    expect(shops).toContain('SOLICITUDES PENDIENTES');
    expect(shops).toContain("router.replace('/(app)/worker')");
    expect(shops).not.toContain('Mi perfil, editar foto, nombre y teléfono');
  });

  it('states the photo is shared across every barbershop', () => {
    const profile = source('../../apps/mobile/src/app/(app)/worker-profile.tsx');

    expect(profile).toContain('Cambiar foto');
    expect(profile).toContain('todas tus barberías');
  });

  it('reads and writes the avatar from the global profile, not the per-shop row', () => {
    const avatar = source('../../apps/mobile/src/features/worker/worker-avatar.ts');

    expect(avatar).toContain("from('perfiles')");
    expect(avatar).toContain('foto_url');
    expect(avatar).toContain('actualizar_mi_foto_barbero');
    expect(avatar).toContain('avatares-barberos');
    expect(avatar).not.toContain("from('barberos').select('foto_url')");
  });
});
