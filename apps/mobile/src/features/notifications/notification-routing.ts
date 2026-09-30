type TicketNotificationTarget = {
  ticketId: string;
  queueId: string;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Accept only the small routing contract emitted by the trusted delivery
 * service. Notification titles and bodies are never used as navigation input.
 */
export function ticketTargetFromNotificationData(data: unknown): TicketNotificationTarget | null {
  if (!data || typeof data !== 'object') return null;

  const payload = data as Record<string, unknown>;
  if (
    payload.type !== 'turnify.ticket-called' ||
    typeof payload.ticketId !== 'string' ||
    typeof payload.queueId !== 'string' ||
    !UUID_PATTERN.test(payload.ticketId) ||
    !UUID_PATTERN.test(payload.queueId)
  ) {
    return null;
  }

  return { ticketId: payload.ticketId, queueId: payload.queueId };
}
