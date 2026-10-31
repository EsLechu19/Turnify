import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');

describe('public customer route contract', () => {
  it('keeps the QR route outside auth and the admin shell', () => {
    const routes = read('apps', 'web', 'src', 'app', 'routes.tsx');
    expect(routes).toMatch(/<Route element={<CustomerPublicPage \/>} path="\/t\/:businessCode" \/>/);
    expect(routes.indexOf('path="/t/:businessCode"')).toBeLessThan(routes.indexOf('<Route element={<RequireAuth'));
    expect(routes).toContain('<Route element={<RequireAdmin />}>');
  });
});

describe('public customer API contract', () => {
  it('validates business codes and guest details', () => {
    const api = read('apps', 'web', 'src', 'features', 'public', 'customer-public-api.ts');
    expect(api).toContain("/^[a-zA-Z0-9_-]{2,64}$/");
    expect(api).toContain('GUEST_PHONE_CONSENT_ERROR');
    expect(api).toContain('normalizeInternationalPhone');
    expect(api).toContain('p_nombre: details.name');
    expect(api).toContain('p_telefono: details.whatsappConsent ? details.phone : null');
    expect(api).toContain('p_consentimiento_whatsapp: details.whatsappConsent === true');
  });

  it('uses the anonymous catalog and guest ticket RPCs', () => {
    const api = read('apps', 'web', 'src', 'features', 'public', 'customer-public-api.ts');
    expect(api).toContain("rpc('catalogo_comercial'");
    expect(api).toContain("rpc('crear_ticket_invitado'");
    expect(api).toContain("rpc('estado_ticket_invitado'");
    expect(api).toContain("rpc('cancelar_ticket_invitado'");
    expect(api).toContain("rpc('responder_llamado_invitado'");
    expect(api).toContain("rpc('puntuar_atencion_invitado'");
    expect(api).toContain("response: 'presente' | 'llega_en_2_min'");
    expect(api).toContain('rating < 1 || rating > 5');
  });

  it('stores only narrowly scoped ticket access and clears terminal sessions', () => {
    const page = read('apps', 'web', 'src', 'features', 'public', 'CustomerPublicPage.tsx');
    expect(page).toContain("turnify.public-ticket-session.v1:");
    expect(page).toContain('sessionStorage');
    expect(page).toContain("TERMINAL_STATUSES.has(next.status)");
    expect(page).toContain("ticket.status === 'en_espera' || ticket.status === 'notificado'");
    expect(page).toContain("onRespond('presente')");
    expect(page).toContain("onRespond('llega_en_2_min')");
    expect(page).toContain('Puntuación enviada');
  });

  it('builds QR links from the deployed web origin', () => {
    const live = read('apps', 'web', 'src', 'data', 'live.ts');
    expect(live).toContain('window.location.origin');
    expect(live).not.toContain('turnify.app/t/');
  });
});
