import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { normalizeBusinessCode } from '@/features/queue/queue-api';
import { publicShopRoute, workerSignInRoute } from '@/features/public/public-route-policy';

type LaunchIconName = 'arrow' | 'code' | 'scan' | 'shield' | 'storefront' | 'ticket';

function LaunchIcon({ name, color = '#00686C', size = 22 }: { name: LaunchIconName; color?: string; size?: number }) {
  const common = { stroke: color, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, strokeWidth: 1.8 };

  return (
    <Svg accessibilityElementsHidden height={size} width={size} viewBox="0 0 24 24" fill="none">
      {name === 'arrow' && <Path {...common} d="M5 12h14m-6-6 6 6-6 6" />}
      {name === 'code' && <><Path {...common} d="m9 7-5 5 5 5M15 7l5 5-5 5M14 4l-4 16" /></>}
      {name === 'scan' && <><Path {...common} d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3" /><Path {...common} d="M8 12h8" /></>}
      {name === 'shield' && <Path {...common} d="M12 3 5.5 6v5c0 4.2 2.7 7.8 6.5 10 3.8-2.2 6.5-5.8 6.5-10V6L12 3Z" />}
      {name === 'storefront' && <><Path {...common} d="M4 10h16v10H4zM3 10l1.5-5h15l1.5 5M8 10v3M12 10v3M16 10v3M8 20v-5h8v5" /></>}
      {name === 'ticket' && <><Path {...common} d="M5 6h14v4a2 2 0 0 0 0 4v4H5v-4a2 2 0 0 0 0-4V6Z" /><Path {...common} d="M12 8v8" /></>}
    </Svg>
  );
}

function ValueCard({ icon, title, detail }: { icon: 'ticket' | 'shield'; title: string; detail: string }) {
  return <View style={styles.valueCard}><View style={styles.valueIcon}><LaunchIcon name={icon} size={20} /></View><Text style={styles.valueTitle}>{title}</Text><Text style={styles.valueDetail}>{detail}</Text></View>;
}

/** Public launch route. Guest access never depends on an authenticated session. */
export default function PublicWelcomeScreen() {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [showCodeDrawer, setShowCodeDrawer] = useState(false);
  const [isDrawerMounted, setIsDrawerMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const drawerProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showCodeDrawer) setIsDrawerMounted(true);

    Animated.timing(drawerProgress, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: showCodeDrawer ? 1 : 0,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished && !showCodeDrawer) setIsDrawerMounted(false);
    });
  }, [drawerProgress, showCodeDrawer]);

  function continueWithCode() {
    const normalized = normalizeBusinessCode(code);
    if (!normalized) {
      setError('Ingresa el código válido que muestra la barbería.');
      return;
    }

    setError(null);
    router.push({ pathname: publicShopRoute, params: { code: normalized } });
  }

  function toggleCodeDrawer() {
    setError(null);
    setShowCodeDrawer((current) => !current);
  }

  return (
    <ScrollView
      contentContainerStyle={[styles.page, { paddingBottom: Math.max(insets.bottom, 20) + 20, paddingTop: Math.max(insets.top, 12) + 12 }]}
      style={styles.shell}>
      <View style={styles.brand} accessibilityLabel="Turnify">
        <View style={styles.brandMark}><View style={styles.brandMarkInner} /></View>
        <Text style={styles.brandName}>turnify</Text>
      </View>

      <View style={styles.categoryPill}><LaunchIcon name="storefront" color="#3D5781" size={16} /><Text style={styles.categoryLabel}>BARBERÍAS</Text></View>
      <View style={styles.heading}>
        <Text style={styles.title}>Tu turno empieza aquí</Text>
        <Text style={styles.subtitle}>Escanea el código de tu barbería y únete a la fila sin crear una cuenta.</Text>
      </View>

      <View accessible accessibilityLabel="Área segura para escanear el código QR de la barbería" style={styles.scannerHero}>
        <View style={styles.heroGlowOuter} /><View style={styles.heroGlowInner} />
        <View style={styles.reticle}>
          <View style={[styles.reticleCorner, styles.topLeft]} /><View style={[styles.reticleCorner, styles.topRight]} />
          <View style={[styles.reticleCorner, styles.bottomLeft]} /><View style={[styles.reticleCorner, styles.bottomRight]} />
          <View style={styles.scanIcon}><LaunchIcon name="scan" color="#00686C" size={38} /></View>
          <View style={styles.scanLine} />
        </View>
        <View style={styles.securityLabel}><LaunchIcon name="shield" color="#00686C" size={16} /><Text style={styles.securityText}>ACCESO SEGURO</Text></View>
      </View>

      <Pressable accessibilityLabel="Escanear código QR" accessibilityRole="button" onPress={() => router.push('/(public)/scan')} style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}>
        <LaunchIcon name="scan" color="#FFFFFF" size={22} /><Text style={styles.primaryButtonLabel}>Escanear código QR</Text><LaunchIcon name="arrow" color="#FFFFFF" size={20} />
      </Pressable>

      <Pressable accessibilityHint={showCodeDrawer ? 'Oculta el campo para ingresar el código.' : 'Muestra el campo para ingresar el código.'} accessibilityLabel="Ingresar código de la barbería" accessibilityRole="button" onPress={toggleCodeDrawer} style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
        <LaunchIcon name="code" color="#00686C" size={20} /><Text style={styles.secondaryButtonLabel}>Ingresar código de la barbería</Text>
      </Pressable>

      {isDrawerMounted && <Animated.View style={[styles.drawer, { height: drawerProgress.interpolate({ inputRange: [0, 1], outputRange: [0, 148] }), opacity: drawerProgress, transform: [{ translateY: drawerProgress.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}>
        <Text style={styles.drawerLabel}>CÓDIGO DE LA BARBERÍA</Text>
        <TextInput accessibilityLabel="Código de la barbería" autoCapitalize="characters" autoCorrect={false} onChangeText={setCode} onSubmitEditing={continueWithCode} placeholder="Ej.: TURNO-123" placeholderTextColor="#6B7890" returnKeyType="go" style={styles.input} value={code} />
        <Pressable accessibilityLabel="Continuar con el código" accessibilityRole="button" onPress={continueWithCode} style={({ pressed }) => [styles.drawerButton, pressed && styles.pressed]}><Text style={styles.drawerButtonLabel}>Continuar</Text><LaunchIcon name="arrow" color="#FFFFFF" size={18} /></Pressable>
      </Animated.View>}
      {error && <View accessibilityRole="alert" style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}

      <View style={styles.values}>
        <ValueCard icon="ticket" title="Código visible" detail="Consulta tu turno con el código que recibes al confirmar." />
        <ValueCard icon="shield" title="Te llaman en el local" detail="Mira la pantalla o escucha el llamado cuando sea tu turno." />
      </View>

      <View style={styles.staffFooter}><Text style={styles.staffQuestion}>¿Trabajas en una barbería?</Text><Pressable accessibilityLabel="Acceso para personal" accessibilityRole="button" onPress={() => router.push(workerSignInRoute)}><Text style={styles.staffLink}>Acceso para personal</Text></Pressable></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#F7F9FF', flex: 1 },
  page: { alignSelf: 'center', gap: 16, maxWidth: 480, paddingHorizontal: 20, width: '100%' },
  brand: { alignItems: 'center', gap: 6 },
  brandMark: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  brandMarkInner: { backgroundColor: '#F7F9FF', borderRadius: 3, height: 18, transform: [{ rotate: '45deg' }], width: 18 },
  brandName: { color: '#111D27', fontSize: 21, fontWeight: '800', letterSpacing: -0.5, lineHeight: 26 },
  categoryPill: { alignItems: 'center', alignSelf: 'center', backgroundColor: '#E9EEFF', borderRadius: 999, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 7 },
  categoryLabel: { color: '#3D5781', fontSize: 11, fontWeight: '800', letterSpacing: 1, lineHeight: 14 },
  heading: { alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  title: { color: '#111D27', fontSize: 29, fontWeight: '800', letterSpacing: -0.8, lineHeight: 35, textAlign: 'center' },
  subtitle: { color: '#526075', fontSize: 15, lineHeight: 22, maxWidth: 335, textAlign: 'center' },
  scannerHero: { alignItems: 'center', backgroundColor: '#EAF0FF', borderRadius: 12, height: 244, justifyContent: 'center', overflow: 'hidden' },
  heroGlowOuter: { backgroundColor: '#D7E5FF', borderRadius: 999, height: 250, opacity: 0.8, position: 'absolute', width: 250 },
  heroGlowInner: { backgroundColor: '#F7F9FF', borderRadius: 999, height: 194, position: 'absolute', width: 194 },
  reticle: { alignItems: 'center', height: 138, justifyContent: 'center', position: 'relative', width: 138 },
  reticleCorner: { borderColor: '#00686C', height: 30, position: 'absolute', width: 30 },
  topLeft: { borderLeftWidth: 2, borderTopWidth: 2, left: 0, top: 0 }, topRight: { borderRightWidth: 2, borderTopWidth: 2, right: 0, top: 0 },
  bottomLeft: { borderBottomWidth: 2, borderLeftWidth: 2, bottom: 0, left: 0 }, bottomRight: { borderBottomWidth: 2, borderRightWidth: 2, bottom: 0, right: 0 },
  scanIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999, height: 76, justifyContent: 'center', shadowColor: '#38517A', shadowOffset: { height: 7, width: 0 }, shadowOpacity: 0.12, shadowRadius: 14, width: 76 },
  scanLine: { backgroundColor: '#0E8388', height: 2, opacity: 0.75, position: 'absolute', top: 68, width: 112 },
  securityLabel: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 999, bottom: 16, flexDirection: 'row', gap: 6, paddingHorizontal: 12, paddingVertical: 7, position: 'absolute' },
  securityText: { color: '#00686C', fontSize: 10, fontWeight: '800', letterSpacing: 0.9, lineHeight: 13 },
  primaryButton: { alignItems: 'center', backgroundColor: '#00686C', borderRadius: 12, flexDirection: 'row', height: 56, justifyContent: 'space-between', paddingHorizontal: 18 },
  primaryButtonLabel: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', lineHeight: 22 },
  secondaryButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#C9D5EF', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, height: 52, justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonLabel: { color: '#00686C', fontSize: 15, fontWeight: '700', lineHeight: 20 },
  pressed: { opacity: 0.8 },
  drawer: { backgroundColor: '#E9EEFF', borderRadius: 12, gap: 9, overflow: 'hidden', paddingHorizontal: 14, paddingTop: 14 },
  drawerLabel: { color: '#3D5781', fontSize: 10, fontWeight: '800', letterSpacing: 0.9, lineHeight: 13 },
  input: { backgroundColor: '#FFFFFF', borderColor: '#B8C6E4', borderRadius: 8, borderWidth: 1, color: '#111D27', fontSize: 16, height: 44, paddingHorizontal: 12 },
  drawerButton: { alignItems: 'center', backgroundColor: '#0E8388', borderRadius: 8, flexDirection: 'row', height: 40, justifyContent: 'center', gap: 6 },
  drawerButtonLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', lineHeight: 18 },
  error: { backgroundColor: '#FFF0EE', borderColor: '#F2BBB4', borderRadius: 8, borderWidth: 1, padding: 12 },
  errorText: { color: '#9B281B', fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  values: { flexDirection: 'row', gap: 10 },
  valueCard: { backgroundColor: '#FFFFFF', borderColor: '#DCE3F2', borderRadius: 12, borderWidth: 1, flex: 1, gap: 7, minHeight: 158, padding: 13 },
  valueIcon: { alignItems: 'center', backgroundColor: '#E8F4F3', borderRadius: 8, height: 34, justifyContent: 'center', width: 34 },
  valueTitle: { color: '#111D27', fontSize: 14, fontWeight: '800', lineHeight: 18 },
  valueDetail: { color: '#59667A', fontSize: 12, lineHeight: 17 },
  staffFooter: { alignItems: 'center', gap: 5, paddingTop: 4 },
  staffQuestion: { color: '#667389', fontSize: 13, lineHeight: 18 },
  staffLink: { color: '#00686C', fontSize: 14, fontWeight: '800', lineHeight: 20, textDecorationLine: 'underline' },
});
