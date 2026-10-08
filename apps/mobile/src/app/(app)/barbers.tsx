import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { Button, Card, Icon, Pill } from '@/components/ui';
import { Palette, Radius, space } from '@/constants/theme';
import {
  BARBER_DISTRICTS,
  barberAvailableCount,
  barberServiceMinPrice,
  barberiasByDistrict,
  type BarberDirectoryEntry,
  type BarberDistrict,
} from '@/features/customer/barber-directory';
import { useGuestFlow } from '@/features/public/guest-flow-session';

export default function BarbersScreen() {
  const { beginDiscovery } = useGuestFlow();
  const [district, setDistrict] = useState<BarberDistrict>('Todos');
  const listed = useMemo(() => barberiasByDistrict(district), [district]);

  function openBarberia(entry: BarberDirectoryEntry) {
    beginDiscovery(entry.code, entry.catalog);
    router.push('/(public)/service');
  }

  return (
    <CustomerScreenContainer activeNavigation="barbers">
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        <CustomerHeading eyebrow="Directorio" title="Barberías" detail="Elige una barbería para ver sus servicios y barberos." />

        <View style={styles.filters}>
          {BARBER_DISTRICTS.map((item) => {
            const selected = district === item;
            return (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Filtrar por ${item}`}
                onPress={() => setDistrict(item)}
                style={[styles.chip, selected ? styles.chipSelected : null]}
              >
                <Text style={[styles.chipLabel, { color: selected ? '#FFFFFF' : Palette.inkMuted }]}>{item}</Text>
              </Pressable>
            );
          })}
        </View>

        {listed.length === 0 ? (
          <CustomerState label="Sin barberías en ese distrito" detail="Prueba con otro distrito." />
        ) : (
          <View style={styles.list}>
            {listed.map((entry) => {
              const minPrice = barberServiceMinPrice(entry);
              const available = barberAvailableCount(entry);
              return (
                <Card key={entry.businessId} padding="md">
                  <View style={styles.top}>
                    <View style={styles.titleWrap}>
                      <Text style={styles.name}>{entry.name}</Text>
                      <View style={styles.metaRow}>
                        <Icon color={Palette.inkFaint} name="map-pin" size={13} />
                        <Text style={styles.meta}>{entry.district} · {entry.distanceKm.toFixed(1)} km</Text>
                      </View>
                    </View>
                    <Pill label={entry.isOpen ? 'Abierto' : 'Cerrado'} tone={entry.isOpen ? 'success' : 'neutral'} />
                  </View>

                  <View style={styles.facts}>
                    <View style={styles.fact}>
                      <Icon color={Palette.brand} name="scissors" size={14} />
                      <Text style={styles.factText}>{entry.catalog.services.length} servicios</Text>
                    </View>
                    <View style={styles.fact}>
                      <Icon color={Palette.brand} name="user" size={14} />
                      <Text style={styles.factText}>{available} barberos libres</Text>
                    </View>
                    <View style={styles.fact}>
                      <Icon color={Palette.goldDeep} name="clock" size={14} />
                      <Text style={styles.factText}>~{entry.etaMinutes} min</Text>
                    </View>
                    {minPrice !== null ? (
                      <View style={styles.fact}>
                        <Icon color={Palette.goldDeep} name="star" size={14} />
                        <Text style={styles.factText}>Desde S/ {(minPrice / 100).toFixed(2)}</Text>
                      </View>
                    ) : null}
                  </View>

                  <Button
                    disabled={!entry.isOpen}
                    fullWidth
                    label={entry.isOpen ? 'Ver servicios' : 'Barbería cerrada'}
                    onPress={() => openBarberia(entry)}
                    variant={entry.isOpen ? 'primary' : 'secondary'}
                  />
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </CustomerScreenContainer>
  );
}

const styles = StyleSheet.create({
  page: { alignSelf: 'center', gap: space(4), maxWidth: 640, paddingBottom: space(8), paddingHorizontal: space(4), paddingTop: space(4), width: '100%' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: space(2) },
  chip: { backgroundColor: Palette.brandSoftest, borderColor: Palette.border, borderRadius: Radius.pill, borderWidth: 1, paddingHorizontal: space(4), paddingVertical: space(2) },
  chipSelected: { backgroundColor: Palette.brand, borderColor: Palette.brand },
  chipLabel: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  list: { gap: space(3) },
  top: { alignItems: 'flex-start', flexDirection: 'row', gap: space(3), justifyContent: 'space-between' },
  titleWrap: { flex: 1, gap: 2 },
  name: { color: Palette.ink, fontSize: 17, fontWeight: '700', lineHeight: 23 },
  metaRow: { alignItems: 'center', flexDirection: 'row', gap: space(1) },
  meta: { color: Palette.inkMuted, fontSize: 13, fontWeight: '500', lineHeight: 18 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: space(3) },
  fact: { alignItems: 'center', flexDirection: 'row', gap: space(1) },
  factText: { color: Palette.inkMuted, fontSize: 13, fontWeight: '600', lineHeight: 18 },
});
