import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button, Card, Icon } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { requestCustomerLocation } from '@/features/location/customer-location';
import type { ShopCoordinates } from '@/features/location/shop-coordinates';
import {
  createDefaultRouteProvider,
  getDrivingRouteWithFallback,
  formatRouteSummary,
  type RouteEstimate,
} from '@/features/routing/route-provider';

/**
 * Guest "how to get there" card: driving distance + estimated travel time
 * from the customer GPS to the shop. Informational only: every degradation
 * path renders a message and ticket creation is never blocked.
 */

type ArrivalState =
  | { kind: 'sin-coordenadas' }
  | { kind: 'calculando' }
  | { kind: 'lista'; estimate: RouteEstimate }
  | { kind: 'gps-denegado' }
  | { kind: 'no-disponible' };

/** Free-tier key injected at build time; the parent provisions it. */
function openRouteServiceKey(): string {
  return process.env.EXPO_PUBLIC_OPENROUTESERVICE_KEY ?? '';
}

async function resolveEstimate(
  origin: ShopCoordinates,
  destination: ShopCoordinates,
): Promise<RouteEstimate> {
  return getDrivingRouteWithFallback(origin, destination, {
    provider: createDefaultRouteProvider({ apiKey: openRouteServiceKey() }),
  });
}

export function HowToGetThere({ shopName, shop }: { shopName: string; shop: ShopCoordinates | null }) {
  const [state, setState] = useState<ArrivalState>(shop ? { kind: 'calculando' } : { kind: 'sin-coordenadas' });
  const [attempt, setAttempt] = useState(0);
  const active = useRef(true);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const calculate = useCallback(async () => {
    if (!shop) {
      setState({ kind: 'sin-coordenadas' });
      return;
    }
    setState({ kind: 'calculando' });
    const location = await requestCustomerLocation();
    if (!active.current) return;
    if (location.status === 'denegado') {
      setState({ kind: 'gps-denegado' });
      return;
    }
    if (location.status !== 'ok') {
      setState({ kind: 'no-disponible' });
      return;
    }
    try {
      const estimate = await resolveEstimate(
        { latitude: location.latitude, longitude: location.longitude },
        shop,
      );
      if (active.current) setState({ kind: 'lista', estimate });
    } catch {
      if (active.current) setState({ kind: 'no-disponible' });
    }
  }, [shop]);

  useEffect(() => {
    void calculate();
  }, [calculate, attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  return (
    <Card padding="md">
      <View style={styles.heading}>
        <View style={styles.iconDisc}>
          <Icon color={Palette.brand} name="map-pin" size={19} />
        </View>
        <View style={styles.titleCopy}>
          <Text style={[TypeScale.bodyStrong, { color: Palette.ink }]}>Cómo llegar</Text>
          <Text numberOfLines={1} style={[TypeScale.caption, { color: Palette.inkMuted }]}>
            {shopName}
          </Text>
        </View>
      </View>

      {state.kind === 'calculando' ? (
        <Text accessibilityRole="progressbar" style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>
          Calculando tu ruta…
        </Text>
      ) : null}

      {state.kind === 'lista' ? (
        <View style={styles.result}>
          <Text style={[TypeScale.title, { color: Palette.ink }]}>{formatRouteSummary(state.estimate)}</Text>
          <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>
            Tiempo estimado según la ruta, sin tráfico en vivo.
          </Text>
        </View>
      ) : null}

      {state.kind === 'sin-coordenadas' ? (
        <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>
          Esta barbería aún no tiene ubicación registrada, así que no podemos mostrar la distancia. Pregunta en el
          local y toma tu turno con normalidad.
        </Text>
      ) : null}

      {state.kind === 'gps-denegado' ? (
        <View style={styles.result}>
          <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>
            No pudimos obtener tu ubicación porque el acceso al GPS está denegado. Actívalo para ver la distancia y
            el tiempo estimado.
          </Text>
          <Button
            accessibilityLabel="Reintentar cálculo de ruta"
            icon="refresh"
            label="Reintentar"
            onPress={retry}
            size="sm"
            variant="secondary"
          />
        </View>
      ) : null}

      {state.kind === 'no-disponible' ? (
        <View style={styles.result}>
          <Text style={[TypeScale.bodySmall, { color: Palette.inkMuted }]}>
            Tu ubicación no está disponible ahora. Revisa tu conexión o el GPS e inténtalo de nuevo.
          </Text>
          <Button
            accessibilityLabel="Reintentar cálculo de ruta"
            icon="refresh"
            label="Reintentar"
            onPress={retry}
            size="sm"
            variant="secondary"
          />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  heading: { alignItems: 'center', flexDirection: 'row', gap: space(3) },
  iconDisc: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.small,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  titleCopy: { flex: 1, gap: 1 },
  result: { gap: space(2) },
});
