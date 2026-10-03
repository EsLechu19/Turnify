import { describe, expect, it } from 'vitest';

import {
  createGuestTicketHomeChannelName,
  subscribeToGuestTicketHomeChanges,
} from '../../apps/mobile/src/features/queue/public-ticket-home-realtime';

describe('public ticket home Realtime subscription', () => {
  it('registers changes before subscribing and gives remounts unique channel identities', () => {
    const events: string[] = [];
    const channelNames: string[] = [];
    const refresh = () => { events.push('refresh'); };
    const channel = {
      on: (_event: string, filter: { filter: string }, callback: () => void) => {
        events.push(`on:${filter.filter}`);
        callback();
        return channel;
      },
      subscribe: (callback: () => void) => {
        events.push('subscribe');
        callback();
        return channel;
      },
    };

    const mount = () => {
      const channelName = createGuestTicketHomeChannelName('ticket-id');
      channelNames.push(channelName);
      subscribeToGuestTicketHomeChanges(channel as never, 'ticket-id', refresh);
    };

    mount();
    mount();

    expect(channelNames).toEqual([
      expect.stringMatching(/^guest-ticket-home:ticket-id:/),
      expect.stringMatching(/^guest-ticket-home:ticket-id:/),
    ]);
    expect(channelNames[0]).not.toBe(channelNames[1]);
    expect(events).toEqual([
      'on:id=eq.ticket-id', 'refresh', 'subscribe', 'refresh',
      'on:id=eq.ticket-id', 'refresh', 'subscribe', 'refresh',
    ]);
  });
});
