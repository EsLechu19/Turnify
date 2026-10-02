import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CustomerButton, CustomerCard, CustomerHeading, CustomerPage, CustomerState } from '@/components/customer/customer-ui';
import { parseTurnifyQr } from '@/features/queue/queue-api';
import { publicShopRoute } from '@/features/public/public-route-policy';

export default function PublicScanScreen() {
  const [permission, requestPermission] = useCameraPermissions(); const [error, setError] = useState<string | null>(null); const [hasScanned, setHasScanned] = useState(false);
  function handleBarcodeScanned({ data }: { data: string }) { if (hasScanned) return; const code = parseTurnifyQr(data); if (!code) { setError('El código QR no es válido para Turnify.'); return; } setHasScanned(true); router.replace({ pathname: publicShopRoute, params: { code } }); }
  if (!permission) return <CustomerPage><CustomerState label="Preparando la cámara…" isLoading /></CustomerPage>;
  return <CustomerPage><CustomerHeading eyebrow="Código de la barbería" title="Escanea el código QR" detail="La cámara se activará solo si otorgas permiso." />{!permission.granted ? <CustomerCard><CustomerState label="La cámara no está activa" detail="Permite el acceso para leer un código QR, o ingresa el código manualmente." /><CustomerButton label="Permitir cámara" onPress={() => void requestPermission()} /><CustomerButton label="Ingresar código" variant="secondary" onPress={() => router.replace('/')} /></CustomerCard> : <View style={styles.cameraWrap}><CameraView style={StyleSheet.absoluteFill} barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned} /><View pointerEvents="none" style={styles.frame} /></View>}{error && <CustomerState label={error} detail="Prueba nuevamente o ingresa el código manualmente." />}<CustomerButton label="Volver" variant="secondary" onPress={() => router.back()} /></CustomerPage>;
}
const styles = StyleSheet.create({ cameraWrap: { borderRadius: 16, height: 320, overflow: 'hidden' }, frame: { borderColor: '#0E8388', borderRadius: 20, borderWidth: 3, height: 180, left: '50%', marginLeft: -90, marginTop: -90, position: 'absolute', top: '50%', width: 180 } });
