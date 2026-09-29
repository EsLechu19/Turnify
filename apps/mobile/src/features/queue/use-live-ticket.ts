import { useFocusEffect } from 'expo-router';
import { AppState } from 'react-native';
import { useCallback, useState } from 'react';

import { getMyTicketState, translateQueueError, type TicketState } from '@/features/queue/queue-api';
import { getSupabase } from '@/lib/supabase';

export function useLiveTicket(ticketId: string | undefined, queueId: string | undefined) {
  const [ticket, setTicket] = useState<TicketState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!ticketId) {
      setError('No encontramos este turno.');
      setIsLoading(false);
      return false;
    }

    try {
      const nextTicket = await getMyTicketState(ticketId);
      setTicket(nextTicket);
      setError(null);
      return true;
    } catch (reason) {
      setError(translateQueueError(reason instanceof Error ? reason.message : ''));
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let channel: ReturnType<ReturnType<typeof getSupabase>['channel']> | undefined;

      async function start() {
        const isOwnedTicket = await refresh();
        if (!isActive || !isOwnedTicket || !ticketId || !queueId) return;

        const supabase = getSupabase();
        channel = supabase
          .channel(`ticket:${ticketId}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'filas', filter: `id=eq.${queueId}` }, () => {
            void refresh();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` }, () => {
            void refresh();
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') void refresh();
          });
      }

      const appStateSubscription = AppState.addEventListener('change', (nextState) => {
        if (nextState === 'active') void refresh();
      });
      void start();

      return () => {
        isActive = false;
        appStateSubscription.remove();
        if (channel) void getSupabase().removeChannel(channel);
      };
    }, [queueId, refresh, ticketId]),
  );

  return { ticket, error, isLoading, refresh };
}
