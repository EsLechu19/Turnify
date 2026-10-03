import type { RealtimeChannel } from '@supabase/supabase-js';

let channelInstanceNonce = 0;

export function createGuestTicketHomeChannelName(ticketId: string): string {
  const safeTicketId = ticketId.replace(/[^A-Za-z0-9_-]/g, '_');
  channelInstanceNonce += 1;
  return `guest-ticket-home:${safeTicketId}:${channelInstanceNonce.toString(36)}`;
}

export function subscribeToGuestTicketHomeChanges(
  channel: RealtimeChannel,
  ticketId: string,
  refresh: () => void,
): RealtimeChannel {
  return channel
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'tickets',
      filter: `id=eq.${ticketId}`,
    }, refresh)
    .subscribe(() => {
      void refresh();
    });
}
