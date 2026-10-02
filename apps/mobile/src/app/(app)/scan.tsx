import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { CustomerScreenContainer } from '@/components/customer/customer-screen-container';
import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { parseTurnifyQr } from '@/features/queue/queue-api';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions(); const [error, setError] = useState<string | null>(null); const [hasScanned, setHasScanned] = useState(false);
  function handleBarcodeScanned({ data }: { data: string }) { if (hasScanned) return; setHasScanned(true); const code = parseTurnifyQr(data); if (!code) { setError('El código QR no es válido para Turnify.'); setHasScanned(false); return; } router.replace({ pathname: '/(app)/preview', params: { code } }); }
  if (!permission) return <CustomerScreenContainer activeNavigation="home"><CustomerPage><CustomerState label="Preparando la cámara…" isLoading /></CustomerPage></CustomerScreenContainer>;
  return <CustomerScreenContainer activeNavigation="home"><CustomerPage><CustomerHeading eyebrow="Código de la barbería" title="Escanea el código QR" detail="Apunta la cámara al código mostrado por la barbería." />
    {!permission.granted ? <CustomerCard><CustomerState label="Permite usar la cámara" detail="Necesitamos acceso para leer el código de la empresa." /><CustomerButton label="Permitir cámara" onPress={() => void requestPermission()} /></CustomerCard> : <View style={styles.cameraWrap}><CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned} /><View pointerEvents="none" style={styles.frame} /></View>}
    {error && <CustomerState label={error} detail="Prueba nuevamente con un código de Turnify." />}<CustomerButton label="Volver" variant="secondary" onPress={() => router.back()} />
  </CustomerPage></CustomerScreenContainer>;
}
const styles = StyleSheet.create({ cameraWrap: { borderRadius: 16, height: 320, overflow: 'hidden' }, frame: { borderColor: '#0E8388', borderRadius: 20, borderWidth: 3, height: 180, left: '50%', marginLeft: -90, marginTop: -90, position: 'absolute', top: '50%', width: 180 } });
