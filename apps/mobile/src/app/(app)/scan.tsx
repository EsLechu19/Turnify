import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthButton, AuthErrorMessage, AuthScreenContainer } from '@/components/auth/auth-ui';
import { ThemedText } from '@/components/themed-text';
import { parseTurnifyQr } from '@/features/queue/queue-api';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [error, setError] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  function handleBarcodeScanned({ data }: { data: string }) {
    if (hasScanned) return;
    setHasScanned(true);
    const code = parseTurnifyQr(data);
    if (!code) {
      setError('El código QR no es válido para Turnify.');
      setHasScanned(false);
      return;
    }
    router.replace({ pathname: '/(app)/preview', params: { code } });
  }

  if (!permission) {
    return <AuthScreenContainer><ThemedText type="small">Preparando la cámara…</ThemedText></AuthScreenContainer>;
  }

  if (!permission.granted) {
    return (
      <AuthScreenContainer>
        <ThemedText type="subtitle">Escanear código QR</ThemedText>
        <ThemedText type="small">Necesitamos acceso a la cámara para escanear el código de la empresa.</ThemedText>
        <AuthButton label="Permitir cámara" onPress={() => void requestPermission()} />
        <AuthButton label="Volver" onPress={() => router.back()} />
      </AuthScreenContainer>
    );
  }

  return (
    <AuthScreenContainer>
      <ThemedText type="subtitle">Escanear código QR</ThemedText>
      <ThemedText type="small">Apunta la cámara al código de la empresa.</ThemedText>
      <View style={styles.cameraWrap}>
        <CameraView
          style={StyleSheet.absoluteFill}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
        />
      </View>
      <AuthErrorMessage message={error} />
      <AuthButton label="Volver" onPress={() => router.back()} />
    </AuthScreenContainer>
  );
}

const styles = StyleSheet.create({
  cameraWrap: { height: 320, overflow: 'hidden', borderRadius: 8 },
});
