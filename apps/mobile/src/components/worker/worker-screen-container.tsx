import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandMark, Icon, Pill } from '@/components/ui';
import { BottomTabInset, Palette, Radius, Shadows, space } from '@/constants/theme';
import { workerNavigationItems, type WorkerNavigationKey } from '@/features/worker/worker-navigation';
import { WorkerIcon, WorkerText, workerColors } from '@/components/worker/worker-ui';

type WorkerScreenContainerProps = {
  activeNavigation: WorkerNavigationKey;
  children: React.ReactNode;
  shopName?: string | null;
};

/** Persistent worker frame for assignment-safe operational destinations. */
export function WorkerScreenContainer({ activeNavigation, children, shopName }: WorkerScreenContainerProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.shell}>
      <View style={styles.header}>
        <View accessibilityLabel="Turnify" style={styles.identity}>
          <BrandMark size={30} tile />
          <View style={styles.identityText}>
            <WorkerText variant="headline">Turnify</WorkerText>
            {shopName ? <WorkerText variant="eyebrow" color={workerColors.muted} style={styles.shopName}>{shopName}</WorkerText> : null}
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pill label="En vivo" tone="success" />
          <Pressable
            accessibilityLabel="Abrir perfil"
            accessibilityRole="button"
            onPress={() => router.replace('/(app)/worker-profile')}
            style={styles.profileEntry}
          >
            <Icon color={Palette.brand} name="user" size={18} />
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>{children}</View>

      <View style={styles.navigation}>
        {workerNavigationItems.map((item) => {
          const active = item.key === activeNavigation;

          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              key={item.key}
              onPress={() => router.replace(item.href as Href)}
              style={({ pressed }) => [styles.navigationItem, { opacity: pressed ? 0.72 : 1 }]}
            >
              <WorkerIcon color={active ? Palette.brand : Palette.inkFaint} name={navigationIcons[item.key]} size={20} />
              <WorkerText
                color={active ? Palette.brand : Palette.inkFaint}
                style={styles.navigationLabel}
                variant="eyebrow"
              >
                {item.label}
              </WorkerText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

export const workerScreenStyles = StyleSheet.create({
  page: { gap: space(4), paddingBottom: space(8), paddingHorizontal: space(4), paddingTop: space(4) },
  card: { borderRadius: Radius.large, borderWidth: 1, gap: space(3), padding: space(4) },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 0.9, lineHeight: 14 },
  title: { fontSize: 23, fontWeight: '800', letterSpacing: -0.3, lineHeight: 29 },
  detail: { fontSize: 15, lineHeight: 22 },
  sectionTitle: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
});

const styles = StyleSheet.create({
  shell: { backgroundColor: workerColors.background, flex: 1 },
  header: {
    alignItems: 'center',
    backgroundColor: Palette.surface,
    borderBottomColor: Palette.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: space(3),
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: space(4),
    ...Shadows.card,
  },
  identity: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: space(2.5), minWidth: 0 },
  identityText: { flex: 1, gap: 1 },
  shopName: { maxWidth: 180 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: space(2) },
  profileEntry: {
    alignItems: 'center',
    backgroundColor: Palette.brandSoft,
    borderRadius: Radius.pill,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  content: { alignSelf: 'center', flex: 1, maxWidth: 640, width: '100%' },
  navigation: {
    alignSelf: 'center',
    backgroundColor: Palette.surface,
    borderColor: Palette.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    maxWidth: 640,
    minHeight: 64 + BottomTabInset,
    paddingBottom: BottomTabInset,
    paddingHorizontal: space(2),
    width: '100%',
  },
  navigationItem: { alignItems: 'center', flex: 1, justifyContent: 'center', minHeight: 64, paddingHorizontal: space(1) },
  navigationLabel: { marginTop: 3 },
});

const navigationIcons: Record<WorkerNavigationKey, 'live' | 'queue' | 'history' | 'profile'> = {
  live: 'live',
  queue: 'queue',
  history: 'history',
  profile: 'profile',
};
