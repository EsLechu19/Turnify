// Ticket status vocabulary, mirroring the DB enum exactly.
// Status literals stay in Spanish to match the database;
// every other identifier and comment in this module is in English.
export type TicketStatus =
  | 'en_espera'
  | 'notificado'
  | 'llamado'
  | 'en_atencion'
  | 'finalizado'
  | 'cancelado'
  | 'ausente';

// Tickets still in the service flow.
export const ACTIVE: TicketStatus[] = [
  'en_espera',
  'notificado',
  'llamado',
  'en_atencion',
];

// Tickets closed out of the flow for good.
export const TERMINAL: TicketStatus[] = ['finalizado', 'cancelado', 'ausente'];

// A ticket is plain data: id plus status. Transitions never mutate
// a ticket in place; they return a new ticket instead.
export interface Ticket {
  id: string;
  status: TicketStatus;
}
