import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { parseTurnifyQr } from '@/features/queue/queue-api';
import { publicLaunchRoute, publicShopRoute } from '@/features/public/public-route-policy';

function ScannerIcon({ name, color = '#00686C', size = 22 }: { name: 'arrow-left' | 'camera' | 'lock' | 'refresh'; color?: string; size?: number }) {
  const common = { stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };

  return (
    <Svg accessibilityElementsHidden fill="none" height={size} viewBox="0 0 24 24" width={size}>
      {name === 'arrow-left' && <Path {...common} d="m15 18-6-6 6-6M9 12h11" />}
      {name === 'camera' && <><Path {...common} d="M4 8h3l1.4-2h7.2L17 8h3v11H4V8Z" /><Path {...common} d="M12 16a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /></>}
      {name === 'lock' && <><Path {...common} d="M6 10h12v10H6z" /><Path {...common} d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10" /></>}
      {name === 'refresh' && <><Path {...common} d="M20 11a8 8 0 0 0-14.8-4L3 10M4 13a8 8 0 0 0 14.8 4l2.2-3" /><Path {...common} d="M3 5v5h5M21 19v-5h-5" /></>}
    </Svg>
  );
}

function BrandMark() {
  return <View accessible={false} style={styles.brandMark}><View style={styles.brandMarkInner} /></View>;
}

function Reticle() {
  const scanProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(scanProgress, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 1, useNativeDriver: true }),
      Animated.timing(scanProgress, { duration: 1500, easing: Easing.inOut(Easing.quad), toValue: 0, useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [scanProgress]);

  return (
    <View accessible={false} pointerEvents="none" style={styles.reticle}>
      <View style={[styles.reticleCorner, styles.topLeft]} />
      <View style={[styles.reticleCorner, styles.topRight]} />
      <View style={[styles.reticleCorner, styles.bottomLeft]} />
      <View style={[styles.reticleCorner, styles.bottomRight]} />
      <Animated.View style={[styles.scanLine, { transform: [{ translateY: scanProgress.interpolate({ inputRange: [0, 1], outputRange: [-72, 72] }) }] }]} />
    </View>
  );
}

export default function PublicScanScreen() {
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

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
      <ScrollView contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="Volver al inicio" accessibilityRole="button" hitSlop={8} onPress={returnHome} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <ScannerIcon name="arrow-left" size={20} />
          </Pressable>
          <View style={styles.brand}><BrandMark /><Text style={styles.brandName}>Turnify</Text></View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heading}>
          <Text style={styles.eyebrow}>ACCESO A LA BARBERÍA</Text>
          <Text style={styles.title}>Escanea el código QR</Text>
          <Text style={styles.subtitle}>Apunta la cámara al código visible en la barbería para continuar.</Text>
        </View>

        {!permission && (
          <View accessibilityLabel="Preparando la cámara" accessibilityRole="progressbar" style={styles.stateCard}>
            <View style={styles.stateIcon}><ScannerIcon name="camera" /></View>
            <Text style={styles.stateTitle}>Preparando la cámara…</Text>
            <Text style={styles.stateDetail}>Un momento mientras verificamos el acceso.</Text>
          </View>
        )}

        {permissionDenied && (
          <View style={styles.permissionCard}>
            <View style={styles.stateIcon}><ScannerIcon name="camera" /></View>
            <Text style={styles.stateTitle}>Activa la cámara para escanear</Text>
            <Text style={styles.stateDetail}>Turnify necesita acceso a la cámara únicamente para leer el código QR de la barbería.</Text>
            <Pressable accessibilityLabel="Permitir acceso a la cámara" accessibilityRole="button" onPress={() => void requestPermission()} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
              <Text style={styles.primaryButtonLabel}>Permitir cámara</Text>
              <ScannerIcon color="#FFFFFF" name="camera" size={20} />
            </Pressable>
            <Pressable accessibilityLabel="Ingresar el código de la barbería manualmente" accessibilityRole="button" onPress={returnHome} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <Text style={styles.secondaryButtonLabel}>Ingresar código manualmente</Text>
            </Pressable>
          </View>
        )}

        {isCameraReady && (
          <>
            <View accessibilityLabel={error ? 'Escaneo pausado por código no válido' : 'Cámara activa buscando un código QR'} style={styles.cameraPanel}>
              <CameraView barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned} style={StyleSheet.absoluteFill} />
              <View pointerEvents="none" style={styles.cameraShade} />
              <Reticle />
              <View pointerEvents="none" style={styles.cameraStatus}><View style={styles.statusDot} /><Text style={styles.cameraStatusText}>{error ? 'ESCANEO PAUSADO' : 'BUSCANDO CÓDIGO QR'}</Text></View>
            </View>
            <View style={styles.privacyHint}><ScannerIcon color="#00686C" name="lock" size={16} /><Text style={styles.privacyText}>Solo usamos la cámara para leer el código.</Text></View>
          </>
        )}

        {error && (
          <View accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.errorCard}>
            <Text style={styles.errorTitle}>No pudimos leer el código</Text>
            <Text style={styles.errorDetail}>{error} Comprueba que sea el código de la barbería e intenta otra vez.</Text>
            <Pressable accessibilityLabel="Intentar escanear otro código" accessibilityRole="button" onPress={retryScan} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <ScannerIcon color="#00686C" name="refresh" size={18} /><Text style={styles.retryButtonLabel}>Escanear de nuevo</Text>
            </Pressable>
          </View>
        )}

        <Pressable accessibilityLabel="Volver al inicio" accessibilityRole="button" onPress={returnHome} style={({ pressed }) => [styles.homeButton, pressed && styles.pressed]}>
          <Text style={styles.homeButtonLabel}>Volver al inicio</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#F7F9FF', flex: 1 },
  page: { alignSelf: 'center', gap: 18, maxWidth: 480, paddingHorizontal: 20, paddingTop: 12, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 42 },
  backButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE3F2', borderRadius: 8, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  brandMark: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 8, height: 28, justifyContent: 'center', width: 28 },
  brandMarkInner: { backgroundColor: '#F7F9FF', borderRadius: 2, height: 12, transform: [{ rotate: '45deg' }], width: 12 },
  brandName: { color: '#111D27', fontSize: 17, fontWeight: '800', letterSpacing: -0.3, lineHeight: 22 },
  headerSpacer: { width: 40 },
  heading: { alignItems: 'center', gap: 7, paddingHorizontal: 8 },
  eyebrow: { color: '#3D5781', fontSize: 10, fontWeight: '800', letterSpacing: 1, lineHeight: 13 },
  title: { color: '#111D27', fontSize: 28, fontWeight: '800', letterSpacing: -0.8, lineHeight: 34, textAlign: 'center' },
  subtitle: { color: '#526075', fontSize: 15, lineHeight: 22, maxWidth: 340, textAlign: 'center' },
  cameraPanel: { alignItems: 'center', backgroundColor: '#172833', borderRadius: 12, height: 350, justifyContent: 'center', overflow: 'hidden' },
  cameraShade: { backgroundColor: '#111D27', bottom: 0, left: 0, opacity: 0.2, position: 'absolute', right: 0, top: 0 },
  reticle: { height: 196, position: 'relative', width: 196 },
  reticleCorner: { borderColor: '#48D1CC', height: 38, position: 'absolute', width: 38 },
  topLeft: { borderLeftWidth: 3, borderTopWidth: 3, left: 0, top: 0 }, topRight: { borderRightWidth: 3, borderTopWidth: 3, right: 0, top: 0 },
  bottomLeft: { borderBottomWidth: 3, borderLeftWidth: 3, bottom: 0, left: 0 }, bottomRight: { borderBottomWidth: 3, borderRightWidth: 3, bottom: 0, right: 0 },
  scanLine: { backgroundColor: '#48D1CC', height: 2, left: 14, opacity: 0.95, position: 'absolute', top: 97, width: 168 },
  cameraStatus: { alignItems: 'center', backgroundColor: '#111D27CC', borderRadius: 999, bottom: 16, flexDirection: 'row', gap: 7, paddingHorizontal: 12, paddingVertical: 7, position: 'absolute' },
  statusDot: { backgroundColor: '#48D1CC', borderRadius: 99, height: 7, width: 7 },
  cameraStatusText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', letterSpacing: 0.8, lineHeight: 13 },
  privacyHint: { alignItems: 'center', alignSelf: 'center', flexDirection: 'row', gap: 7, marginTop: -7 },
  privacyText: { color: '#526075', fontSize: 12, lineHeight: 17 },
  stateCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#DCE3F2', borderRadius: 12, borderWidth: 1, gap: 9, padding: 24 },
  permissionCard: { alignItems: 'center', backgroundColor: '#EAF0FF', borderRadius: 12, gap: 12, padding: 24 },
  stateIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 8, height: 44, justifyContent: 'center', width: 44 },
  stateTitle: { color: '#111D27', fontSize: 18, fontWeight: '800', lineHeight: 24, textAlign: 'center' },
  stateDetail: { color: '#526075', fontSize: 14, lineHeight: 21, textAlign: 'center' },
  primaryButton: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: '#00686C', borderRadius: 12, flexDirection: 'row', height: 52, justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 16 },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', lineHeight: 22 },
  secondaryButton: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: '#FFFFFF', borderColor: '#C9D5EF', borderRadius: 8, borderWidth: 1, height: 48, justifyContent: 'center', paddingHorizontal: 12 },
  secondaryButtonLabel: { color: '#00686C', fontSize: 14, fontWeight: '800', lineHeight: 19, textAlign: 'center' },
  errorCard: { backgroundColor: '#FFF0EE', borderColor: '#F2BBB4', borderRadius: 8, borderWidth: 1, gap: 6, padding: 14 },
  errorTitle: { color: '#9B281B', fontSize: 15, fontWeight: '800', lineHeight: 20 },
  errorDetail: { color: '#9B281B', fontSize: 13, lineHeight: 19 },
  retryButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 7, marginTop: 4, paddingVertical: 4 },
  retryButtonLabel: { color: '#00686C', fontSize: 14, fontWeight: '800', lineHeight: 20 },
  homeButton: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  homeButtonLabel: { color: '#526075', fontSize: 14, fontWeight: '700', lineHeight: 20, textDecorationLine: 'underline' },
  pressed: { opacity: 0.78 },
});
