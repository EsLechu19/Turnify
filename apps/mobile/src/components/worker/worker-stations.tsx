import { StyleSheet, View } from 'react-native';

import { Pill } from '@/components/ui';
import { WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { space } from '@/constants/theme';
import type { WorkerTicket } from '@/features/queue/worker-barber-api';

type StationStatus = 'disponible' | 'ocupada' | 'fuera_de_servicio';

type Station = {
  number: number;
  barber: string;
  ticketCode: string | null;
  service: string | null;
  status: StationStatus;
};

const statusLabel: Record<StationStatus, string> = {
  disponible: 'DISPONIBLE',
  ocupada: 'OCUPADA',
  fuera_de_servicio: 'FUERA DE SERVICIO',
};

const statusTone: Record<StationStatus, 'success' | 'danger' | 'neutral'> = {
  disponible: 'success',
  ocupada: 'danger',
  fuera_de_servicio: 'neutral',
};

/**
 * Presentation-only overview of the barbershop chairs. The live chair comes
 * from the real attention ticket; the remaining chairs are placeholders until
 * the backend exposes per-station data.
 */
export function WorkerStations({ attentionTicket }: { attentionTicket: WorkerTicket | null }) {
  const stations: Station[] = [
    {
      number: 1,
      barber: attentionTicket?.assignedBarberName ?? 'Tú',
      ticketCode: attentionTicket?.visibleCode ?? null,
      service: attentionTicket?.serviceName ?? null,
      status: attentionTicket ? 'ocupada' : 'disponible',
    },
    { number: 2, barber: 'Por asignar', ticketCode: null, service: null, status: 'ocupada' },
    { number: 3, barber: 'Por asignar', ticketCode: null, service: null, status: 'fuera_de_servicio' },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <WorkerText variant="headline">Estaciones activas</WorkerText>
        <WorkerText color={workerColors.muted}>Estado de las sillas de la barbería</WorkerText>
      </View>
      {stations.map((station) => (
        <View key={station.number} style={[workerUiStyles.card, styles.station]}>
          <View style={workerUiStyles.split}>
            <WorkerText variant="headline">Estación {station.number}</WorkerText>
            <Pill label={statusLabel[station.status]} tone={statusTone[station.status]} />
          </View>
          <WorkerText color={workerColors.muted}>{station.barber}</WorkerText>
          <WorkerText variant="label">
            {station.ticketCode ? `Turno ${station.ticketCode}` : 'Sin turno asignado'}
            {station.service ? ` · ${station.service}` : ''}
          </WorkerText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space(3) },
  heading: { gap: 2 },
  station: { gap: space(1) },
});
