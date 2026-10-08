import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { panelRepository } from '@/data/repositories';
import { computeStats } from '@/data/compute';
import { nextActionableTicket } from '@/data/selectors';
import type { ActivityEvent, QueueSummary, QueueTicket, TeamMember, TicketStatus } from '@/data/types';

/**
 * Live queue state for the panel.
 *
 * `App.tsx` used to own this in `useState` and pass it down as props; the
 * provider removes that drilling and gives the status transitions a single
 * place to live.
 */

/**
 * A barber plus the availability they had before entering service. `fuera` and
 * `descanso` are schedule states the queue never produces, so without this the
 * panel could not tell "just finished a cut" apart from "went off shift".
 */
interface QueueTeamMember extends TeamMember {
  scheduleAvailability: TeamMember['availability'];
}

interface QueueState {
  tickets: QueueTicket[];
  team: QueueTeamMember[];
  queues: QueueSummary[];
  activity: ActivityEvent[];
}

type QueueAction =
  | { type: 'status-changed'; id: string; status: TicketStatus }
  | { type: 'ticket-assigned'; id: string; barber: string }
  | { type: 'reset' };

function initialState(): QueueState {
  return {
    tickets: panelRepository.tickets(),
    team: panelRepository.team().map((member) => ({
      ...member,
      scheduleAvailability: member.availability,
    })),
    queues: panelRepository.queues(),
    activity: panelRepository.activity(),
  };
}

/** Fields each transition resets, mirroring what the panel showed before. */
const resetsWait: Partial<Record<TicketStatus, true>> = {
  atencion: true,
  finalizado: true,
};

/** A barber is busy while holding at least one ticket in service. */
function isBusyWith(tickets: QueueTicket[], barber: string): boolean {
  return tickets.some((ticket) => ticket.barber === barber && ticket.status === 'atencion');
}

/**
 * Mirrors the barber's live availability onto the team so the stations card
 * follows the queue: busy while holding a turn in service, back to whatever
 * their schedule said once the queue frees them.
 */
function syncBarber(
  team: QueueTeamMember[],
  before: QueueTicket[],
  after: QueueTicket[],
  barber: string,
): QueueTeamMember[] {
  const busyBefore = isBusyWith(before, barber);
  const busyAfter = isBusyWith(after, barber);

  if (busyBefore === busyAfter) {
    return team;
  }

  const currentTicket = after.find(
    (ticket) => ticket.barber === barber && ticket.status === 'atencion',
  );

  return team.map((member) => {
    if (member.name !== barber) {
      return member;
    }

    if (busyAfter) {
      return { ...member, availability: 'atencion', currentTicket: currentTicket?.code ?? null };
    }

    return { ...member, availability: member.scheduleAvailability, currentTicket: null };
  });
}

function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'status-changed': {
      const tickets = state.tickets.map((ticket) => {
        if (ticket.id !== action.id) {
          return ticket;
        }

        const takesBarber = action.status === 'llamado' || action.status === 'atencion';

        return {
          ...ticket,
          barber: takesBarber ? (ticket.barber ?? state.team[0]?.name ?? null) : ticket.barber,
          waitedMinutes: resetsWait[action.status] ? 0 : ticket.waitedMinutes,
          status: action.status,
        };
      });

      const barber = tickets.find((ticket) => ticket.id === action.id)?.barber;

      return {
        ...state,
        tickets,
        team: barber ? syncBarber(state.team, state.tickets, tickets, barber) : state.team,
      };
    }

    case 'ticket-assigned': {
      const tickets = state.tickets.map((ticket) =>
        ticket.id === action.id ? { ...ticket, barber: action.barber } : ticket,
      );

      const previous = state.tickets.find((ticket) => ticket.id === action.id)?.barber;
      const freed = previous && previous !== action.barber
        ? syncBarber(state.team, state.tickets, tickets, previous)
        : state.team;

      return {
        ...state,
        tickets,
        team: syncBarber(freed, state.tickets, tickets, action.barber),
      };
    }

    case 'reset':
      return initialState();
  }
}

interface QueueContextValue extends QueueState {
  stats: ReturnType<typeof computeStats>;
  next: QueueTicket | null;
  changeStatus: (id: string, status: TicketStatus) => void;
  assignTicket: (id: string, barber: string) => void;
}

const QueueContext = createContext<QueueContextValue | null>(null);

export function QueueProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const value = useMemo<QueueContextValue>(
    () => ({
      ...state,
      stats: computeStats(state.tickets),
      next: nextActionableTicket(state.tickets),
      changeStatus: (id, status) => dispatch({ type: 'status-changed', id, status }),
      assignTicket: (id, barber) => dispatch({ type: 'ticket-assigned', id, barber }),
    }),
    [state],
  );

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
}

export function useQueue(): QueueContextValue {
  const context = useContext(QueueContext);

  if (!context) {
    throw new Error('useQueue debe usarse dentro de <QueueProvider>');
  }

  return context;
}

export type { QueueAction };