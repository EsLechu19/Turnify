/**
 * Historical attendance fixtures used by the "Historial y reportes" section.
 *
 * Records are self-contained: the panel has no Supabase connection yet, so the
 * rows below emulate a day of attended, absent and cancelled turns.
 */

import type { HistoryRecord } from '../types';

/** Labels moved to `@/data/labels`; re-exported here so fixtures keep compiling. */
export { averageOf, historyStatusLabels, historyStatusTone } from '../labels';

export const initialHistory: HistoryRecord[] = [
  { id: 'h-02', code: 'B-021', date: '2026-10-05', arrival: '09:20', customer: 'Jorge Parra', service: 'Barba clásica', barber: 'Mateo Cruz', waitMinutes: 4, durationMinutes: 18, status: 'completado' },
  { id: 'h-03', code: 'C-102', date: '2026-10-05', arrival: '09:45', customer: 'Lucía Fernández', service: 'Corte + barba', barber: 'Diego Ramírez', waitMinutes: 11, durationMinutes: 44, status: 'completado' },
  { id: 'h-04', code: 'C-103', date: '2026-10-05', arrival: '10:10', customer: 'Andrés Soto', service: 'Corte caballero', barber: null, waitMinutes: 9, durationMinutes: 0, status: 'ausencia' },
  { id: 'h-05', code: 'B-022', date: '2026-10-05', arrival: '10:30', customer: 'Marta León', service: 'Barba + perfilado', barber: 'Rosa Medina', waitMinutes: 7, durationMinutes: 24, status: 'completado' },
  { id: 'h-06', code: 'C-104', date: '2026-10-05', arrival: '11:00', customer: 'Pablo Rivas', service: 'Corte caballero', barber: 'Diego Ramírez', waitMinutes: 5, durationMinutes: 30, status: 'completado' },
  { id: 'h-07', code: 'C-105', date: '2026-10-05', arrival: '11:25', customer: 'Hugo Cárdenas', service: 'Corte + barba', barber: 'Iván Salazar', waitMinutes: 14, durationMinutes: 47, status: 'completado' },
  { id: 'h-08', code: 'B-023', date: '2026-10-05', arrival: '11:50', customer: 'Elena Ruiz', service: 'Barba clásica', barber: null, waitMinutes: 8, durationMinutes: 0, status: 'cancelado' },
  { id: 'h-09', code: 'C-106', date: '2026-10-05', arrival: '12:15', customer: 'Bruno Díaz', service: 'Corte caballero', barber: 'Mateo Cruz', waitMinutes: 12, durationMinutes: 35, status: 'completado' },
  { id: 'h-10', code: 'C-107', date: '2026-10-05', arrival: '12:40', customer: 'Carla Núñez', service: 'Corte + barba', barber: 'Diego Ramírez', waitMinutes: 16, durationMinutes: 42, status: 'completado' },
  { id: 'h-11', code: 'B-024', date: '2026-10-05', arrival: '13:05', customer: 'Iván Torres', service: 'Barba + perfilado', barber: 'Rosa Medina', waitMinutes: 5, durationMinutes: 22, status: 'completado' },
  { id: 'h-12', code: 'C-108', date: '2026-10-05', arrival: '13:30', customer: 'Nora Peña', service: 'Corte caballero', barber: null, waitMinutes: 10, durationMinutes: 0, status: 'ausencia' },
  { id: 'h-13', code: 'C-109', date: '2026-10-05', arrival: '14:05', customer: 'Luis Salas', service: 'Corte caballero', barber: 'Iván Salazar', waitMinutes: 8, durationMinutes: 29, status: 'completado' },
  { id: 'h-14', code: 'B-025', date: '2026-10-05', arrival: '14:35', customer: 'Gina Ortega', service: 'Barba clásica', barber: 'Mateo Cruz', waitMinutes: 6, durationMinutes: 19, status: 'completado' },
  { id: 'h-15', code: 'C-110', date: '2026-10-05', arrival: '15:00', customer: 'Raúl Mora', service: 'Corte + barba', barber: 'Diego Ramírez', waitMinutes: 13, durationMinutes: 45, status: 'completado' },
  { id: 'h-16', code: 'C-111', date: '2026-10-05', arrival: '15:30', customer: 'Sofía Luna', service: 'Corte caballero', barber: 'Iván Salazar', waitMinutes: 7, durationMinutes: 31, status: 'completado' },
  { id: 'h-17', code: 'B-026', date: '2026-10-05', arrival: '16:00', customer: 'Pedro Gil', service: 'Barba + perfilado', barber: null, waitMinutes: 9, durationMinutes: 0, status: 'cancelado' },
  { id: 'h-18', code: 'C-112', date: '2026-10-05', arrival: '16:25', customer: 'Ana Vargas', service: 'Corte caballero', barber: 'Diego Ramírez', waitMinutes: 6, durationMinutes: 33, status: 'completado' },
  { id: 'h-19', code: 'C-113', date: '2026-10-05', arrival: '17:05', customer: 'Marc Ríos', service: 'Corte + barba', barber: 'Mateo Cruz', waitMinutes: 15, durationMinutes: 48, status: 'completado' },
  { id: 'h-20', code: 'B-027', date: '2026-10-05', arrival: '17:40', customer: 'Óscar Pardo', service: 'Barba clásica', barber: 'Rosa Medina', waitMinutes: 4, durationMinutes: 17, status: 'completado' },
  { id: 'h-21', code: 'C-114', date: '2026-10-05', arrival: '18:10', customer: 'Lia Castillo', service: 'Corte caballero', barber: 'Iván Salazar', waitMinutes: 11, durationMinutes: 34, status: 'completado' },
  { id: 'h-22', code: 'C-115', date: '2026-10-05', arrival: '18:45', customer: 'Nico Bravo', service: 'Corte caballero', barber: null, waitMinutes: 7, durationMinutes: 0, status: 'ausencia' },
  { id: 'h-23', code: 'B-028', date: '2026-10-05', arrival: '19:20', customer: 'Eva Ramos', service: 'Barba + perfilado', barber: 'Diego Ramírez', waitMinutes: 5, durationMinutes: 23, status: 'completado' },
  { id: 'h-24', code: 'C-116', date: '2026-10-05', arrival: '19:55', customer: 'Tino Cruz', service: 'Corte + barba', barber: 'Mateo Cruz', waitMinutes: 10, durationMinutes: 46, status: 'completado' },
];
