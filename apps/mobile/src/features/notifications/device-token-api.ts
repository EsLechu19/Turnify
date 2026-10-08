import { getSupabase } from '@/lib/supabase';
import type { GuestTicketAccess } from '@/features/queue/public-guest-ticket-api';

export type DevicePlatform = 'android' | 'ios';

const MAX_DEVICE_TOKEN_LENGTH = 4096;

function normalizeToken(token: string): string {
  const normalized = token.trim();
  if (!normalized || normalized.length > MAX_DEVICE_TOKEN_LENGTH) {
    throw new Error('Invalid device token.');
  }
  return normalized;
}

/**
 * Registers the authenticated customer's current device through a scoped RPC.
 * The token is deliberately never returned, logged, or stored in app config.
 */
export async function registerDeviceToken(token: string, platform: DevicePlatform): Promise<void> {
  const { error } = await getSupabase().rpc('registrar_dispositivo', {
    p_push_token: normalizeToken(token),
    p_plataforma: platform,
  });

  if (error) {
    throw new Error('Unable to register this device for notifications.');
  }
}

/**
 * Revokes only the authenticated customer's matching device token. It is safe
 * to call repeatedly because the server does not disclose other owners.
 */
export async function revokeDeviceToken(token: string): Promise<void> {
  const { error } = await getSupabase().rpc('revocar_dispositivo', {
    p_push_token: normalizeToken(token),
  });

  if (error) {
    throw new Error('Unable to revoke this device from notifications.');
  }
}

/**
 * Registers the device for a public guest ticket.
 */
export async function registerGuestDeviceToken(access: GuestTicketAccess, token: string, platform: DevicePlatform): Promise<void> {
  const { error } = await getSupabase().rpc('registrar_dispositivo_invitado', {
    p_ticket_id: access.ticketId,
    p_capacidad: access.capability,
    p_push_token: normalizeToken(token),
    p_plataforma: platform,
  });

  if (error) {
    throw new Error('Unable to register this device for the guest ticket notifications.');
  }
}

/**
 * Removes the provided token from the guest ticket.
 */
export async function revokeGuestDeviceToken(access: GuestTicketAccess, token: string): Promise<void> {
  const { error } = await getSupabase().rpc('revocar_dispositivo_invitado', {
    p_ticket_id: access.ticketId,
    p_capacidad: access.capability,
    p_push_token: normalizeToken(token),
  });

  if (error) {
    throw new Error('Unable to revoke notification access for the guest ticket.');
  }
}
