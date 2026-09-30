import { describe, expect, it } from 'vitest';

import { ticketTargetFromNotificationData } from '../../apps/mobile/src/features/notifications/notification-routing';

describe('ticketTargetFromNotificationData', () => {
  it('accepts the minimal trusted called-ticket routing payload', () => {
    expect(ticketTargetFromNotificationData({
      type: 'turnify.ticket-called',
      ticketId: 'd1c92d5b-9fe8-4de5-9a8f-9e1e5e8088c2',
      queueId: 'a7e63a38-0141-4c40-90d2-0a5ec8f34c1a',
    })).toEqual({
      ticketId: 'd1c92d5b-9fe8-4de5-9a8f-9e1e5e8088c2',
      queueId: 'a7e63a38-0141-4c40-90d2-0a5ec8f34c1a',
    });
  });

  it('rejects notification copy, unknown event types, and malformed identifiers', () => {
    expect(ticketTargetFromNotificationData({ title: 'Turnify', body: 'Tu turno fue llamado.' })).toBeNull();
    expect(ticketTargetFromNotificationData({ type: 'turnify.ticket-called', ticketId: 'not-a-uuid', queueId: 'also-not-a-uuid' })).toBeNull();
    expect(ticketTargetFromNotificationData({ type: 'turnify.ticket-cancelled', ticketId: 'd1c92d5b-9fe8-4de5-9a8f-9e1e5e8088c2', queueId: 'a7e63a38-0141-4c40-90d2-0a5ec8f34c1a' })).toBeNull();
  });
});
