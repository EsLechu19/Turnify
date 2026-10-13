import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('admin account section', () => {
  it('exposes Mi cuenta in navigation and routes without touching operations', () => {
    const sidebar = read('apps', 'web', 'src', 'layouts', 'Sidebar.tsx');
    const routes = read('apps', 'web', 'src', 'app', 'routes.tsx');
    const page = read('apps', 'web', 'src', 'features', 'account', 'AccountPage.tsx');

    expect(sidebar).toContain("to: '/cuenta'");
    expect(routes).toContain('AccountPage');
    expect(routes).toContain('path="cuenta"');
    expect(page).toContain('uploadMyAccountPhoto');
    expect(page).toContain('changeMyPassword');
    expect(page).not.toContain('abierta');
    expect(page).not.toContain('crear_empresa');
  });

  it('stores the admin photo in the shared bucket under a self-owned slot', () => {
    const sql = read('supabase', 'migrations', '0047_cuenta_admin_foto.sql');

    expect(sql).toContain('avatares_admin_owner_write');
    expect(sql).toContain('avatares_admin_owner_update');
    expect(sql).toContain("p.rol = 'admin'");
    expect(sql).not.toContain('personal');
  });

  it('records the admin photo through a worker-mirrored RPC, never a direct write', () => {
    const sql = read('supabase', 'migrations', '0048_cuenta_admin_foto_rpc.sql');
    const live = read('apps', 'web', 'src', 'data', 'live.ts');

    expect(sql).toContain('create or replace function public.actualizar_mi_foto_admin(p_foto_url text)');
    expect(sql).toContain("p.rol = 'admin'");
    expect(sql).toContain('grant execute on function public.actualizar_mi_foto_admin(text) to authenticated;');
    expect(live).toContain("rpc('actualizar_mi_foto_admin'");
    expect(live).not.toContain(".from('perfiles').update({ foto_url:");
  });
});
