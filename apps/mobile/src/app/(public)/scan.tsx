import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BrandBar, Button, Card, Icon, StateBlock } from '@/components/ui';
import { Palette, Radius, space, TypeScale } from '@/constants/theme';
import { parseTurnifyQr } from '@/features/queue/queue-api';
import { useGuestFlow } from '@/features/public/guest-flow-session';
import { publicLaunchRoute, publicShopRoute } from '@/features/public/public-route-policy';

function Reticle() {
  const scanProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scanProgress, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
        Animated.timing(scanProgress, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [scanProgress]);

  return (
    <View accessible={false} style={styles.reticle}>
      <View style={[styles.reticleCorner, styles.topLeft]} />
      <View style={[styles.reticleCorner, styles.topRight]} />
      <View style={[styles.reticleCorner, styles.bottomLeft]} />
      <View style={[styles.reticleCorner, styles.bottomRight]} />
      <Animated.View
        style={[
          styles.scanLine,
          { transform: [{ translateY: scanProgress.interpolate({ inputRange: [0, 1], outputRange: [-72, 72] }) }] },
        ]}
      />
    </View>
  );
}

export default function PublicScanScreen() {
  const insets = useSafeAreaInsets();
  const { hasActiveTicketAccess } = useGuestFlow();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (hasActiveTicketAccess) router.replace(publicLaunchRoute);
  }, [hasActiveTicketAccess]);

  if (hasActiveTicketAccess) return null;

  function returnHome() {
    router.replace(publicLaunchRoute);
  }

  function retryScan() {
    setError(null);
    setHasScanned(false);
  }

  function handleBarcodeScanned({ data }: { data: string }) {
    if (hasScanned) return;
    const code = parseTurnifyQr(data);
    if (!code) {
      setHasScanned(true);
      setError('Este código QR no es válido para Turnify.');
      return;
    }

    setHasScanned(true);
    router.replace({ pathname: publicShopRoute, params: { code } });
  }

  const isCameraReady = permission?.granted === true;
  const permissionDenied = permission && !permission.granted;

  return (
    <View style={[styles.shell, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <BrandBar onBack={returnHome} />

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>Acceso a la barbería</Text>
          <Text style={[TypeScale.display, { color: Palette.ink, textAlign: 'center' }]}>Escanea el código QR</Text>
          <Text style={[TypeScale.body, styles.subtitle]}>
            Apunta la cámara al código visible en la barbería para continuar.
          </Text>
        </View>

        {!permission ? (
          <View accessibilityLabel="Preparando la cámara" accessibilityRole="progressbar">
            <StateBlock detail="Un momento mientras verificamos el acceso." icon="qr" loading title="Preparando la cámara…" />
          </View>
        ) : null}

        {permissionDenied ? (
          <Card padding="lg" tone="brand">
            <View style={styles.stateIcon}>
              <Icon color={Palette.brand} name="qr" size={24} />
            </View>
            <Text style={[TypeScale.h3, { color: Palette.ink, textAlign: 'center' }]}>Activa la cámara para escanear</Text>
            <Text style={[TypeScale.bodySmall, styles.stateDetail]}>
              Turnify necesita acceso a la cámara únicamente para leer el código QR de la barbería.
            </Text>
            <Button
              accessibilityLabel="Permitir acceso a la cámara"
              fullWidth
              icon="qr"
              label="Permitir cámara"
              onPress={() => void requestPermission()}
            />
            <Button
              accessibilityLabel="Ingresar el código de la barbería manualmente"
              fullWidth
              icon="code"
              label="Ingresar código manualmente"
              onPress={returnHome}
              variant="secondary"
            />
          </Card>
        ) : null}

        {isCameraReady ? (
          <>
            <View
              accessibilityLabel={error ? 'Escaneo pausado por código no válido' : 'Cámara activa buscando un código QR'}
              style={styles.cameraPanel}
            >
              <CameraView
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.cameraShade} />
              <Reticle />
              <View style={styles.cameraStatus}>
                <View style={[styles.statusDot, error ? styles.statusDotError : null]} />
                <Text style={styles.cameraStatusText}>{error ? 'Escaneo pausado' : 'Buscando código QR'}</Text>
              </View>
            </View>
            <View style={styles.privacyHint}>
              <Icon color={Palette.brand} name="lock" size={16} />
              <Text style={[TypeScale.caption, { color: Palette.inkMuted }]}>Solo usamos la cámara para leer el código.</Text>
            </View>
          </>
        ) : null}

        {error ? (
          <View accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Card padding="md" tone="danger">
              <Text style={[TypeScale.bodyStrong, { color: Palette.danger }]}>No pudimos leer el código</Text>
              <Text style={[TypeScale.caption, { color: Palette.danger }]}>
                {error} Comprueba que sea el código de la barbería e intenta otra vez.
              </Text>
              <Button
                accessibilityLabel="Intentar escanear otro código"
                icon="refresh"
                label="Escanear de nuevo"
                onPress={retryScan}
                variant="secondary"
              />
            </Card>
          </View>
        ) : null}

        <Button label="Volver al inicio" onPress={returnHome} variant="ghost" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: Palette.canvas, flex: 1 },
  page: { alignSelf: 'center', gap: space(4), maxWidth: 520, paddingHorizontal: space(5), paddingTop: space(2), width: '100%' },
  heading: { alignItems: 'center', gap: space(2), paddingHorizontal: space(2) },
  eyebrow: { color: Palette.goldDeep, fontSize: 11, fontWeight: '800', letterSpacing: 0.9, lineHeight: 14 },
  subtitle: { color: Palette.inkMuted, maxWidth: 340, textAlign: 'center' },

  stateIcon: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderRadius: Radius.medium,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  stateDetail: { color: Palette.inkMuted, textAlign: 'center' },

  cameraPanel: {
    alignItems: 'center',
    backgroundColor: Palette.ink,
    borderRadius: Radius.xlarge,
    height: 350,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cameraShade: { backgroundColor: Palette.ink, bottom: 0, left: 0, opacity: 0.25, pointerEvents: 'none', position: 'absolute', right: 0, top: 0 },
  reticle: { height: 196, pointerEvents: 'none', position: 'relative', width: 196 },
  reticleCorner: { borderColor: '#FFFFFF', height: 38, position: 'absolute', width: 38 },
  topLeft: { borderLeftWidth: 3, borderTopWidth: 3, left: 0, top: 0 },
  topRight: { borderRightWidth: 3, borderTopWidth: 3, right: 0, top: 0 },
  bottomLeft: { borderBottomWidth: 3, borderLeftWidth: 3, bottom: 0, left: 0 },
  bottomRight: { borderBottomWidth: 3, borderRightWidth: 3, bottom: 0, right: 0 },
  scanLine: {
    backgroundColor: Palette.gold,
    borderRadius: 2,
    height: 3,
    left: 14,
    opacity: 0.95,
    position: 'absolute',
    top: 97,
    width: 168,
  },
  cameraStatus: {
    alignItems: 'center',
    backgroundColor: 'rgba(16,29,74,0.85)',
    borderRadius: Radius.pill,
    bottom: 16,
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    pointerEvents: 'none',
    position: 'absolute',
  },
  statusDot: { backgroundColor: Palette.gold, borderRadius: Radius.pill, height: 7, width: 7 },
  statusDotError: { backgroundColor: Palette.danger },
  cameraStatusText: { color: '#FFFFFF', fontSize: 11, fontWeight: '800', letterSpacing: 0.7, lineHeight: 14 },

  privacyHint: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 7, marginTop: -space(2) },
});
