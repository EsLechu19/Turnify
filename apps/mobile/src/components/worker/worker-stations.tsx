import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Pill } from '@/components/ui';
import { WorkerText, workerColors, workerUiStyles } from '@/components/worker/worker-ui';
import { space } from '@/constants/theme';
import type { ShopStation } from '@/features/queue/worker-barber-api';

const statusLabel: Record<ShopStation['operationalState'], string> = {
  disponible: 'DISPONIBLE',
  ocupado: 'OCUPADA',
  fuera_de_turno: 'FUERA DE TURNO',
};

const statusTone: Record<ShopStation['operationalState'], 'success' | 'danger' | 'neutral'> = {
  disponible: 'success',
  ocupado: 'danger',
  fuera_de_turno: 'neutral',
};

/**
 * Live overview of the shop chairs, one card per roster barber with an active
 * worker account: operational state plus the ticket being served, if any.
 * Tapping a busy station jumps to the queue where the actions live.
 */
export function WorkerStations({ stations, isLoading }: { stations: ShopStation[]; isLoading: boolean }) {
  return (
    <View style={styles.section}>
      <View style={styles.heading}>
        <WorkerText variant="headline">Estaciones activas</WorkerText>
        <WorkerText color={workerColors.muted}>Estado de las sillas de la barbería</WorkerText>
      </View>

      {isLoading && stations.length === 0 ? (
        <View style={workerUiStyles.card}>
          <WorkerText color={workerColors.muted}>Actualizando estaciones…</WorkerText>
        </View>
      ) : null}

      {!isLoading && stations.length === 0 ? (
        <View style={workerUiStyles.card}>
          <WorkerText variant="headline">Sin barberos en turno</WorkerText>
          <WorkerText color={workerColors.muted}>Cuando el personal marque disponibilidad, sus sillas aparecen aquí.</WorkerText>
        </View>
      ) : null}

      {stations.map((station) => (
        <Pressable
          accessibilityLabel={station.ticketCode ? `Estación de ${station.name}, turno ${station.ticketCode}` : `Estación de ${station.name}`}
          accessibilityRole="button"
          disabled={!station.ticketCode}
          key={station.barberId}
          onPress={() => router.push('/(app)/worker-queue')}
          style={({ pressed }) => [workerUiStyles.card, styles.station, pressed && station.ticketCode ? styles.pressed : null]}
        >
          <View style={workerUiStyles.split}>
            <WorkerText variant="headline">{station.name}</WorkerText>
            <Pill label={statusLabel[station.operationalState]} tone={statusTone[station.operationalState]} />
          </View>
          <WorkerText variant="label">
            {station.ticketCode ? `Turno ${station.ticketCode}` : 'Sin turno asignado'}
            {station.serviceName ? ` · ${station.serviceName}` : ''}
          </WorkerText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: space(3) },
  heading: { gap: 2 },
  station: { gap: space(1) },
  pressed: { opacity: 0.8 },
});
