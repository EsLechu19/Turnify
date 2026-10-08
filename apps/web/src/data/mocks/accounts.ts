/**
 * Demo credentials for the panel.
 *
 * There is no auth backend yet: `authRepository` matches against these records.
 * They exist so the login flow, the route guard and the logout button can be
 * exercised end to end. Replace the repository body with `supabase.auth.signIn`
 * and delete this file — nothing else in the panel reads it.
 */

import type { AuthUser } from '../types';

export interface MockAccount extends AuthUser {
  password: string;
}

/** Mirrors the owner recorded in `mocks/panel`. */
export const mockAccounts: MockAccount[] = [
  {
    email: 'esau01s@turnify.app',
    password: 'turnify',
    name: 'Esau Ramírez',
    role: 'admin',
  },
  {
    email: 'diego.ramirez@turnify.app',
    password: 'turnify',
    name: 'Diego Ramírez',
    role: 'barbero',
  },
];